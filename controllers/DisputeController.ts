import { Request, Response } from "express";
import { Dispute, DisputeStatus, DisputeReason } from "../models/Dispute";
import { Order } from "../models/Order";
import { User } from "../models/User";
import { OrderService } from "../services/OrderService";
import mongoose from "mongoose";

export class DisputeController {
  /**
   * Open dispute
   * POST /api/disputes
   */
  static async openDispute(req: Request, res: Response) {
    try {
      const { orderId, reason, description, evidence } = req.body;
      const claimantId = (req as any).user?.id; // Fix: use req.user.id

      // Verify order exists
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      // Verify dispute reason is valid
      if (!Object.values(DisputeReason).includes(reason)) {
        return res.status(400).json({ success: false, message: "Invalid dispute reason" });
      }

      // Check if dispute already exists
      const existingDispute = await Dispute.findOne({ orderId, claimantId });
      if (existingDispute) {
        return res
          .status(400)
          .json({ success: false, message: "Dispute already exists for this order" });
      }

      // Determine respondent
      const respondentId =
        claimantId === order.buyerId.toString() ? order.sellerId : order.buyerId;

      const dispute = new Dispute({
        orderId: new mongoose.Types.ObjectId(orderId),
        claimantId: new mongoose.Types.ObjectId(claimantId),
        respondentId,
        reason,
        description,
        evidence: evidence || [],
        status: DisputeStatus.OPEN,
      });

      await dispute.save();

      // Update order status
      await OrderService.openDispute(orderId, claimantId);

      res.status(201).json({
        success: true,
        message: "Dispute opened",
        data: dispute,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error opening dispute", error: error.message });
    }
  }

  /**
   * Get dispute details
   * GET /api/disputes/:disputeId
   */
  static async getDispute(req: Request, res: Response) {
    try {
      const { disputeId } = req.params;

      const dispute = await Dispute.findById(disputeId)
        .populate("claimantId", "fullName avatar email")
        .populate("respondentId", "fullName avatar email")
        .populate("orderId", "listingId buyerId sellerId")
        .populate("resolvedBy", "fullName");

      if (!dispute) {
        return res.status(404).json({ success: false, message: "Dispute not found" });
      }

      res.status(200).json({
        success: true,
        data: dispute,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error fetching dispute", error: error.message });
    }
  }

  /**
   * Get user disputes
   * GET /api/disputes
   */
  static async getUserDisputes(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id; // Fix: use req.user.id instead of req.userId
      const { status, page = 1, limit = 10 } = req.query;

      const query: any = {
        $or: [{ claimantId: userId }, { respondentId: userId }],
      };

      if (status) {
        query.status = status;
      }

      const disputes = await Dispute.find(query)
        .populate("claimantId", "fullName avatar")
        .populate("respondentId", "fullName avatar")
        .populate("orderId", "listingId")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Dispute.countDocuments(query);

      res.status(200).json({
        success: true,
        data: disputes,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error fetching disputes", error: error.message });
    }
  }

  /**
   * Resolve dispute (Admin only)
   * PUT /api/disputes/:disputeId/resolve
   */
  static async resolveDispute(req: Request, res: Response) {
    try {
      const { disputeId } = req.params;
      const { resolution, compensationAmount } = req.body;
      const adminId = (req as any).user?.id; // Fix: use req.user.id

      // Verify admin role
      const admin = await User.findById(adminId);
      if (!admin || admin.role !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Only admin can resolve disputes" });
      }

      const dispute = await Dispute.findById(disputeId);
      if (!dispute) {
        return res.status(404).json({ success: false, message: "Dispute not found" });
      }

      if (dispute.status !== DisputeStatus.OPEN && dispute.status !== DisputeStatus.IN_REVIEW) {
        return res
          .status(400)
          .json({ success: false, message: "Dispute cannot be resolved in current status" });
      }

      // Update dispute
      dispute.status = DisputeStatus.RESOLVED;
      dispute.resolution = resolution;
      dispute.compensationAmount = compensationAmount || 0;
      dispute.resolvedBy = new mongoose.Types.ObjectId(adminId);
      dispute.resolvedAt = new Date();

      await dispute.save();

      // Handle compensation if needed
      if (compensationAmount && compensationAmount > 0) {
        const recipient = await User.findById(dispute.claimantId);
        if (recipient) {
          const oldBalance = recipient.wallet.balance;
          recipient.wallet.balance += compensationAmount;
          await recipient.save();
          
          console.log(`[DISPUTE REFUND] User ${recipient._id} balance: ${oldBalance} -> ${recipient.wallet.balance} (+${compensationAmount})`);
        } else {
          console.error(`[DISPUTE REFUND ERROR] Recipient not found: ${dispute.claimantId}`);
        }
      } else {
        console.log(`[DISPUTE REFUND] No compensation amount specified: ${compensationAmount}`);
      }

      res.status(200).json({
        success: true,
        message: "Dispute resolved",
        data: dispute,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error resolving dispute", error: error.message });
    }
  }

  /**
   * Review dispute (Admin action)
   * PUT /api/disputes/:disputeId/review
   */
  static async reviewDispute(req: Request, res: Response) {
    try {
      const { disputeId } = req.params;
      const adminId = (req as any).user?.id; // Fix: use req.user.id

      // Verify admin role
      const admin = await User.findById(adminId);
      if (!admin || admin.role !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Only admin can review disputes" });
      }

      const dispute = await Dispute.findByIdAndUpdate(
        disputeId,
        { status: DisputeStatus.IN_REVIEW },
        { new: true }
      );

      if (!dispute) {
        return res.status(404).json({ success: false, message: "Dispute not found" });
      }

      res.status(200).json({
        success: true,
        message: "Dispute moved to review",
        data: dispute,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error reviewing dispute", error: error.message });
    }
  }

  /**
   * Close dispute
   * PUT /api/disputes/:disputeId/close
   */
  static async closeDispute(req: Request, res: Response) {
    try {
      const { disputeId } = req.params;
      const adminId = (req as any).user?.id; // Fix: use req.user.id

      // Verify admin role
      const admin = await User.findById(adminId);
      if (!admin || admin.role !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Only admin can close disputes" });
      }

      const dispute = await Dispute.findByIdAndUpdate(
        disputeId,
        { status: DisputeStatus.CLOSED },
        { new: true }
      );

      if (!dispute) {
        return res.status(404).json({ success: false, message: "Dispute not found" });
      }

      res.status(200).json({
        success: true,
        message: "Dispute closed",
        data: dispute,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error closing dispute", error: error.message });
    }
  }

  /**
   * Add evidence to dispute
   * POST /api/disputes/:disputeId/evidence
   */
  static async addEvidence(req: Request, res: Response) {
    try {
      const { disputeId } = req.params;
      const { evidence } = req.body;
      const userId = (req as any).user?.id; // Fix: use req.user.id

      const dispute = await Dispute.findById(disputeId);
      if (!dispute) {
        return res.status(404).json({ success: false, message: "Dispute not found" });
      }

      // Verify user is involved in dispute
      if (
        dispute.claimantId.toString() !== userId &&
        dispute.respondentId.toString() !== userId
      ) {
        return res
          .status(403)
          .json({ success: false, message: "You are not involved in this dispute" });
      }

      if (Array.isArray(evidence)) {
        dispute.evidence = [...(dispute.evidence || []), ...evidence];
      } else {
        dispute.evidence = [...(dispute.evidence || []), evidence];
      }

      await dispute.save();

      res.status(200).json({
        success: true,
        message: "Evidence added",
        data: dispute,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error adding evidence", error: error.message });
    }
  }

  /**
   * Get all disputes (Admin)
   * GET /api/disputes/admin/all
   */
  static async getAllDisputes(req: Request, res: Response) {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      const query: any = {};
      if (status) {
        query.status = status;
      }

      const disputes = await Dispute.find(query)
        .populate("claimantId", "fullName email")
        .populate("respondentId", "fullName email")
        .populate("orderId", "listingId")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Dispute.countDocuments(query);

      res.status(200).json({
        success: true,
        data: disputes,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error fetching disputes", error: error.message });
    }
  }
}
