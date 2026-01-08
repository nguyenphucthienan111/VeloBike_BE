import { Request, Response } from "express";
import { Inspection } from "../models/Inspection";
import { Order, OrderStatus } from "../models/Order";
import { OrderService } from "../services/OrderService";
import { UserRole } from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";

export class InspectionController {
  // POST /api/inspections
  // Submit a 50-point inspection report
  static async submitReport(req: any, res: any) {
    try {
      const {
        orderId,
        checkpoints,
        overallVerdict,
        overallScore,
        inspectorNote,
      } = req.body;

      // SECURITY FIX: Get Inspector ID from Token
      const inspectorId = req.user?.id;

      if (!inspectorId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      // 1. Verify Order exists and is in correct state
      const order = await Order.findById(orderId);
      if (!order) {
        res.status(404).json({ success: false, message: "Order not found" });
        return;
      }

      if (order.status !== OrderStatus.IN_INSPECTION) {
        res
          .status(400)
          .json({
            success: false,
            message: "Order is not in inspection phase",
          });
        return;
      }

      // 2. Save Inspection Report
      const newInspection = new Inspection({
        orderId,
        inspectorId,
        checkpoints,
        overallVerdict,
        overallScore,
        inspectorNote,
      });
      await newInspection.save();

      // 3. Trigger Order State Machine
      const orderService = new OrderService();
      let nextStatus = OrderStatus.IN_INSPECTION; // fallback

      if (overallVerdict === "PASSED") {
        nextStatus = OrderStatus.INSPECTION_PASSED;
      } else if (overallVerdict === "FAILED") {
        nextStatus = OrderStatus.INSPECTION_FAILED;
      }

      if (nextStatus !== OrderStatus.IN_INSPECTION) {
        await orderService.transitionState(
          orderId,
          nextStatus,
          inspectorId,
          UserRole.INSPECTOR,
          `Inspection submitted with verdict: ${overallVerdict}`
        );
      }

      res
        .status(201)
        .json({ success: true, data: newInspection, orderStatus: nextStatus });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/inspections/:orderId
  static async getByOrder(req: any, res: any) {
    try {
      const inspection = await Inspection.findOne({
        orderId: req.params.orderId,
      }).populate("inspectorId", "fullName");
      if (!inspection) {
        res
          .status(404)
          .json({ success: false, message: "Inspection report not found" });
        return;
      }
      res.json({ success: true, data: inspection });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
