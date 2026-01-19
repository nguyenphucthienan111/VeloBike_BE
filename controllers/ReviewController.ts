import { Request, Response } from "express";
import { Review } from "../models/Review";
import { Order } from "../models/Order";
import { User } from "../models/User";
import mongoose from "mongoose";

export class ReviewController {
  // POST /api/reviews
  static async createReview(req: any, res: any) {
    try {
      const { orderId, rating, comment } = req.body;
      const reviewerId = req.user.id;

      // Validate input
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: "Invalid rating" });
      }

      // Check order
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      // Check authorization (Only Buyer can review Seller)
      // Note: In some systems seller can also review buyer, but requirement says "Buyer assess seller"
      if (order.buyerId.toString() !== reviewerId) {
        return res.status(403).json({ success: false, message: "Only buyer can review" });
      }

      // Check if order is completed
      if (order.status !== "COMPLETED" && order.status !== "DELIVERED") {
         return res.status(400).json({ success: false, message: "Can only review completed/delivered orders" });
      }

      // Check if already reviewed
      const existing = await Review.findOne({ orderId, reviewerId });
      if (existing) {
        return res.status(400).json({ success: false, message: "Review already exists" });
      }

      const review = new Review({
        orderId,
        reviewerId,
        revieweeId: order.sellerId,
        rating,
        comment,
        type: "BUYER", // Buyer reviewing seller
        categories: req.body.categories || {
          itemAccuracy: rating,
          communication: rating,
          shipping: rating,
          packaging: rating,
        },
      });

      await review.save();

      // Update Seller Reputation
      await ReviewController.updateUserReputation(order.sellerId.toString());

      res.status(201).json({ success: true, data: review });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Helper: Recalculate and update user reputation
  static async updateUserReputation(userId: string) {
    try {
      const stats = await Review.aggregate([
        { $match: { revieweeId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            count: { $sum: 1 },
          },
        },
      ]);

      if (stats.length > 0) {
        await User.findByIdAndUpdate(userId, {
          reputation: {
            score: Math.round(stats[0].averageRating * 10) / 10,
            reviewCount: stats[0].count,
          },
        });
      }
    } catch (error) {
      console.error("Error updating reputation:", error);
    }
  }

  // GET /api/reviews/:userId
  static async getUserReviews(req: Request, res: Response) {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const reviews = await Review.find({ revieweeId: userId })
            .populate("reviewerId", "fullName avatar")
            .populate("orderId", "listingId")
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));
        
        const total = await Review.countDocuments({ revieweeId: userId });

        res.json({
            success: true,
            data: reviews,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
  }
}