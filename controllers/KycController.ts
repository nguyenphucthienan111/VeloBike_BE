import { Request, Response } from "express";
import { User, KycStatus } from "../models/User";
import { NotificationService } from "../services/NotificationService";
import { FptAiService } from "../services/FptAiService";
import crypto from "crypto";

export class KycController {
  /**
   * Submit eKYC verification with FPT AI
   */
  static async submitEkyc(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      // Check if files are uploaded
      if (!req.files || !req.files.idCardFront || !req.files.selfie) {
        return res.status(400).json({
          success: false,
          message: "Please upload both ID card front and selfie images",
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Check if already verified
      if (user.kycStatus === KycStatus.VERIFIED) {
        return res.status(400).json({
          success: false,
          message: "Your account is already verified",
        });
      }

      // Get image buffers
      const idCardFrontBuffer = req.files.idCardFront[0].buffer;
      const selfieBuffer = req.files.selfie[0].buffer;

      // Verify with FPT AI
      const verificationResult = await FptAiService.verifyEkyc(
        idCardFrontBuffer,
        selfieBuffer
      );

      if (!verificationResult.success) {
        user.kycStatus = KycStatus.REJECTED;
        await user.save();

        // Notify user of rejection
        await NotificationService.sendNotification(
          userId,
          "KYC Verification Failed",
          verificationResult.message || "Identity verification failed. Please try again with clearer images.",
          { kycStatus: KycStatus.REJECTED }
        );

        return res.status(400).json({
          success: false,
          message: verificationResult.message,
        });
      }

      // Extract document ID from FPT AI result
      const documentId = verificationResult.data!.idInfo?.id || 
                         verificationResult.data!.idInfo?.id_number ||
                         verificationResult.data!.idInfo?.document_id;

      // Check if this CCCD/CMND is already used by another account
      if (documentId) {
        const existingKyc = await User.findOne({
          'kycData.documentId': documentId,
          _id: { $ne: userId },
          kycStatus: KycStatus.VERIFIED,
        });
        if (existingKyc) {
          user.kycStatus = KycStatus.REJECTED;
          await user.save();
          await NotificationService.sendNotification(
            userId,
            "KYC Verification Failed",
            "This ID document is already linked to another verified account. Please contact support if you believe this is an error.",
            { kycStatus: KycStatus.REJECTED }
          );
          return res.status(400).json({
            success: false,
            message: "This ID document is already linked to another verified account",
          });
        }
      }

      // Update user with verification data
      user.kycStatus = KycStatus.VERIFIED;
      user.kycData = {
        ...user.kycData,
        documentId: documentId || user.kycData?.documentId,
        verifiedAt: new Date(),
        confidence: verificationResult.data!.faceMatch.similarity,
        documentData: verificationResult.data!.idInfo,
        faceMatchScore: verificationResult.data!.faceMatch.similarity,
      } as any;

      await user.save();

      // Send notification
      await NotificationService.sendNotification(
        userId,
        "KYC Verification Successful",
        "Your identity has been successfully verified",
        { kycStatus: KycStatus.VERIFIED }
      );

      res.json({
        success: true,
        message: "eKYC verification successful",
        data: {
          kycStatus: user.kycStatus,
          verifiedAt: user.kycData?.verifiedAt,
        },
      });
    } catch (error: any) {
      console.error("eKYC submission error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get current user's KYC status
   */
  static async getMyKycStatus(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const user = await User.findById(userId).select("kycStatus kycData");
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      res.json({
        success: true,
        data: {
          kycStatus: user.kycStatus,
          verifiedAt: user.kycData?.verifiedAt,
          documentData: user.kycData?.documentData,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

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

        // Check duplicate CCCD before verifying
        const documentId = documentData?.id || documentData?.id_number || documentData?.document_id;
        if (documentId) {
          const existingKyc = await User.findOne({
            'kycData.documentId': documentId,
            _id: { $ne: userId },
            kycStatus: KycStatus.VERIFIED,
          });
          if (existingKyc) {
            user.kycStatus = KycStatus.REJECTED;
            await user.save();
            await NotificationService.sendNotification(
              userId,
              "KYC Verification Failed",
              "This ID document is already linked to another verified account.",
              { kycStatus: KycStatus.REJECTED }
            );
            return res.json({ success: true, message: "Webhook processed", kycStatus: KycStatus.REJECTED });
          }
        }

        user.kycData = {
          ...user.kycData,
          documentId: documentId || user.kycData?.documentId,
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
        // Check duplicate CCCD before manual verify
        const documentId = user.kycData?.documentId;
        if (documentId) {
          const existingKyc = await User.findOne({
            'kycData.documentId': documentId,
            _id: { $ne: userId },
            kycStatus: KycStatus.VERIFIED,
          });
          if (existingKyc) {
            return res.status(400).json({
              success: false,
              message: `CCCD/CMND này đã được xác minh ở tài khoản khác (${existingKyc.email})`,
            });
          }
        }
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