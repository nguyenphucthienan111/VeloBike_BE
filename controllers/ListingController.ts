import { Request, Response } from "express";
import { Listing } from "../models/Listing";
import { AuthRequest } from "../middleware/authMiddleware";

export class ListingController {
  // GET /api/listings
  static async getAll(req: any, res: any) {
    try {
      const { type, brand, minPrice, maxPrice } = req.query;

      // Build Query
      let query: any = { status: "PUBLISHED" }; // Only show published bikes

      if (type && type !== "ALL") query.type = type;
      if (brand) query["generalInfo.brand"] = brand;

      if (minPrice || maxPrice) {
        query["pricing.amount"] = {};
        if (minPrice) query["pricing.amount"].$gte = Number(minPrice);
        if (maxPrice) query["pricing.amount"].$lte = Number(maxPrice);
      }

      const listings = await Listing.find(query)
        .sort({ createdAt: -1 })
        .populate("sellerId", "fullName reputation");

      res.json({ success: true, count: listings.length, data: listings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/listings/:id
  static async getById(req: any, res: any) {
    try {
      const listing = await Listing.findById(req.params.id).populate(
        "sellerId",
        "fullName reputation"
      );
      if (!listing) {
        res.status(404).json({ success: false, message: "Listing not found" });
        return;
      }
      res.json({ success: true, data: listing });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/listings
  static async create(req: any, res: any) {
    try {
      // SECURITY FIX: Get User ID from Token
      const sellerId = req.user?.id;

      if (!sellerId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const newListing = new Listing({
        ...req.body,
        sellerId: sellerId, // Force override sellerId from token
        status: "DRAFT", // Default to Draft until approved/published
      });

      await newListing.save();

      res.status(201).json({ success: true, data: newListing });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
