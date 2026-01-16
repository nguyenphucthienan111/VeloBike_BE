import { Request, Response } from "express";
import { Order, OrderStatus } from "../models/Order";
import { Listing } from "../models/Listing";
import { OrderService } from "../services/OrderService";
import { UserRole } from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";

export class OrderController {
  // POST /api/orders
  // Create a new order (Buyer)
  static async create(req: any, res: any) {
    try {
      const buyerId = req.user?.id;
      if (!buyerId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const { listingId, inspectionRequired = true } = req.body;

      if (!listingId) {
        return res
          .status(400)
          .json({ success: false, message: "listingId is required" });
      }

      // Check if listing exists and is available
      const listing = await Listing.findById(listingId);
      if (!listing) {
        return res
          .status(404)
          .json({ success: false, message: "Listing not found" });
      }

      if (listing.status === "SOLD") {
        return res
          .status(400)
          .json({ success: false, message: "This item is already sold" });
      }

      if (listing.sellerId.toString() === buyerId) {
        return res
          .status(400)
          .json({ success: false, message: "Cannot buy your own listing" });
      }

      // Create order using OrderService
      const order = await OrderService.createOrder(
        listingId,
        buyerId,
        inspectionRequired
      );

      res.status(201).json({
        success: true,
        data: order,
        message: "Order created successfully",
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // GET /api/orders/:id
  // Get order details
  static async getById(req: any, res: any) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      const order = await Order.findById(id)
        .populate("listingId")
        .populate("buyerId", "fullName email phone")
        .populate("sellerId", "fullName email phone")
        .populate("inspectorId", "fullName");

      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      // Check authorization: Buyer, Seller, Inspector, or Admin can view
      const isAuthorized =
        userRole === UserRole.ADMIN ||
        order.buyerId.toString() === userId ||
        order.sellerId.toString() === userId ||
        (order.inspectorId && order.inspectorId.toString() === userId);

      if (!isAuthorized) {
        return res
          .status(403)
          .json({
            success: false,
            message: "Not authorized to view this order",
          });
      }

      res.json({ success: true, data: order });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/orders
  // Get user's orders (Buyer or Seller)
  static async getMyOrders(req: any, res: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const { status, role, page = 1, limit = 20 } = req.query;

      // Build query based on role
      let query: any = {};
      if (role === "buyer") {
        query.buyerId = userId;
      } else if (role === "seller") {
        query.sellerId = userId;
      } else {
        // Default: show orders where user is buyer or seller
        query.$or = [{ buyerId: userId }, { sellerId: userId }];
      }

      if (status) {
        query.status = status;
      }

      const orders = await Order.find(query)
        .populate("listingId", "title generalInfo pricing media")
        .populate("buyerId", "fullName")
        .populate("sellerId", "fullName")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Order.countDocuments(query);

      res.json({
        success: true,
        data: orders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/orders/:id/timeline
  // Get order timeline
  static async getTimeline(req: any, res: any) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const order = await Order.findById(id);
      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      // Check authorization
      const isAuthorized =
        order.buyerId.toString() === userId ||
        order.sellerId.toString() === userId ||
        req.user?.role === UserRole.ADMIN;

      if (!isAuthorized) {
        return res
          .status(403)
          .json({ success: false, message: "Not authorized" });
      }

      const timeline = await OrderService.getOrderTimeline(id);

      res.json({ success: true, data: timeline });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // PUT /api/orders/:id/status
  // Update order status (for Seller/Buyer specific actions)
  static async updateStatus(req: any, res: any) {
    try {
      const { id } = req.params;
      const { status, note } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      const order = await Order.findById(id);
      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      // Check authorization and validate status transitions
      let allowedStatuses: OrderStatus[] = [];

      if (
        userRole === UserRole.SELLER &&
        order.sellerId.toString() === userId
      ) {
        // Seller can mark as SHIPPING
        if (
          status === OrderStatus.SHIPPING &&
          order.status === OrderStatus.INSPECTION_PASSED
        ) {
          allowedStatuses = [OrderStatus.SHIPPING];
        }
      } else if (
        userRole === UserRole.BUYER &&
        order.buyerId.toString() === userId
      ) {
        // Buyer can mark as DELIVERED
        if (
          status === OrderStatus.DELIVERED &&
          order.status === OrderStatus.SHIPPING
        ) {
          allowedStatuses = [OrderStatus.DELIVERED];
        }
        // Buyer can CANCEL if created
        if (
          status === OrderStatus.CANCELLED &&
          order.status === OrderStatus.CREATED
        ) {
          allowedStatuses = [OrderStatus.CANCELLED];
        }
      } else if (
        userRole === UserRole.SELLER &&
        order.sellerId.toString() === userId
      ) {
        // Seller can CANCEL (Reject) if created
        if (
          status === OrderStatus.CANCELLED &&
          order.status === OrderStatus.CREATED
        ) {
          allowedStatuses = [OrderStatus.CANCELLED];
        }
      } else if (userRole === UserRole.ADMIN) {
        // Admin can do more
        allowedStatuses = [OrderStatus.COMPLETED, OrderStatus.REFUNDED];
      }

      if (!allowedStatuses.includes(status as OrderStatus)) {
        return res.status(403).json({
          success: false,
          message: `Not authorized to change status to ${status}`,
        });
      }

      const orderService = new OrderService();
      const updatedOrder = await orderService.transitionState(
        id,
        status as OrderStatus,
        userId,
        userRole,
        note
      );

      res.json({ success: true, data: updatedOrder });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // PUT /api/orders/:id/shipping-address
  // Update shipping address (Buyer only, before payment)
  static async updateShippingAddress(req: any, res: any) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { shippingAddress } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ success: false, message: "Đơn hàng không tồn tại" });
      }

      // Only buyer can update shipping address
      if (order.buyerId.toString() !== userId) {
        return res.status(403).json({ success: false, message: "Chỉ người mua mới có thể cập nhật địa chỉ" });
      }

      // Can only update before payment (CREATED status)
      if (order.status !== OrderStatus.CREATED) {
        return res.status(400).json({ 
          success: false, 
          message: "Không thể thay đổi địa chỉ sau khi đã thanh toán" 
        });
      }

      // Validate required fields
      if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || 
          !shippingAddress.street || !shippingAddress.district || !shippingAddress.city) {
        return res.status(400).json({ 
          success: false, 
          message: "Vui lòng nhập đầy đủ thông tin địa chỉ (fullName, phone, street, district, city)" 
        });
      }

      order.shippingAddress = shippingAddress;
      await order.save();

      res.json({ 
        success: true, 
        data: order,
        message: "Cập nhật địa chỉ giao hàng thành công" 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}


// Import Transaction model for escrow status
import { Transaction } from "../models/Transaction";

export class OrderEscrowController {
  /**
   * GET /api/orders/:id/escrow-status
   * Get escrow status and transaction history for an order
   */
  static async getEscrowStatus(req: any, res: any) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      const order = await Order.findById(id)
        .populate("buyerId", "fullName")
        .populate("sellerId", "fullName");

      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      // Check authorization
      const isAuthorized =
        userRole === UserRole.ADMIN ||
        order.buyerId.toString() === userId ||
        order.sellerId.toString() === userId;

      if (!isAuthorized) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }

      // Get all transactions related to this order
      const transactions = await Transaction.find({ relatedOrderId: id })
        .sort({ createdAt: 1 });

      // Determine escrow status
      const holdTransaction = transactions.find(t => t.type === "PAYMENT_HOLD");
      const releaseTransaction = transactions.find(t => t.type === "PAYMENT_RELEASE");
      const refundTransaction = transactions.find(t => t.type === "REFUND");

      let escrowStatus: "NOT_PAID" | "LOCKED" | "RELEASED" | "REFUNDED" = "NOT_PAID";
      if (refundTransaction) {
        escrowStatus = "REFUNDED";
      } else if (releaseTransaction) {
        escrowStatus = "RELEASED";
      } else if (holdTransaction) {
        escrowStatus = "LOCKED";
      }

      // Calculate amounts
      const { itemPrice, platformFee, inspectionFee, shippingFee, totalAmount } = order.financials;
      const sellerWillReceive = itemPrice - platformFee;

      res.json({
        success: true,
        data: {
          orderId: id,
          orderStatus: order.status,
          escrowStatus,
          financials: {
            totalAmount,
            itemPrice,
            platformFee,
            inspectionFee,
            shippingFee,
            sellerWillReceive,
            platformWillReceive: platformFee + shippingFee,
            inspectorWillReceive: inspectionFee,
          },
          timeline: {
            paidAt: holdTransaction?.createdAt || null,
            releasedAt: releaseTransaction?.createdAt || null,
            refundedAt: refundTransaction?.createdAt || null,
          },
          transactions: transactions.map(t => ({
            id: t._id,
            type: t.type,
            amount: t.amount,
            status: t.status,
            description: t.description,
            createdAt: t.createdAt,
            paymentGatewayRef: t.paymentGatewayRef,
          })),
          message: this.getEscrowMessage(escrowStatus, order.status),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Helper: Get human-readable escrow message
   */
  private static getEscrowMessage(escrowStatus: string, orderStatus: string): string {
    switch (escrowStatus) {
      case "NOT_PAID":
        return "Đơn hàng chưa được thanh toán. Tiền chưa vào hệ thống.";
      case "LOCKED":
        return "Tiền đang được giữ an toàn trên PayOS. Seller sẽ nhận tiền sau khi đơn hàng hoàn tất.";
      case "RELEASED":
        return "Tiền đã được chuyển cho Seller. Giao dịch hoàn tất.";
      case "REFUNDED":
        return "Tiền đã được hoàn lại cho Buyer.";
      default:
        return "";
    }
  }
}
