import { Request, Response } from "express";
import { PriceAlert } from "../models/PriceAlert";
import { SavedSearch } from "../models/SavedSearch";
import { Listing } from "../models/Listing";
import { AuthRequest } from "../middleware/authMiddleware";
import mongoose from "mongoose";

export class AlertController {
  /**
   * Create a price alert for a listing
   */
  static async createPriceAlert(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { listingId, targetPrice } = req.body;

      // Check if listing exists
      const listing = await Listing.findById(listingId);
      if (!listing) {
        return res.status(404).json({
          success: false,
          message: "Listing not found"
        });
      }

      // Check if user already has an alert for this listing
      const existingAlert = await PriceAlert.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        listingId: new mongoose.Types.ObjectId(listingId)
      });

      if (existingAlert) {
        // Update existing alert
        existingAlert.targetPrice = targetPrice;
        existingAlert.currentPrice = listing.pricing.amount;
        existingAlert.isActive = true;
        existingAlert.triggered = false;
        await existingAlert.save();

        return res.json({
          success: true,
          message: "Price alert updated successfully",
          data: existingAlert
        });
      }

      // Create new alert
      const priceAlert = new PriceAlert({
        userId: new mongoose.Types.ObjectId(userId),
        listingId: new mongoose.Types.ObjectId(listingId),
        targetPrice,
        currentPrice: listing.pricing.amount
      });

      await priceAlert.save();

      res.status(201).json({
        success: true,
        message: "Price alert created successfully",
        data: priceAlert
      });
    } catch (error) {
      console.error("Error creating price alert:", error);
      res.status(500).json({
        success: false,
        message: "Error creating price alert"
      });
    }
  }

  /**
   * Get user's price alerts
   */
  static async getPriceAlerts(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 10, active } = req.query;

      let query: any = { userId: new mongoose.Types.ObjectId(userId) };
      if (active !== undefined) {
        query.isActive = active === 'true';
      }

      const alerts = await PriceAlert.find(query)
        .populate('listingId', 'title media pricing generalInfo status')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await PriceAlert.countDocuments(query);

      res.json({
        success: true,
        data: {
          alerts,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      console.error("Error getting price alerts:", error);
      res.status(500).json({
        success: false,
        message: "Error getting price alerts"
      });
    }
  }

  /**
   * Delete a price alert
   */
  static async deletePriceAlert(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const alert = await PriceAlert.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: "Price alert not found"
        });
      }

      res.json({
        success: true,
        message: "Price alert deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting price alert:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting price alert"
      });
    }
  }

  /**
   * Create a saved search with optional alerts
   */
  static async createSavedSearch(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { name, query, alertsEnabled = true } = req.body;

      // Count current results for this query
      const resultsCount = await Listing.countDocuments({
        ...query,
        status: "PUBLISHED"
      });

      const savedSearch = new SavedSearch({
        userId: new mongoose.Types.ObjectId(userId),
        name,
        query,
        alertsEnabled,
        resultsCount
      });

      await savedSearch.save();

      res.status(201).json({
        success: true,
        message: "Search saved successfully",
        data: savedSearch
      });
    } catch (error) {
      console.error("Error creating saved search:", error);
      res.status(500).json({
        success: false,
        message: "Error creating saved search"
      });
    }
  }

  /**
   * Get user's saved searches
   */
  static async getSavedSearches(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 10 } = req.query;

      const savedSearches = await SavedSearch.find({
        userId: new mongoose.Types.ObjectId(userId)
      })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

      const total = await SavedSearch.countDocuments({
        userId: new mongoose.Types.ObjectId(userId)
      });

      // Update results count for each search
      for (const search of savedSearches) {
        const currentCount = await Listing.countDocuments({
          ...search.query,
          status: "PUBLISHED"
        });
        
        if (currentCount !== search.resultsCount) {
          search.resultsCount = currentCount;
          await search.save();
        }
      }

      res.json({
        success: true,
        data: {
          savedSearches,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      console.error("Error getting saved searches:", error);
      res.status(500).json({
        success: false,
        message: "Error getting saved searches"
      });
    }
  }

  /**
   * Update a saved search
   */
  static async updateSavedSearch(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { name, query, alertsEnabled } = req.body;

      const savedSearch = await SavedSearch.findOne({
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!savedSearch) {
        return res.status(404).json({
          success: false,
          message: "Saved search not found"
        });
      }

      // Update fields
      if (name !== undefined) savedSearch.name = name;
      if (query !== undefined) {
        savedSearch.query = query;
        // Recalculate results count
        savedSearch.resultsCount = await Listing.countDocuments({
          ...query,
          status: "PUBLISHED"
        });
      }
      if (alertsEnabled !== undefined) savedSearch.alertsEnabled = alertsEnabled;

      await savedSearch.save();

      res.json({
        success: true,
        message: "Saved search updated successfully",
        data: savedSearch
      });
    } catch (error) {
      console.error("Error updating saved search:", error);
      res.status(500).json({
        success: false,
        message: "Error updating saved search"
      });
    }
  }

  /**
   * Delete a saved search
   */
  static async deleteSavedSearch(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const savedSearch = await SavedSearch.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!savedSearch) {
        return res.status(404).json({
          success: false,
          message: "Saved search not found"
        });
      }

      res.json({
        success: true,
        message: "Saved search deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting saved search:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting saved search"
      });
    }
  }
}