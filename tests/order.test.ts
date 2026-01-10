import request from "supertest";
import app from "../app";
import { User } from "../models/User";
import { Listing } from "../models/Listing";
import { Order, OrderStatus } from "../models/Order";
import { OrderService } from "../services/OrderService";
import mongoose from "mongoose";

describe("Order Management", () => {
  let buyerToken: string;
  let sellerToken: string;
  let inspectorToken: string;
  let adminToken: string;
  let buyerId: string;
  let sellerId: string;
  let inspectorId: string;
  let listingId: string;
  let orderId: string;

  beforeAll(async () => {
    const MONGO_URI = process.env.MONGO_TEST_URI || "mongodb://localhost:27017/velobike_test";
    await mongoose.connect(MONGO_URI);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Listing.deleteMany({});
    await Order.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up
    await User.deleteMany({});
    await Listing.deleteMany({});
    await Order.deleteMany({});

    // Create test users
    const buyer = await User.create({
      email: "buyer@test.com",
      passwordHash: "hashedpassword",
      fullName: "Test Buyer",
      role: "BUYER",
      emailVerified: true,
    });
    buyerId = buyer._id.toString();

    const seller = await User.create({
      email: "seller@test.com",
      passwordHash: "hashedpassword",
      fullName: "Test Seller",
      role: "SELLER",
      emailVerified: true,
      kycStatus: "VERIFIED",
    });
    sellerId = seller._id.toString();

    const inspector = await User.create({
      email: "inspector@test.com",
      passwordHash: "hashedpassword",
      fullName: "Test Inspector",
      role: "INSPECTOR",
      emailVerified: true,
    });
    inspectorId = inspector._id.toString();

    const admin = await User.create({
      email: "admin@test.com",
      passwordHash: "hashedpassword",
      fullName: "Test Admin",
      role: "ADMIN",
      emailVerified: true,
    });

    // Generate tokens (mock JWT)
    buyerToken = "mock_buyer_token";
    sellerToken = "mock_seller_token";
    inspectorToken = "mock_inspector_token";
    adminToken = "mock_admin_token";

    // Create test listing
    const listing = await Listing.create({
      sellerId: seller._id,
      title: "Test Road Bike",
      description: "A great road bike for testing",
      type: "ROAD",
      status: "PUBLISHED",
      generalInfo: {
        brand: "Specialized",
        model: "Tarmac",
        year: 2022,
        size: "54",
        condition: "GOOD",
      },
      pricing: {
        amount: 50000000,
        currency: "VND",
      },
      media: {
        thumbnails: ["image1.jpg"],
      },
      location: {
        type: "Point",
        coordinates: [105.85, 21.02],
      },
      inspectionRequired: true,
      views: 0,
    });
    listingId = listing._id.toString();
  });

  describe("Order Creation", () => {
    it("should create order successfully", async () => {
      const order = await OrderService.createOrder(listingId, buyerId, true, 500000);

      expect(order).toBeTruthy();
      expect(order.listingId.toString()).toBe(listingId);
      expect(order.buyerId.toString()).toBe(buyerId);
      expect(order.sellerId.toString()).toBe(sellerId);
      expect(order.status).toBe(OrderStatus.CREATED);
      expect(order.financials.itemPrice).toBe(50000000);
      expect(order.financials.inspectionFee).toBe(500000);
      expect(order.timeline).toHaveLength(1);
      expect(order.timeline[0].status).toBe(OrderStatus.CREATED);

      orderId = order._id.toString();
    });

    it("should not create order for sold listing", async () => {
      // Mark listing as sold
      await Listing.findByIdAndUpdate(listingId, { status: "SOLD" });

      await expect(
        OrderService.createOrder(listingId, buyerId, true, 500000)
      ).rejects.toThrow("already sold");
    });

    it("should not create order for non-existent listing", async () => {
      const fakeListingId = new mongoose.Types.ObjectId().toString();

      await expect(
        OrderService.createOrder(fakeListingId, buyerId, true, 500000)
      ).rejects.toThrow("Listing not found");
    });
  });

  describe("Order State Machine", () => {
    beforeEach(async () => {
      const order = await OrderService.createOrder(listingId, buyerId, true, 500000);
      orderId = order._id.toString();
    });

    it("should transition from CREATED to ESCROW_LOCKED", async () => {
      const updatedOrder = await OrderService.lockEscrow(orderId, "payment_123");

      expect(updatedOrder.status).toBe(OrderStatus.ESCROW_LOCKED);
      expect(updatedOrder.timeline).toHaveLength(2);
      expect(updatedOrder.timeline[1].status).toBe(OrderStatus.ESCROW_LOCKED);
    });

    it("should transition from ESCROW_LOCKED to IN_INSPECTION", async () => {
      await OrderService.lockEscrow(orderId, "payment_123");
      const updatedOrder = await OrderService.startInspection(orderId, inspectorId);

      expect(updatedOrder.status).toBe(OrderStatus.IN_INSPECTION);
      expect(updatedOrder.inspectorId?.toString()).toBe(inspectorId);
    });

    it("should transition from IN_INSPECTION to INSPECTION_PASSED", async () => {
      await OrderService.lockEscrow(orderId, "payment_123");
      await OrderService.startInspection(orderId, inspectorId);
      const updatedOrder = await OrderService.inspectionPassed(orderId, inspectorId);

      expect(updatedOrder.status).toBe(OrderStatus.INSPECTION_PASSED);
    });

    it("should transition from IN_INSPECTION to INSPECTION_FAILED", async () => {
      await OrderService.lockEscrow(orderId, "payment_123");
      await OrderService.startInspection(orderId, inspectorId);
      const updatedOrder = await OrderService.inspectionFailed(orderId, inspectorId);

      expect(updatedOrder.status).toBe(OrderStatus.INSPECTION_FAILED);
    });

    it("should not allow invalid transitions", async () => {
      // Try to go from CREATED directly to SHIPPING (invalid)
      await expect(
        OrderService.transitionStatus(orderId, OrderStatus.SHIPPING, buyerId)
      ).rejects.toThrow("Invalid transition");
    });

    it("should complete full order flow", async () => {
      // Full flow: CREATED -> ESCROW_LOCKED -> IN_INSPECTION -> INSPECTION_PASSED -> SHIPPING -> DELIVERED -> COMPLETED
      await OrderService.lockEscrow(orderId, "payment_123");
      await OrderService.startInspection(orderId, inspectorId);
      await OrderService.inspectionPassed(orderId, inspectorId);
      await OrderService.markShipped(orderId, sellerId);
      await OrderService.markDelivered(orderId, buyerId);
      
      const completedOrder = await OrderService.completeOrder(orderId, "admin_id");

      expect(completedOrder.status).toBe(OrderStatus.COMPLETED);
      expect(completedOrder.timeline).toHaveLength(7); // All transitions

      // Verify listing is marked as sold
      const listing = await Listing.findById(listingId);
      expect(listing?.status).toBe("SOLD");
    });
  });

  describe("Order Timeline", () => {
    beforeEach(async () => {
      const order = await OrderService.createOrder(listingId, buyerId, true, 500000);
      orderId = order._id.toString();
    });

    it("should track order timeline correctly", async () => {
      await OrderService.lockEscrow(orderId, "payment_123");
      await OrderService.startInspection(orderId, inspectorId);

      const timeline = await OrderService.getOrderTimeline(orderId);

      expect(timeline).toHaveLength(3);
      expect(timeline[0].status).toBe(OrderStatus.CREATED);
      expect(timeline[1].status).toBe(OrderStatus.ESCROW_LOCKED);
      expect(timeline[2].status).toBe(OrderStatus.IN_INSPECTION);

      // Check timestamps are in order
      expect(timeline[0].timestamp.getTime()).toBeLessThanOrEqual(timeline[1].timestamp.getTime());
      expect(timeline[1].timestamp.getTime()).toBeLessThanOrEqual(timeline[2].timestamp.getTime());
    });

    it("should include actor information in timeline", async () => {
      await OrderService.lockEscrow(orderId, "payment_123");

      const timeline = await OrderService.getOrderTimeline(orderId);
      const escrowEntry = timeline.find(entry => entry.status === OrderStatus.ESCROW_LOCKED);

      expect(escrowEntry).toBeTruthy();
      expect(escrowEntry?.actorId.toString()).toBe(buyerId);
    });
  });

  describe("Order Disputes", () => {
    beforeEach(async () => {
      const order = await OrderService.createOrder(listingId, buyerId, true, 500000);
      orderId = order._id.toString();
    });

    it("should open dispute", async () => {
      const disputedOrder = await OrderService.openDispute(orderId, buyerId);

      expect(disputedOrder.status).toBe(OrderStatus.DISPUTED);
      expect(disputedOrder.timeline.some(entry => entry.status === OrderStatus.DISPUTED)).toBe(true);
    });

    it("should refund order", async () => {
      const refundedOrder = await OrderService.refundOrder(orderId, "admin_id", "Quality issue");

      expect(refundedOrder.status).toBe(OrderStatus.REFUNDED);
      expect(refundedOrder.timeline.some(entry => entry.note?.includes("Quality issue"))).toBe(true);
    });
  });
});