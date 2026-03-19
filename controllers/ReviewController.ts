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

  // GET /api/reviews/my-reviews — seller xem reviews của mình
  static async getMyReviews(req: any, res: Response) {
    try {
      const sellerId = req.user.id;
      const { page = 1, limit = 20, rating } = req.query;

      const filter: any = { revieweeId: new mongoose.Types.ObjectId(sellerId) };
      if (rating) filter.rating = Number(rating);

      const reviews = await Review.find(filter)
        .populate("reviewerId", "fullName avatar")
        .populate({ path: "orderId", populate: { path: "listingId", select: "title" } })
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Review.countDocuments({ revieweeId: new mongoose.Types.ObjectId(sellerId) });

      // Rating distribution
      const dist = await Review.aggregate([
        { $match: { revieweeId: new mongoose.Types.ObjectId(sellerId) } },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
      ]);
      const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      dist.forEach((d) => { ratingDistribution[d._id] = d.count; });

      const avgResult = await Review.aggregate([
        { $match: { revieweeId: new mongoose.Types.ObjectId(sellerId) } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]);
      const averageRating = avgResult[0]?.avg ? Math.round(avgResult[0].avg * 10) / 10 : 0;

      res.json({
        success: true,
        data: {
          reviews: reviews.map((r: any) => ({
            id: r._id,
            buyerName: r.reviewerId?.fullName || "Anonymous",
            buyerAvatar: r.reviewerId?.avatar,
            rating: r.rating,
            comment: r.comment,
            content: r.comment,
            productTitle: (r.orderId as any)?.listingId?.title || "N/A",
            createdAt: r.createdAt,
            reply: r.reply,
            replyDate: r.replyDate,
            categories: r.categories,
          })),
          rating: { averageRating, totalReviews: total, ratingDistribution },
        },
        pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/reviews/check/:orderId — buyer check đã review order này chưa
  static async checkReviewed(req: any, res: Response) {
    try {
      const { orderId } = req.params;
      const reviewerId = req.user.id;
      const existing = await Review.findOne({ orderId, reviewerId });
      res.json({ success: true, reviewed: !!existing });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/reviews/:reviewId/reply — seller reply review
  static async replyReview(req: any, res: Response) {
    try {
      const { reviewId } = req.params;
      const { reply } = req.body;
      const sellerId = req.user.id;

      const review = await Review.findById(reviewId);
      if (!review) return res.status(404).json({ success: false, message: "Review not found" });
      if (review.revieweeId.toString() !== sellerId)
        return res.status(403).json({ success: false, message: "Not authorized" });

      (review as any).reply = reply;
      (review as any).replyDate = new Date();
      await review.save();

      res.json({ success: true, data: review });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/reviews/:userId
  static async getUserReviews(req: Request, res: Response) {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10, listingId } = req.query;

        // If listingId provided, filter reviews for orders of that listing only
        let reviewIds: any[] | undefined;
        if (listingId) {
          const { Order } = await import("../models/Order");
          const orders = await Order.find({ listingId, sellerId: userId }).select('_id');
          const orderIds = orders.map(o => o._id);
          const matchingReviews = await Review.find({ orderId: { $in: orderIds } }).select('_id');
          reviewIds = matchingReviews.map(r => r._id);
        }

        const filter: any = { revieweeId: userId };
        if (reviewIds !== undefined) filter._id = { $in: reviewIds };

        const reviews = await Review.find(filter)
            .populate("reviewerId", "fullName avatar")
            .populate("orderId", "listingId")
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));
        
        const total = await Review.countDocuments(filter);

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