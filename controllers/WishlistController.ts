import { Request, Response } from "express";
import { Wishlist } from "../models/Wishlist";
import { Listing } from "../models/Listing";
import mongoose from "mongoose";

export class WishlistController {
  /**
   * Add to wishlist
   * POST /api/wishlist
   */
  static async addToWishlist(req: Request, res: Response) {
    try {
      const { listingId } = req.body;
      const buyerId = (req as any).user?.id;

      if (!buyerId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      // Check if listing exists
      const listing = await Listing.findById(listingId);
      if (!listing) {
        return res.status(404).json({ success: false, message: "Listing not found" });
      }

      // Check if already in wishlist
      const existingWishlist = await Wishlist.findOne({
        buyerId,
        listingId,
      });

      if (existingWishlist) {
        return res
          .status(400)
          .json({ success: false, message: "Item already in wishlist" });
      }

      const wishlist = new Wishlist({
        buyerId: new mongoose.Types.ObjectId(buyerId),
        listingId: new mongoose.Types.ObjectId(listingId),
      });

      await wishlist.save();

      res.status(201).json({
        success: true,
        message: "Added to wishlist",
        data: wishlist,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error adding to wishlist", error: error.message });
    }
  }

  /**
   * Remove from wishlist
   * DELETE /api/wishlist/:listingId
   */
  static async removeFromWishlist(req: Request, res: Response) {
    try {
      const { listingId } = req.params;
      const buyerId = (req as any).user?.id;

      if (!buyerId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const wishlist = await Wishlist.findOneAndDelete({
        buyerId,
        listingId,
      });

      if (!wishlist) {
        return res.status(404).json({ success: false, message: "Item not in wishlist" });
      }

      res.status(200).json({
        success: true,
        message: "Removed from wishlist",
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error removing from wishlist", error: error.message });
    }
  }

  /**
   * Get user's wishlist
   * GET /api/wishlist
   */
  static async getWishlist(req: Request, res: Response) {
    try {
      const buyerId = (req as any).user?.id;
      
      if (!buyerId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { page = 1, limit = 20, sort = "-addedAt" } = req.query;

      const wishlistItems = await Wishlist.find({ buyerId })
        .populate({
          path: "listingId",
          select:
            "title type brand model year size pricing media status condition views inspectionScore",
          populate: {
            path: "sellerId",
            select: "fullName avatar reputation",
          },
        })
        .sort(sort as string)
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Wishlist.countDocuments({ buyerId });

      res.status(200).json({
        success: true,
        data: wishlistItems,
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
        .json({ success: false, message: "Error fetching wishlist", error: error.message });
    }
  }

  /**
   * Check if listing is in wishlist
   * GET /api/wishlist/check/:listingId
   */
  static async checkWishlist(req: Request, res: Response) {
    try {
      const { listingId } = req.params;
      const buyerId = (req as any).user?.id;

      if (!buyerId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const wishlist = await Wishlist.findOne({
        buyerId,
        listingId,
      });

      res.status(200).json({
        success: true,
        data: {
          inWishlist: !!wishlist,
        },
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error checking wishlist", error: error.message });
    }
  }

  /**
   * Clear wishlist
   * DELETE /api/wishlist/clear
   */
  static async clearWishlist(req: Request, res: Response) {
    try {
      const buyerId = (req as any).user?.id;

      if (!buyerId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const result = await Wishlist.deleteMany({ buyerId });

      res.status(200).json({
        success: true,
        message: "Wishlist cleared",
        deletedCount: result.deletedCount,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error clearing wishlist", error: error.message });
    }
  }

  /**
   * Get wishlist count
   * GET /api/wishlist/count
   */
  static async getWishlistCount(req: Request, res: Response) {
    try {
      const buyerId = (req as any).user?.id;

      if (!buyerId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const count = await Wishlist.countDocuments({ buyerId });

      res.status(200).json({
        success: true,
        data: { count },
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error getting wishlist count", error: error.message });
    }
  }
}
