import { Request, Response } from "express";
import { Dispute, DisputeStatus, DisputeReason } from "../models/Dispute";
import { Order, OrderStatus } from "../models/Order";
import { User } from "../models/User";
import { Transaction } from "../models/Transaction";
import { Listing } from "../models/Listing";
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

      // Dispute window: chỉ cho phép mở dispute trong 7 ngày sau COMPLETED
      if (order.status === OrderStatus.COMPLETED) {
        const completedEntry = order.timeline?.slice().reverse().find((t: any) => t.status === OrderStatus.COMPLETED);
        if (completedEntry) {
          const daysSinceCompleted = (Date.now() - new Date(completedEntry.timestamp).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceCompleted > 7) {
            return res.status(400).json({
              success: false,
              message: "Dispute window has expired. Orders can only be disputed within 7 days of completion.",
            });
          }
        }
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
        .populate({ path: "orderId", select: "_id listingId", populate: { path: "listingId", select: "title" } })
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

      // Handle compensation — phân phối từ escrow
      const order = await Order.findById(dispute.orderId);

      if (order) {
        const { itemPrice, platformFee, inspectionFee, shippingFee } = order.financials;
        const refund = compensationAmount || 0;

        // Check if order was previously COMPLETED (payment already released to seller)
        const wasCompleted = order.timeline.some((t: any) => t.status === OrderStatus.COMPLETED);

        if (order.status === OrderStatus.DISPUTED && !wasCompleted) {
          // Tiền vẫn trong escrow — phân phối từ escrow ra
          const sellerPayout = Math.max(0, itemPrice - platformFee - refund);

          // 1. Hoàn tiền cho Buyer (nếu có)
          if (refund > 0) {
            await User.findByIdAndUpdate(dispute.claimantId, {
              $inc: { "wallet.balance": refund },
            });
            await Transaction.create({
              userId: dispute.claimantId,
              type: "REFUND",
              amount: refund,
              status: "COMPLETED",
              relatedOrderId: order._id,
              description: `Dispute refund for order #${order._id} — dispute #${dispute._id}`,
              metadata: { disputeId: dispute._id },
            });
          }

          // 2. Trả tiền cho Seller (phần còn lại sau khi trừ refund + commission)
          if (sellerPayout > 0) {
            await User.findByIdAndUpdate(order.sellerId, {
              $inc: { "wallet.balance": sellerPayout },
            });
            await Transaction.create({
              userId: order.sellerId,
              type: "PAYMENT_RELEASE",
              amount: sellerPayout,
              status: "COMPLETED",
              relatedOrderId: order._id,
              description: `Dispute settlement payout for order #${order._id} — refund ${refund.toLocaleString("vi-VN")}đ to buyer, platform fee ${platformFee.toLocaleString("vi-VN")}đ deducted`,
              metadata: { disputeId: dispute._id, refundAmount: refund, platformFee },
            });
          }

          // 3. Ghi nhận platform commission
          if (platformFee > 0) {
            await Transaction.create({
              userId: order.sellerId,
              type: "PLATFORM_FEE",
              amount: platformFee,
              status: "COMPLETED",
              relatedOrderId: order._id,
              description: `Platform commission for order #${order._id} (dispute settlement)`,
              metadata: { disputeId: dispute._id },
            });
          }

          // 4. Trả inspector fee nếu chưa được trả
          if (order.inspectorId) {
            const existingInspectorTx = await Transaction.findOne({
              relatedOrderId: order._id,
              type: "INSPECTION_FEE",
              userId: order.inspectorId,
            });
            if (!existingInspectorTx) {
              const INSPECTOR_BASE_FEE = 500000;
              const inspectorPayout = inspectionFee > 0 ? inspectionFee : INSPECTOR_BASE_FEE;
              await User.findByIdAndUpdate(order.inspectorId, {
                $inc: { "wallet.balance": inspectorPayout },
              });
              await Transaction.create({
                userId: order.inspectorId,
                type: "INSPECTION_FEE",
                amount: inspectorPayout,
                status: "COMPLETED",
                relatedOrderId: order._id,
                description: `Inspection fee for order #${order._id} (dispute settlement)`,
                metadata: { disputeId: dispute._id },
              });
            }
          }

          // Cập nhật order status: refund nếu có hoàn tiền, completed nếu deny claim
          const finalStatus = refund > 0 ? OrderStatus.REFUNDED : OrderStatus.COMPLETED;
          order.status = finalStatus;
          order.timeline.push({
            status: finalStatus,
            timestamp: new Date(),
            actorId: new mongoose.Types.ObjectId(adminId),
            note: refund > 0
              ? `Dispute resolved — refund ${refund.toLocaleString("vi-VN")}đ to buyer, ${sellerPayout.toLocaleString("vi-VN")}đ to seller`
              : `Dispute resolved — claim denied, full payout ${sellerPayout.toLocaleString("vi-VN")}đ to seller`,
          } as any);
          await order.save();

          if (order.listingId) {
            await Listing.findByIdAndUpdate(order.listingId, { status: "SOLD" });
          }

        } else if (order.status === OrderStatus.COMPLETED || (order.status === OrderStatus.DISPUTED && wasCompleted)) {
          // Order đã complete — clawback từ seller wallet
          if (refund > 0) {
            const seller = await User.findById(order.sellerId);
            let actualClawback = 0;

            if (seller) {
              actualClawback = Math.min(refund, seller.wallet.balance);
              seller.wallet.balance -= actualClawback;
              await seller.save();
              await Transaction.create({
                userId: order.sellerId,
                type: "REFUND",
                amount: -actualClawback,
                status: "COMPLETED",
                relatedOrderId: order._id,
                description: `Dispute clawback for order #${order._id} — dispute #${dispute._id}`,
                metadata: { disputeId: dispute._id, clawback: true, requestedRefund: refund, actualClawback },
              });
            }

            const buyer = await User.findById(dispute.claimantId);
            if (buyer && actualClawback > 0) {
              buyer.wallet.balance += actualClawback;
              await buyer.save();
              await Transaction.create({
                userId: dispute.claimantId,
                type: "REFUND",
                amount: actualClawback,
                status: "COMPLETED",
                relatedOrderId: order._id,
                description: `Dispute refund for order #${order._id} — dispute #${dispute._id}${actualClawback < refund ? ` (partial: seller only had ${actualClawback.toLocaleString("vi-VN")}đ)` : ''}`,
                metadata: { disputeId: dispute._id, requestedRefund: refund, actualClawback },
              });
            }

            order.status = OrderStatus.REFUNDED;
            order.timeline.push({
              status: OrderStatus.REFUNDED,
              timestamp: new Date(),
              actorId: new mongoose.Types.ObjectId(adminId),
              note: actualClawback < refund
                ? `Dispute resolved — partial clawback ${actualClawback.toLocaleString("vi-VN")}đ from seller (requested ${refund.toLocaleString("vi-VN")}đ, seller had insufficient balance)`
                : `Dispute resolved — clawback ${actualClawback.toLocaleString("vi-VN")}đ from seller`,
            } as any);
            await order.save();
          } else {
            // Deny claim — seller keeps payment, restore order to COMPLETED
            order.status = OrderStatus.COMPLETED;
            order.timeline.push({
              status: OrderStatus.COMPLETED,
              timestamp: new Date(),
              actorId: new mongoose.Types.ObjectId(adminId),
              note: `Dispute resolved — claim denied, seller keeps payment`,
            } as any);
            await order.save();
          }
        }
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
      const adminId = (req as any).user?.id;

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

      // If order is still DISPUTED (dispute rejected, no refund), restore it to COMPLETED
      // and keep listing as SOLD (transaction stands)
      const order = await Order.findById(dispute.orderId);
      if (order && order.status === OrderStatus.DISPUTED) {
        order.status = OrderStatus.COMPLETED;
        order.timeline.push({
          status: OrderStatus.COMPLETED,
          timestamp: new Date(),
          actorId: new mongoose.Types.ObjectId(adminId),
          note: "Dispute closed — order restored to COMPLETED",
        } as any);
        await order.save();
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
        .populate("claimantId", "fullName email phone")
        .populate("respondentId", "fullName email phone")
        .populate({ path: "orderId", select: "_id listingId amount financials shippingAddress", populate: { path: "listingId", select: "title" } })
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
