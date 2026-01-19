import { Request, Response } from "express";
import { User, UserRole } from "../models/User";
import { Order } from "../models/Order";
import { Listing } from "../models/Listing";

/**
 * Debug endpoints for troubleshooting
 */
export class DebugController {
  /**
   * GET /api/debug/inspectors
   * Check available inspectors in database
   */
  static async checkInspectors(req: Request, res: Response) {
    try {
      const inspectors = await User.find({
        role: UserRole.INSPECTOR,
      }).select("_id fullName email isActive createdAt");

      const activeInspectors = inspectors.filter(i => i.isActive);
      const inactiveInspectors = inspectors.filter(i => !i.isActive);

      res.json({
        success: true,
        data: {
          total: inspectors.length,
          active: activeInspectors.length,
          inactive: inactiveInspectors.length,
          inspectors: {
            active: activeInspectors,
            inactive: inactiveInspectors,
          },
          message: activeInspectors.length > 0 
            ? `✅ Có ${activeInspectors.length} inspector active, auto-trigger sẽ hoạt động`
            : `❌ Không có inspector active, auto-trigger sẽ KHÔNG hoạt động. Cần tạo inspector mới.`
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/debug/order/:orderId/inspection-check
   * Check why inspection was not triggered for an order
   */
  static async checkOrderInspection(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      const order = await Order.findById(orderId).populate("listingId");
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      const listing = order.listingId as any;
      const checks: any = {
        orderExists: true,
        orderStatus: order.status,
        orderStatusCorrect: order.status === "ESCROW_LOCKED" || order.status === "IN_INSPECTION",
        hasInspectorId: !!order.inspectorId,
        inspectorId: order.inspectorId || null,
        listingExists: !!listing,
        listingInspectionRequired: listing?.inspectionRequired || false,
        inspectionFee: order.financials.inspectionFee,
      };

      // Check available inspectors
      const inspectors = await User.find({
        role: UserRole.INSPECTOR,
        isActive: true,
      }).select("_id fullName email");

      checks.availableInspectors = inspectors.length;
      checks.inspectorsList = inspectors;

      // Determine why inspection was not triggered
      const issues = [];
      const solutions = [];

      if (!checks.listingInspectionRequired) {
        issues.push("❌ Listing không có inspectionRequired = true");
        solutions.push("Update listing: PUT /api/listings/" + listing._id + " { inspectionRequired: true }");
      }

      if (checks.availableInspectors === 0) {
        issues.push("❌ Không có inspector active trong database");
        solutions.push("Tạo inspector: POST /api/auth/register { role: 'INSPECTOR', ... }");
      }

      if (!checks.orderStatusCorrect) {
        issues.push(`❌ Order status không đúng: ${checks.orderStatus} (cần ESCROW_LOCKED)`);
        solutions.push("Đợi buyer thanh toán hoặc simulate payment");
      }

      if (!checks.hasInspectorId && checks.orderStatusCorrect) {
        issues.push("❌ Order chưa được assign inspector");
        solutions.push(`Manually start: POST /api/orders/${orderId}/start-inspection`);
      }

      const canAutoTrigger = 
        checks.listingInspectionRequired && 
        checks.availableInspectors > 0 && 
        checks.orderStatusCorrect;

      res.json({
        success: true,
        data: {
          orderId,
          checks,
          canAutoTrigger,
          issues: issues.length > 0 ? issues : ["✅ Không có vấn đề"],
          solutions: solutions.length > 0 ? solutions : ["✅ Inspection có thể tự động trigger"],
          recommendation: canAutoTrigger && !checks.hasInspectorId
            ? `Manually trigger inspection: POST /api/orders/${orderId}/start-inspection`
            : issues.length > 0
            ? "Fix các issues trên trước"
            : "✅ Inspection đã được trigger hoặc sẵn sàng trigger"
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/debug/listing/:listingId/inspection-check
   * Check if listing is configured for inspection
   */
  static async checkListingInspection(req: Request, res: Response) {
    try {
      const { listingId } = req.params;

      const listing = await Listing.findById(listingId);
      if (!listing) {
        return res.status(404).json({ success: false, message: "Listing not found" });
      }

      res.json({
        success: true,
        data: {
          listingId,
          inspectionRequired: listing.inspectionRequired,
          status: listing.status,
          message: listing.inspectionRequired
            ? "✅ Listing yêu cầu inspection, auto-trigger sẽ hoạt động"
            : "❌ Listing KHÔNG yêu cầu inspection, auto-trigger sẽ KHÔNG hoạt động",
          solution: !listing.inspectionRequired
            ? `Update listing: PUT /api/listings/${listingId} { "inspectionRequired": true }`
            : null
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/debug/token
   * Decode and check current token
   */
  static async checkToken(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "No user found in request. Token might be invalid or expired.",
        });
      }

      res.json({
        success: true,
        data: {
          userId: user.id,
          role: user.role,
          type: user.type,
          message: `✅ Token valid. User ID: ${user.id}, Role: ${user.role}`,
          canAccessInspectorEndpoints: user.role === UserRole.INSPECTOR,
          warning: user.role !== UserRole.INSPECTOR 
            ? `❌ Your role is ${user.role}, but inspector endpoints require role: INSPECTOR`
            : null
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/debug/add-wallet-balance
   * [DEV ONLY] Add money to user wallet for testing
   */
  static async addWalletBalance(req: Request, res: Response) {
    try {
      // Only allow in development
      if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ 
          success: false, 
          message: "Debug endpoint không khả dụng trong production" 
        });
      }

      const { userId, amount } = req.body;

      if (!userId || !amount) {
        return res.status(400).json({ 
          success: false, 
          message: "userId và amount là bắt buộc" 
        });
      }

      if (amount <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: "amount phải > 0" 
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const oldBalance = user.wallet.balance;
      user.wallet.balance += amount;
      await user.save();

      // Create transaction record
      const { Transaction } = await import("../models/Transaction");
      await Transaction.create({
        userId: user._id,
        type: "DEPOSIT",
        amount: amount,
        status: "COMPLETED",
        description: `[DEBUG] Add balance for testing`,
        metadata: {
          debug: true,
          oldBalance,
          newBalance: user.wallet.balance,
        },
      });

      res.json({
        success: true,
        message: `✅ Đã thêm ${amount.toLocaleString()} VNĐ vào ví`,
        data: {
          userId: user._id,
          userName: user.fullName,
          oldBalance,
          newBalance: user.wallet.balance,
          amountAdded: amount,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
