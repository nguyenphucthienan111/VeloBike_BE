import { Request, Response } from "express";
import { LogisticsService } from "../services/LogisticsService";
import { Order } from "../models/Order";
import { OrderService } from "../services/OrderService";

export class LogisticsController {
  // POST /api/logistics/calculate-fee
  static async calculateFee(req: Request, res: Response) {
    try {
      const { origin, destination, weight } = req.body;

      if (!origin || !destination || !weight) {
        return res.status(400).json({
          success: false,
          message: "Missing origin, destination, or weight",
        });
      }

      const rates = await LogisticsService.calculateShippingFee(
        origin,
        destination,
        Number(weight)
      );

      res.json({ success: true, data: rates });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/logistics/create-shipment
  static async createShipment(req: any, res: Response) {
    try {
      const { orderId, serviceId } = req.body;
      const sellerId = req.user?.id; // Assuming seller creates shipment

      const order = await Order.findById(orderId).populate("listingId buyerId sellerId");
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      // Check authorization (Seller or Admin)
      if (order.sellerId._id.toString() !== sellerId && req.user.role !== "ADMIN") {
         return res.status(403).json({ success: false, message: "Unauthorized" });
      }

      // Prepare addresses (mock data extraction from User model)
      // In a real app, these addresses would be stored in the Order or User document
      const buyer = order.buyerId as any;
      const seller = order.sellerId as any;

      const pickupAddress = seller.address || { city: "Hanoi", district: "Ba Dinh" };
      const deliveryAddress = buyer.address || { city: "HCM", district: "District 1" };

      const shipment = await LogisticsService.createShipment(
        orderId,
        serviceId,
        pickupAddress,
        deliveryAddress
      );

      // Update Order Status using OrderService
      // Note: In a real scenario, we might have a specific field for tracking number
      await OrderService.markShipped(orderId, sellerId);
      
      // Save tracking info to order note (simplified)
      order.timeline.push({
          status: order.status,
          timestamp: new Date(),
          actorId: sellerId,
          note: `Shipment created: ${shipment.carrier} - ${shipment.trackingNumber}`
      } as any);
      await order.save();

      res.json({ success: true, data: shipment });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/logistics/tracking/:trackingNumber
  static async trackShipment(req: Request, res: Response) {
    try {
      const { trackingNumber } = req.params;
      const info = await LogisticsService.getTrackingInfo(trackingNumber);
      res.json({ success: true, data: info });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
