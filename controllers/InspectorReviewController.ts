import { Request, Response } from "express";
import { InspectorReview } from "../models/InspectorReview";
import { Inspection } from "../models/Inspection";
import { Order } from "../models/Order";
import { User, UserRole } from "../models/User";
import mongoose from "mongoose";

export class InspectorReviewController {
  // POST /api/inspector-reviews
  static async createReview(req: any, res: any) {
    try {
      const { inspectionId, rating, comment, categories } = req.body;
      const reviewerId = req.user.id;
      const reviewerRole = req.user.role;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: "Rating phải từ 1-5" });
      }
      if (!comment?.trim()) {
        return res.status(400).json({ success: false, message: "Vui lòng nhập nhận xét" });
      }

      const inspection = await Inspection.findById(inspectionId);
      if (!inspection) {
        return res.status(404).json({ success: false, message: "Không tìm thấy inspection" });
      }

      // Verify reviewer is buyer or seller of the related order
      if (inspection.orderId) {
        const order = await Order.findById(inspection.orderId);
        if (!order) {
          return res.status(404).json({ success: false, message: "Không tìm thấy order" });
        }
        const isBuyer = order.buyerId.toString() === reviewerId;
        const isSeller = order.sellerId.toString() === reviewerId;
        if (!isBuyer && !isSeller) {
          return res.status(403).json({ success: false, message: "Chỉ buyer hoặc seller của order mới có thể đánh giá inspector" });
        }
      } else {
        return res.status(400).json({ success: false, message: "Inspection này không liên kết với order" });
      }

      // Check duplicate
      const existing = await InspectorReview.findOne({ inspectionId, reviewerId });
      if (existing) {
        return res.status(400).json({ success: false, message: "Bạn đã đánh giá inspector này rồi" });
      }

      const review = new InspectorReview({
        inspectionId,
        inspectorId: inspection.inspectorId,
        reviewerId,
        reviewerRole: reviewerRole === UserRole.BUYER ? "BUYER" : "SELLER",
        rating,
        comment,
        categories: categories || {
          professionalism: rating,
          accuracy: rating,
          communication: rating,
          timeliness: rating,
        },
      });
      await review.save();

      // Update inspector reputation
      await InspectorReviewController.updateInspectorReputation(inspection.inspectorId.toString());

      res.status(201).json({ success: true, data: review });
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: "Bạn đã đánh giá inspector này rồi" });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Helper: recalculate inspector reputation
  static async updateInspectorReputation(inspectorId: string) {
    try {
      const stats = await InspectorReview.aggregate([
        { $match: { inspectorId: new mongoose.Types.ObjectId(inspectorId) } },
        { $group: { _id: null, averageRating: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]);
      if (stats.length > 0) {
        await User.findByIdAndUpdate(inspectorId, {
          reputation: {
            score: Math.round(stats[0].averageRating * 10) / 10,
            reviewCount: stats[0].count,
          },
        });
      }
    } catch (error) {
      console.error("Error updating inspector reputation:", error);
    }
  }

  // GET /api/inspector-reviews/inspector/:inspectorId
  static async getInspectorReviews(req: Request, res: Response) {
    try {
      const { inspectorId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const reviews = await InspectorReview.find({ inspectorId })
        .populate("reviewerId", "fullName avatar role")
        .populate("inspectionId", "overallScore grade overallVerdict completedAt")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await InspectorReview.countDocuments({ inspectorId });

      // Aggregate category averages
      const categoryStats = await InspectorReview.aggregate([
        { $match: { inspectorId: new mongoose.Types.ObjectId(inspectorId) } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$rating" },
            avgProfessionalism: { $avg: "$categories.professionalism" },
            avgAccuracy: { $avg: "$categories.accuracy" },
            avgCommunication: { $avg: "$categories.communication" },
            avgTimeliness: { $avg: "$categories.timeliness" },
            count: { $sum: 1 },
          },
        },
      ]);

      const stats = categoryStats[0] || {
        avgRating: 0, avgProfessionalism: 0, avgAccuracy: 0,
        avgCommunication: 0, avgTimeliness: 0, count: 0,
      };

      res.json({
        success: true,
        data: reviews,
        stats: {
          averageRating: Math.round((stats.avgRating || 0) * 10) / 10,
          totalReviews: total,
          categories: {
            professionalism: Math.round((stats.avgProfessionalism || 0) * 10) / 10,
            accuracy: Math.round((stats.avgAccuracy || 0) * 10) / 10,
            communication: Math.round((stats.avgCommunication || 0) * 10) / 10,
            timeliness: Math.round((stats.avgTimeliness || 0) * 10) / 10,
          },
        },
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

  // GET /api/inspector-reviews/check/:inspectionId - check if current user already reviewed
  static async checkReviewed(req: any, res: any) {
    try {
      const { inspectionId } = req.params;
      const reviewerId = req.user.id;
      const existing = await InspectorReview.findOne({ inspectionId, reviewerId });
      res.json({ success: true, hasReviewed: !!existing, data: existing || null });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
