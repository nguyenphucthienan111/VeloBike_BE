import { Request, Response } from "express";
import { Report } from "../models/Report";
import { Listing } from "../models/Listing";
import { AuthRequest } from "../middleware/authMiddleware";

export class ReportController {
  /**
   * Report a listing (FR-BUY-04 per SRS BikeMarket)
   * POST /api/reports/listing
   */
  static async reportListing(req: any, res: any) {
    try {
      const reporterId = req.user?.id;
      if (!reporterId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { listingId, reason, description, evidence } = req.body;

      // Verify listing exists
      const listing = await Listing.findById(listingId);
      if (!listing) {
        return res.status(404).json({ success: false, message: "Listing not found" });
      }

      // Check if user already reported this listing
      const existingReport = await Report.findOne({ reporterId, listingId });
      if (existingReport) {
        return res.status(400).json({ 
          success: false, 
          message: "You have already reported this listing" 
        });
      }

      // Create report
      const newReport = new Report({
        reporterId,
        listingId,
        reason,
        description,
        evidence: evidence || [],
      });

      await newReport.save();

      // TODO: Send notification to admin about new report

      res.status(201).json({
        success: true,
        data: newReport,
        message: "Report submitted successfully. Admin will review within 24 hours per SRS BikeMarket.",
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get user's reports
   * GET /api/reports/my-reports
   */
  static async getMyReports(req: any, res: any) {
    try {
      const reporterId = req.user?.id;
      if (!reporterId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { page = 1, limit = 20 } = req.query;

      const reports = await Report.find({ reporterId })
        .populate("listingId", "title generalInfo.brand")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Report.countDocuments({ reporterId });

      res.json({
        success: true,
        data: reports,
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

  /**
   * Admin: Get all reports
   * GET /api/admin/reports
   */
  static async getAllReports(req: any, res: any) {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      const query: any = {};
      if (status) query.status = status;

      const reports = await Report.find(query)
        .populate("reporterId", "fullName email")
        .populate("listingId", "title generalInfo.brand sellerId")
        .populate("reviewedBy", "fullName")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Report.countDocuments(query);

      res.json({
        success: true,
        data: reports,
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

  /**
   * Admin: Review report
   * PUT /api/admin/reports/:reportId/review
   */
  static async reviewReport(req: any, res: any) {
    try {
      const { reportId } = req.params;
      const { status, adminNote, action } = req.body;
      const adminId = req.user?.id;

      const allowedStatuses = ["REVIEWED", "RESOLVED", "DISMISSED"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid status. Must be REVIEWED, RESOLVED, or DISMISSED" 
        });
      }

      const updateData: any = {
        status,
        adminNote,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      };

      const report = await Report.findByIdAndUpdate(reportId, updateData, { new: true })
        .populate("listingId", "title sellerId")
        .populate("reporterId", "fullName email");

      if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" });
      }

      // Take action on listing if needed
      if (action === "REMOVE_LISTING" && report.listingId) {
        await Listing.findByIdAndUpdate(report.listingId._id, { 
          status: "REJECTED",
          rejectionReason: `Removed due to report: ${report.reason}` 
        });
      }

      // TODO: Send notification to reporter about resolution

      res.json({
        success: true,
        data: report,
        message: "Report reviewed successfully per SRS BikeMarket admin workflow",
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}