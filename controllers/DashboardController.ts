import { Request, Response } from "express";
import { Order, OrderStatus } from "../models/Order";
import { Listing, ListingStatus } from "../models/Listing";
import { Review } from "../models/Review";
import { Inspection } from "../models/Inspection";
import { User } from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";
import mongoose from "mongoose";

export class DashboardController {
  /**
   * Get seller analytics (sales, revenue, trends)
   */
  static async getSellerAnalytics(req: AuthRequest, res: Response) {
    try {
      const sellerId = req.user?.id;
      const { period = "30d" } = req.query;

      // Calculate date range
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get completed orders
      const completedOrders = await Order.find({
        sellerId: new mongoose.Types.ObjectId(sellerId),
        status: OrderStatus.COMPLETED,
        createdAt: { $gte: startDate }
      }).populate('listingId', 'title pricing');

      // Calculate metrics
      const totalRevenue = completedOrders.reduce((sum, order) => sum + order.financials.itemPrice, 0);
      const totalOrders = completedOrders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Get active listings
      const activeListings = await Listing.countDocuments({
        sellerId: new mongoose.Types.ObjectId(sellerId),
        status: ListingStatus.PUBLISHED
      });

      // Get total views
      const viewsAgg = await Listing.aggregate([
        { $match: { sellerId: new mongoose.Types.ObjectId(sellerId) } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } }
      ]);
      const totalViews = viewsAgg[0]?.totalViews || 0;

      // Get conversion rate
      const totalListings = await Listing.countDocuments({
        sellerId: new mongoose.Types.ObjectId(sellerId)
      });
      const soldListings = await Listing.countDocuments({
        sellerId: new mongoose.Types.ObjectId(sellerId),
        status: ListingStatus.SOLD
      });
      const conversionRate = totalListings > 0 ? (soldListings / totalListings) * 100 : 0;

      // Get daily revenue trend
      const dailyRevenue = await Order.aggregate([
        {
          $match: {
            sellerId: new mongoose.Types.ObjectId(sellerId),
            status: OrderStatus.COMPLETED,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$financials.itemPrice" },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      res.json({
        success: true,
        data: {
          metrics: {
            totalRevenue,
            totalOrders,
            averageOrderValue,
            activeListings,
            totalViews,
            conversionRate: Math.round(conversionRate * 100) / 100
          },
          trends: {
            dailyRevenue
          },
          period
        }
      });
    } catch (error) {
      console.error("Error getting seller analytics:", error);
      res.status(500).json({
        success: false,
        message: "Error getting seller analytics"
      });
    }
  }

  /**
   * Get seller performance metrics
   */
  static async getSellerPerformance(req: AuthRequest, res: Response) {
    try {
      const sellerId = req.user?.id;

      // Get seller reviews
      const reviews = await Review.find({
        revieweeId: new mongoose.Types.ObjectId(sellerId),
        type: "SELLER"
      });

      const avgRating = reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0;

      // Get response time (average time to respond to messages)
      // This would need message timestamps - simplified for now
      const avgResponseTime = "< 2 hours"; // Mock data

      // Get order fulfillment metrics
      const orders = await Order.find({
        sellerId: new mongoose.Types.ObjectId(sellerId)
      });

      const onTimeDelivery = orders.filter(order => 
        order.status === OrderStatus.COMPLETED
      ).length;
      const onTimeRate = orders.length > 0 ? (onTimeDelivery / orders.length) * 100 : 0;

      // Get inspection pass rate
      const inspections = await Inspection.find({}).populate({
        path: 'orderId',
        match: { sellerId: new mongoose.Types.ObjectId(sellerId) }
      });

      const passedInspections = inspections.filter(insp => 
        insp.overallVerdict === "PASSED"
      ).length;
      const inspectionPassRate = inspections.length > 0 ? (passedInspections / inspections.length) * 100 : 0;

      res.json({
        success: true,
        data: {
          rating: {
            average: Math.round(avgRating * 10) / 10,
            count: reviews.length
          },
          responseTime: avgResponseTime,
          fulfillment: {
            onTimeRate: Math.round(onTimeRate * 100) / 100,
            totalOrders: orders.length
          },
          inspection: {
            passRate: Math.round(inspectionPassRate * 100) / 100,
            totalInspections: inspections.length
          }
        }
      });
    } catch (error) {
      console.error("Error getting seller performance:", error);
      res.status(500).json({
        success: false,
        message: "Error getting seller performance"
      });
    }
  }

  /**
   * Get seller inventory management data
   */
  static async getSellerInventory(req: AuthRequest, res: Response) {
    try {
      const sellerId = req.user?.id;

      // Get listings by status
      const listingsByStatus = await Listing.aggregate([
        { $match: { sellerId: new mongoose.Types.ObjectId(sellerId) } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]);

      // Get listings by type
      const listingsByType = await Listing.aggregate([
        { $match: { sellerId: new mongoose.Types.ObjectId(sellerId) } },
        { $group: { _id: "$type", count: { $sum: 1 } } }
      ]);

      // Get recent listings
      const recentListings = await Listing.find({
        sellerId: new mongoose.Types.ObjectId(sellerId)
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title status pricing.amount views createdAt');

      // Get low-performing listings (low views, old)
      const lowPerformingListings = await Listing.find({
        sellerId: new mongoose.Types.ObjectId(sellerId),
        status: ListingStatus.PUBLISHED,
        views: { $lt: 10 },
        createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 days old
      })
      .select('title views createdAt pricing.amount')
      .limit(5);

      res.json({
        success: true,
        data: {
          summary: {
            byStatus: listingsByStatus,
            byType: listingsByType
          },
          recentListings,
          lowPerformingListings
        }
      });
    } catch (error) {
      console.error("Error getting seller inventory:", error);
      res.status(500).json({
        success: false,
        message: "Error getting seller inventory"
      });
    }
  }

  /**
   * Get buyer purchase history
   */
  static async getBuyerHistory(req: AuthRequest, res: Response) {
    try {
      const buyerId = req.user?.id;
      const { page = 1, limit = 10 } = req.query;

      const orders = await Order.find({
        buyerId: new mongoose.Types.ObjectId(buyerId)
      })
      .populate('listingId', 'title media generalInfo pricing')
      .populate('sellerId', 'fullName reputation')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

      const totalOrders = await Order.countDocuments({
        buyerId: new mongoose.Types.ObjectId(buyerId)
      });

      // Calculate spending summary
      const spendingSummary = await Order.aggregate([
        { $match: { buyerId: new mongoose.Types.ObjectId(buyerId) } },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: "$financials.totalAmount" },
            completedOrders: {
              $sum: { $cond: [{ $eq: ["$status", OrderStatus.COMPLETED] }, 1, 0] }
            }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalOrders,
            pages: Math.ceil(totalOrders / Number(limit))
          },
          summary: spendingSummary[0] || { totalSpent: 0, completedOrders: 0 }
        }
      });
    } catch (error) {
      console.error("Error getting buyer history:", error);
      res.status(500).json({
        success: false,
        message: "Error getting buyer history"
      });
    }
  }

  /**
   * Get buyer saved searches (mock implementation)
   */
  static async getBuyerSavedSearches(req: AuthRequest, res: Response) {
    try {
      const buyerId = req.user?.id;

      // Mock saved searches - in real implementation, create SavedSearch model
      const savedSearches = [
        {
          id: "1",
          name: "Road bikes under 50M",
          query: { type: "ROAD", maxPrice: 50000000 },
          alertsEnabled: true,
          createdAt: new Date(),
          resultsCount: 25
        },
        {
          id: "2", 
          name: "Trek bikes in Ho Chi Minh",
          query: { brand: "Trek", location: "Ho Chi Minh City" },
          alertsEnabled: false,
          createdAt: new Date(),
          resultsCount: 12
        }
      ];

      res.json({
        success: true,
        data: savedSearches
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
   * Get buyer price alerts (mock implementation)
   */
  static async getBuyerPriceAlerts(req: AuthRequest, res: Response) {
    try {
      const buyerId = req.user?.id;

      // Mock price alerts - in real implementation, create PriceAlert model
      const priceAlerts = [
        {
          id: "1",
          listingId: "listing123",
          targetPrice: 45000000,
          currentPrice: 50000000,
          isActive: true,
          createdAt: new Date()
        }
      ];

      res.json({
        success: true,
        data: priceAlerts
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
   * Get personalized bike recommendations
   */
  static async getBuyerRecommendations(req: AuthRequest, res: Response) {
    try {
      const buyerId = req.user?.id;

      // Get user's purchase history to understand preferences
      const userOrders = await Order.find({
        buyerId: new mongoose.Types.ObjectId(buyerId),
        status: OrderStatus.COMPLETED
      }).populate('listingId');

      // Get user's wishlist to understand interests
      const { Wishlist } = require('../models/Wishlist');
      const wishlistItems = await Wishlist.find({
        buyerId: new mongoose.Types.ObjectId(buyerId)
      }).populate('listingId');

      // Simple recommendation algorithm based on:
      // 1. Similar bike types from purchase history
      // 2. Similar price range
      // 3. Popular bikes in user's location
      
      let recommendedTypes: string[] = [];
      let priceRange = { min: 0, max: 100000000 };

      if (userOrders.length > 0) {
        // Extract preferred bike types
        recommendedTypes = [...new Set(userOrders.map((order: any) => order.listingId?.type).filter(Boolean))];
        
        // Calculate preferred price range
        const prices = userOrders.map((order: any) => order.financials.itemPrice);
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        priceRange = {
          min: Math.max(0, avgPrice * 0.7),
          max: avgPrice * 1.5
        };
      }

      // If no purchase history, use wishlist data
      if (recommendedTypes.length === 0 && wishlistItems.length > 0) {
        recommendedTypes = [...new Set(wishlistItems.map((item: any) => item.listingId?.type).filter(Boolean))] as string[];
      }

      // Default to popular types if no data
      if (recommendedTypes.length === 0) {
        recommendedTypes = ["ROAD", "MTB"];
      }

      // Get recommendations
      const recommendations = await Listing.find({
        status: ListingStatus.PUBLISHED,
        type: { $in: recommendedTypes },
        'pricing.amount': { $gte: priceRange.min, $lte: priceRange.max },
        sellerId: { $ne: new mongoose.Types.ObjectId(buyerId) } // Don't recommend own listings
      })
      .populate('sellerId', 'fullName reputation')
      .sort({ views: -1, createdAt: -1 }) // Popular and recent first
      .limit(10);

      res.json({
        success: true,
        data: {
          recommendations,
          reasoning: {
            basedOn: userOrders.length > 0 ? "purchase_history" : wishlistItems.length > 0 ? "wishlist" : "popular",
            preferredTypes: recommendedTypes,
            priceRange
          }
        }
      });
    } catch (error) {
      console.error("Error getting recommendations:", error);
      res.status(500).json({
        success: false,
        message: "Error getting recommendations"
      });
    }
  }

  /**
   * Get inspector statistics
   */
  static async getInspectorStats(req: AuthRequest, res: Response) {
    try {
      const inspectorId = req.user?.id;
      const { period = "30d" } = req.query;

      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get inspections completed
      const inspections = await Inspection.find({
        inspectorId: new mongoose.Types.ObjectId(inspectorId),
        completedAt: { $gte: startDate }
      });

      const totalInspections = inspections.length;
      const passedInspections = inspections.filter(insp => insp.overallVerdict === "PASSED").length;
      const failedInspections = inspections.filter(insp => insp.overallVerdict === "FAILED").length;
      const passRate = totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 0;

      // Get average inspection score
      const avgScore = inspections.length > 0 
        ? inspections.reduce((sum, insp) => sum + (insp.overallScore || 0), 0) / inspections.length
        : 0;

      // Get pending inspections
      const pendingInspections = await Order.countDocuments({
        inspectorId: new mongoose.Types.ObjectId(inspectorId),
        status: OrderStatus.IN_INSPECTION
      });

      res.json({
        success: true,
        data: {
          totalInspections,
          passedInspections,
          failedInspections,
          passRate: Math.round(passRate * 100) / 100,
          averageScore: Math.round(avgScore * 10) / 10,
          pendingInspections,
          period
        }
      });
    } catch (error) {
      console.error("Error getting inspector stats:", error);
      res.status(500).json({
        success: false,
        message: "Error getting inspector stats"
      });
    }
  }

  /**
   * Get inspector earnings
   */
  static async getInspectorEarnings(req: AuthRequest, res: Response) {
    try {
      const inspectorId = req.user?.id;
      const { period = "30d" } = req.query;

      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get completed orders where this inspector was involved
      const completedOrders = await Order.find({
        inspectorId: new mongoose.Types.ObjectId(inspectorId),
        status: OrderStatus.COMPLETED,
        createdAt: { $gte: startDate }
      });

      const totalEarnings = completedOrders.reduce((sum, order) => sum + order.financials.inspectionFee, 0);
      const totalInspections = completedOrders.length;
      const averageFee = totalInspections > 0 ? totalEarnings / totalInspections : 0;

      // Get daily earnings trend
      const dailyEarnings = await Order.aggregate([
        {
          $match: {
            inspectorId: new mongoose.Types.ObjectId(inspectorId),
            status: OrderStatus.COMPLETED,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            earnings: { $sum: "$financials.inspectionFee" },
            inspections: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      res.json({
        success: true,
        data: {
          totalEarnings,
          totalInspections,
          averageFee,
          dailyEarnings,
          period
        }
      });
    } catch (error) {
      console.error("Error getting inspector earnings:", error);
      res.status(500).json({
        success: false,
        message: "Error getting inspector earnings"
      });
    }
  }
}