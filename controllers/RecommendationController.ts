import { Request, Response } from "express";
import { Listing, ListingStatus, BikeType } from "../models/Listing";
import { Order, OrderStatus } from "../models/Order";
import { User } from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";
import mongoose from "mongoose";

export class RecommendationController {
  /**
   * Get personalized bike recommendations using collaborative filtering
   */
  static async getBikeRecommendations(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { limit = 10, type } = req.query;

      // Get user's purchase history
      const userOrders = await Order.find({
        buyerId: new mongoose.Types.ObjectId(userId),
        status: OrderStatus.COMPLETED
      }).populate('listingId');

      // Get user's wishlist
      const { Wishlist } = require('../models/Wishlist');
      const wishlistItems = await Wishlist.find({
        buyerId: new mongoose.Types.ObjectId(userId)
      }).populate('listingId');

      // Analyze user preferences
      const preferences = this.analyzeUserPreferences(userOrders, wishlistItems);

      // Build recommendation query
      let query: any = {
        status: ListingStatus.PUBLISHED,
        sellerId: { $ne: new mongoose.Types.ObjectId(userId) }
      };

      if (type) {
        query.type = type;
      } else if (preferences.preferredTypes.length > 0) {
        query.type = { $in: preferences.preferredTypes };
      }

      if (preferences.priceRange.min > 0 || preferences.priceRange.max < 1000000000) {
        query['pricing.amount'] = {
          $gte: preferences.priceRange.min,
          $lte: preferences.priceRange.max
        };
      }

      if (preferences.preferredBrands.length > 0) {
        query['generalInfo.brand'] = { $in: preferences.preferredBrands };
      }

      // Get recommendations with scoring
      const recommendations = await Listing.aggregate([
        { $match: query },
        {
          $addFields: {
            score: {
              $add: [
                // View score (normalized)
                { $divide: ["$views", 100] },
                // Recency score (newer is better)
                {
                  $divide: [
                    { $subtract: [new Date(), "$createdAt"] },
                    -86400000 // Negative to make newer items score higher
                  ]
                },
                // Price attractiveness (closer to user's range is better)
                {
                  $cond: [
                    {
                      $and: [
                        { $gte: ["$pricing.amount", preferences.priceRange.min] },
                        { $lte: ["$pricing.amount", preferences.priceRange.max] }
                      ]
                    },
                    10, // Bonus for being in preferred price range
                    0
                  ]
                }
              ]
            }
          }
        },
        { $sort: { score: -1 } },
        { $limit: Number(limit) },
        {
          $lookup: {
            from: "users",
            localField: "sellerId",
            foreignField: "_id",
            as: "seller",
            pipeline: [{ $project: { fullName: 1, reputation: 1 } }]
          }
        },
        { $unwind: "$seller" }
      ]);

      res.json({
        success: true,
        data: {
          recommendations,
          preferences: {
            basedOn: userOrders.length > 0 ? "purchase_history" : wishlistItems.length > 0 ? "wishlist" : "popular",
            preferredTypes: preferences.preferredTypes,
            preferredBrands: preferences.preferredBrands,
            priceRange: preferences.priceRange
          }
        }
      });
    } catch (error) {
      console.error("Error getting bike recommendations:", error);
      res.status(500).json({
        success: false,
        message: "Error getting bike recommendations"
      });
    }
  }

  /**
   * Get similar bikes to a specific listing
   */
  static async getSimilarBikes(req: Request, res: Response) {
    try {
      const { listingId } = req.params;
      const { limit = 5 } = req.query;

      // Get the reference listing
      const referenceListing = await Listing.findById(listingId);
      if (!referenceListing) {
        return res.status(404).json({
          success: false,
          message: "Listing not found"
        });
      }

      // Find similar bikes based on:
      // 1. Same type
      // 2. Similar price range (±30%)
      // 3. Same brand (bonus)
      // 4. Similar specs
      const priceMin = referenceListing.pricing.amount * 0.7;
      const priceMax = referenceListing.pricing.amount * 1.3;

      const similarBikes = await Listing.aggregate([
        {
          $match: {
            _id: { $ne: new mongoose.Types.ObjectId(listingId) },
            status: ListingStatus.PUBLISHED,
            type: referenceListing.type,
            'pricing.amount': { $gte: priceMin, $lte: priceMax }
          }
        },
        {
          $addFields: {
            similarityScore: {
              $add: [
                // Brand match bonus
                {
                  $cond: [
                    { $eq: ["$generalInfo.brand", referenceListing.generalInfo.brand] },
                    5,
                    0
                  ]
                },
                // Price similarity (closer = higher score)
                {
                  $subtract: [
                    5,
                    {
                      $abs: {
                        $divide: [
                          { $subtract: ["$pricing.amount", referenceListing.pricing.amount] },
                          referenceListing.pricing.amount
                        ]
                      }
                    }
                  ]
                },
                // Year similarity
                {
                  $cond: [
                    { $eq: ["$generalInfo.year", referenceListing.generalInfo.year] },
                    2,
                    {
                      $subtract: [
                        2,
                        { $abs: { $subtract: ["$generalInfo.year", referenceListing.generalInfo.year] } }
                      ]
                    }
                  ]
                }
              ]
            }
          }
        },
        { $sort: { similarityScore: -1, views: -1 } },
        { $limit: Number(limit) },
        {
          $lookup: {
            from: "users",
            localField: "sellerId",
            foreignField: "_id",
            as: "seller",
            pipeline: [{ $project: { fullName: 1, reputation: 1 } }]
          }
        },
        { $unwind: "$seller" }
      ]);

      res.json({
        success: true,
        data: {
          referenceListing: {
            id: referenceListing._id,
            title: referenceListing.title,
            brand: referenceListing.generalInfo.brand,
            type: referenceListing.type,
            price: referenceListing.pricing.amount
          },
          similarBikes
        }
      });
    } catch (error) {
      console.error("Error getting similar bikes:", error);
      res.status(500).json({
        success: false,
        message: "Error getting similar bikes"
      });
    }
  }

  /**
   * Get trending bikes based on views, orders, and recency
   */
  static async getTrendingBikes(req: Request, res: Response) {
    try {
      const { period = "7d", limit = 10 } = req.query;

      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get trending bikes based on:
      // 1. Recent views
      // 2. Recent orders
      // 3. Recency of listing
      const trendingBikes = await Listing.aggregate([
        {
          $match: {
            status: ListingStatus.PUBLISHED,
            createdAt: { $gte: startDate }
          }
        },
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "listingId",
            as: "recentOrders",
            pipeline: [
              { $match: { createdAt: { $gte: startDate } } },
              { $count: "count" }
            ]
          }
        },
        {
          $addFields: {
            trendingScore: {
              $add: [
                // Views score (normalized)
                { $divide: ["$views", 10] },
                // Recent orders score
                { $multiply: [{ $ifNull: [{ $arrayElemAt: ["$recentOrders.count", 0] }, 0] }, 20] },
                // Recency score (newer listings get bonus)
                {
                  $divide: [
                    { $subtract: [new Date(), "$createdAt"] },
                    -86400000 // Negative to favor newer listings
                  ]
                }
              ]
            }
          }
        },
        { $sort: { trendingScore: -1 } },
        { $limit: Number(limit) },
        {
          $lookup: {
            from: "users",
            localField: "sellerId",
            foreignField: "_id",
            as: "seller",
            pipeline: [{ $project: { fullName: 1, reputation: 1 } }]
          }
        },
        { $unwind: "$seller" },
        {
          $project: {
            recentOrders: 0 // Remove the lookup field from output
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          trendingBikes,
          period,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error("Error getting trending bikes:", error);
      res.status(500).json({
        success: false,
        message: "Error getting trending bikes"
      });
    }
  }

  /**
   * Get AI price prediction for a bike
   */
  static async getPricePrediction(req: Request, res: Response) {
    try {
      const { listingId } = req.params;

      const listing = await Listing.findById(listingId);
      if (!listing) {
        return res.status(404).json({
          success: false,
          message: "Listing not found"
        });
      }

      // Find similar sold bikes for price analysis
      const similarSoldBikes = await Listing.find({
        type: listing.type,
        'generalInfo.brand': listing.generalInfo.brand,
        status: ListingStatus.SOLD,
        'generalInfo.year': { 
          $gte: listing.generalInfo.year - 2, 
          $lte: listing.generalInfo.year + 2 
        }
      }).select('pricing generalInfo');

      if (similarSoldBikes.length === 0) {
        return res.json({
          success: true,
          data: {
            prediction: "insufficient_data",
            message: "Not enough similar bikes sold to make accurate prediction",
            currentPrice: listing.pricing.amount
          }
        });
      }

      // Calculate price statistics
      const prices = similarSoldBikes.map(bike => bike.pricing.amount);
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      // Calculate standard deviation
      const variance = prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);

      // Determine price assessment
      const currentPrice = listing.pricing.amount;
      let assessment = "fair";
      let confidence = 0.7;

      if (currentPrice < avgPrice - stdDev) {
        assessment = "below_market";
        confidence = 0.8;
      } else if (currentPrice > avgPrice + stdDev) {
        assessment = "above_market";
        confidence = 0.8;
      }

      // Suggested price range
      const suggestedMin = Math.max(minPrice, avgPrice - stdDev);
      const suggestedMax = Math.min(maxPrice, avgPrice + stdDev);

      res.json({
        success: true,
        data: {
          prediction: {
            assessment,
            confidence,
            suggestedPrice: Math.round(avgPrice),
            suggestedRange: {
              min: Math.round(suggestedMin),
              max: Math.round(suggestedMax)
            }
          },
          marketData: {
            averagePrice: Math.round(avgPrice),
            priceRange: { min: minPrice, max: maxPrice },
            sampleSize: similarSoldBikes.length,
            standardDeviation: Math.round(stdDev)
          },
          currentListing: {
            price: currentPrice,
            brand: listing.generalInfo.brand,
            year: listing.generalInfo.year,
            type: listing.type
          }
        }
      });
    } catch (error) {
      console.error("Error getting price prediction:", error);
      res.status(500).json({
        success: false,
        message: "Error getting price prediction"
      });
    }
  }

  /**
   * Analyze user preferences from purchase history and wishlist
   */
  private static analyzeUserPreferences(orders: any[], wishlistItems: any[]) {
    const preferences = {
      preferredTypes: [] as string[],
      preferredBrands: [] as string[],
      priceRange: { min: 0, max: 1000000000 }
    };

    // Analyze purchase history
    if (orders.length > 0) {
      const types = orders.map(order => order.listingId?.type).filter(Boolean);
      const brands = orders.map(order => order.listingId?.generalInfo?.brand).filter(Boolean);
      const prices = orders.map(order => order.financials.itemPrice);

      preferences.preferredTypes = [...new Set(types)];
      preferences.preferredBrands = [...new Set(brands)];

      if (prices.length > 0) {
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        preferences.priceRange = {
          min: Math.max(0, avgPrice * 0.5),
          max: avgPrice * 2
        };
      }
    }

    // Supplement with wishlist data if no purchase history
    if (preferences.preferredTypes.length === 0 && wishlistItems.length > 0) {
      const types = wishlistItems.map(item => item.listingId?.type).filter(Boolean);
      const brands = wishlistItems.map(item => item.listingId?.generalInfo?.brand).filter(Boolean);
      
      preferences.preferredTypes = [...new Set(types)];
      preferences.preferredBrands = [...new Set(brands)];
    }

    return preferences;
  }
}