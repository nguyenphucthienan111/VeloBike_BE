import { Request, Response } from "express";
import { InspectorApplication } from "../models/InspectorApplication";
import { User, UserRole, KycStatus } from "../models/User";

export class InspectorApplicationController {
  // POST /api/inspector-applications  — user submits application
  static async apply(req: any, res: any) {
    try {
      const userId = req.user.id;

      // Must have KYC verified
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      if (user.kycStatus !== KycStatus.VERIFIED) {
        return res.status(400).json({
          success: false,
          message: "Bạn cần hoàn thành KYC trước khi nộp đơn inspector",
        });
      }

      if (user.role === UserRole.INSPECTOR) {
        return res.status(400).json({ success: false, message: "Bạn đã là inspector rồi" });
      }

      // Check no pending application
      const existing = await InspectorApplication.findOne({ userId, status: "PENDING" });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Bạn đã có đơn đang chờ duyệt",
        });
      }

      const { yearsOfExperience, specializations, bio, certificates, phone } = req.body;

      if (!certificates || certificates.length === 0) {
        return res.status(400).json({ success: false, message: "Vui lòng upload ít nhất 1 chứng chỉ" });
      }

      const application = new InspectorApplication({
        userId,
        fullName: user.fullName,
        email: user.email,
        phone: phone || user.phone || "",
        yearsOfExperience,
        specializations: specializations || [],
        bio,
        certificates,
      });

      await application.save();
      res.status(201).json({ success: true, data: application });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/inspector-applications/my  — user views own application
  static async getMyApplication(req: any, res: any) {
    try {
      const application = await InspectorApplication.findOne({ userId: req.user.id })
        .sort({ createdAt: -1 });
      res.json({ success: true, data: application || null });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/inspector-applications  — admin lists all applications
  static async getAll(req: any, res: any) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const query: any = {};
      if (status) query.status = status;

      const applications = await InspectorApplication.find(query)
        .populate("userId", "fullName email avatar kycStatus")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await InspectorApplication.countDocuments(query);

      res.json({
        success: true,
        data: applications,
        pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // PUT /api/inspector-applications/:id/approve  — admin approves
  static async approve(req: any, res: any) {
    try {
      const application = await InspectorApplication.findById(req.params.id);
      if (!application) return res.status(404).json({ success: false, message: "Application not found" });
      if (application.status !== "PENDING") {
        return res.status(400).json({ success: false, message: "Application is not pending" });
      }

      application.status = "APPROVED";
      application.reviewedBy = req.user.id;
      application.reviewedAt = new Date();
      await application.save();

      // Promote user to INSPECTOR
      await User.findByIdAndUpdate(application.userId, { role: UserRole.INSPECTOR });

      res.json({ success: true, message: "Application approved. User is now an Inspector." });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // PUT /api/inspector-applications/:id/reject  — admin rejects
  static async reject(req: any, res: any) {
    try {
      const { rejectionReason } = req.body;
      const application = await InspectorApplication.findById(req.params.id);
      if (!application) return res.status(404).json({ success: false, message: "Application not found" });
      if (application.status !== "PENDING") {
        return res.status(400).json({ success: false, message: "Application is not pending" });
      }

      application.status = "REJECTED";
      application.reviewedBy = req.user.id;
      application.reviewedAt = new Date();
      application.rejectionReason = rejectionReason || "Không đáp ứng yêu cầu";
      await application.save();

      res.json({ success: true, message: "Application rejected." });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
