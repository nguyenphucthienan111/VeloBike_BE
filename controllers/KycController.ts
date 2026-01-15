import { Request, Response } from "express";
import { User, KycStatus } from "../models/User";
import { NotificationService } from "../services/NotificationService";
import crypto from "crypto";

export class KycController {
  /**
   * Handle eKYC webhook from provider (e.g., VNPT, FPT AI)
   */
  static async handleWebhook(req: Request, res: Response) {
    try {
      const { userId, status, confidence, documentData, faceMatch, signature } = req.body;

      // Skip signature verification in development mode
      const isDev = process.env.NODE_ENV !== "production";
      
      if (!isDev) {
        // Verify webhook signature (security) - only in production
        const expectedSignature = crypto
          .createHmac("sha256", process.env.EKYC_WEBHOOK_SECRET || "default_secret")
          .update(JSON.stringify({ userId, status, confidence }))
          .digest("hex");

        if (signature !== expectedSignature) {
          return res.status(401).json({ success: false, message: "Invalid signature" });
        }
      }

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Update KYC status based on provider result
      let newStatus: KycStatus;
      // In dev mode, accept any confidence >= 0
      const minConfidence = isDev ? 0 : 0.8;
      
      if (status === "VERIFIED" && confidence >= minConfidence && (faceMatch || isDev)) {
        newStatus = KycStatus.VERIFIED;
        user.kycData = {
          ...user.kycData,
          verifiedAt: new Date(),
          confidence,
          documentData,
        } as any;
      } else if (status === "REJECTED") {
        newStatus = KycStatus.REJECTED;
      } else {
        newStatus = KycStatus.VERIFIED; // Default to verified in dev if status is VERIFIED
        user.kycData = {
          ...user.kycData,
          verifiedAt: new Date(),
          confidence: confidence || 1,
          documentData,
        } as any;
      }

      user.kycStatus = newStatus;
      await user.save();

      // Send notification to user
      await NotificationService.sendNotification(
        userId,
        "KYC Verification Update",
        `Your identity verification has been ${newStatus.toLowerCase()}`,
        { kycStatus: newStatus }
      );

      // Log for admin monitoring
      console.log(`[KYC WEBHOOK] User ${userId} KYC status: ${newStatus}, confidence: ${confidence}${isDev ? " (DEV MODE)" : ""}`);

      res.json({ success: true, message: "Webhook processed", kycStatus: newStatus });
    } catch (error: any) {
      console.error("KYC webhook error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Manual KYC verification by admin
   */
  static async manualVerify(req: any, res: Response) {
    try {
      const { userId } = req.params;
      const { status, note } = req.body;
      const adminId = req.user?.id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Update KYC status
      user.kycStatus = status;
      if (status === KycStatus.VERIFIED) {
        user.kycData = {
          ...user.kycData,
          verifiedAt: new Date(),
          verifiedBy: adminId,
          note,
        } as any;
      }
      await user.save();

      // Send notification
      await NotificationService.sendNotification(
        userId,
        "KYC Verification Update",
        `Your identity verification has been ${status.toLowerCase()}${note ? `: ${note}` : ""}`,
        { kycStatus: status }
      );

      res.json({
        success: true,
        message: `KYC ${status.toLowerCase()} successfully`,
        data: { kycStatus: user.kycStatus }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get pending KYC verifications
   */
  static async getPendingKyc(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const users = await User.find({ kycStatus: KycStatus.PENDING })
        .select("fullName email kycData kycStatus createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments({ kycStatus: KycStatus.PENDING });

      res.json({
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get KYC statistics
   */
  static async getKycStats(req: Request, res: Response) {
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: "$kycStatus",
            count: { $sum: 1 }
          }
        }
      ]);

      const totalUsers = await User.countDocuments();
      const verifiedToday = await User.countDocuments({
        kycStatus: KycStatus.VERIFIED,
        "kycData.verifiedAt": {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      });

      const formattedStats = {
        total: totalUsers,
        verified: stats.find(s => s._id === KycStatus.VERIFIED)?.count || 0,
        pending: stats.find(s => s._id === KycStatus.PENDING)?.count || 0,
        rejected: stats.find(s => s._id === KycStatus.REJECTED)?.count || 0,
        verifiedToday
      };

      res.json({ success: true, data: formattedStats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}