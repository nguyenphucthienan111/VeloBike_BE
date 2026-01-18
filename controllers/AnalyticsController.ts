import { Request, Response } from "express";
import { Listing } from "../models/Listing";
import { Order, OrderStatus } from "../models/Order";
import { Transaction } from "../models/Transaction";

export class AnalyticsController {
  /**
   * GET /api/analytics/seller/dashboard
   * Get seller analytics dashboard
   */
  static async getSellerDashboard(req: any, res: Response) {
    try {
      const sellerId = req.user?.id;
      if (!sellerId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      // Get all seller's listings
      const listings = await Listing.find({ sellerId });
      const listingIds = listings.map(l => l._id);

      // Total views
      const totalViews = listings.reduce((sum, listing) => sum + (listing.views || 0), 0);

      // Total listings by status
      const listingsByStatus = {
        draft: listings.filter(l => l.status === "DRAFT").length,
        pending: listings.filter(l => l.status === "PENDING_APPROVAL").length,
        published: listings.filter(l => l.status === "PUBLISHED").length,
        sold: listings.filter(l => l.status === "SOLD").length,
        rejected: listings.filter(l => l.status === "REJECTED").length,
      };

      // Get orders
      const orders = await Order.find({ sellerId });
      const completedOrders = orders.filter(o => o.status === OrderStatus.COMPLETED);

      // Revenue calculation
      const totalRevenue = completedOrders.reduce((sum, order) => {
        const sellerReceived = order.financials.itemPrice - order.financials.platformFee;
        return sum + sellerReceived;
      }, 0);

      const totalSales = completedOrders.length;
      const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

      // Conversion rate (orders / views)
      const conversionRate = totalViews > 0 ? (orders.length / totalViews) * 100 : 0;

      // Top performing listings
      const topListings = listings
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5)
        .map(l => ({
          id: l._id,
          title: l.title,
          views: l.views || 0,
          status: l.status,
          price: l.pricing.amount,
        }));

      // Recent transactions
      const transactions = await Transaction.find({ userId: sellerId })
        .sort({ createdAt: -1 })
        .limit(10);

      res.json({
        success: true,
        data: {
          overview: {
            totalListings: listings.length,
            totalViews,
            totalSales,
            totalRevenue,
            averageOrderValue: Math.round(averageOrderValue),
            conversionRate: parseFloat(conversionRate.toFixed(2)),
          },
          listingsByStatus,
          topListings,
          recentTransactions: transactions,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/analytics/seller/performance
   * Get seller performance over time
   */
  static async getSellerPerformance(req: any, res: Response) {
    try {
      const sellerId = req.user?.id;
      const { period = "30d" } = req.query; // 7d, 30d, 90d

      if (!sellerId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      // Calculate date range
      const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get orders in period
      const orders = await Order.find({
        sellerId,
        createdAt: { $gte: startDate },
      }).sort({ createdAt: 1 });

      // Group by date
      const dailyStats: any = {};
      orders.forEach(order => {
        const date = order.createdAt.toISOString().split("T")[0];
        if (!dailyStats[date]) {
          dailyStats[date] = {
            date,
            orders: 0,
            revenue: 0,
          };
        }
        dailyStats[date].orders += 1;
        if (order.status === OrderStatus.COMPLETED) {
          const sellerReceived = order.financials.itemPrice - order.financials.platformFee;
          dailyStats[date].revenue += sellerReceived;
        }
      });

      const performanceData = Object.values(dailyStats);

      res.json({
        success: true,
        data: {
          period,
          performanceData,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/analytics/listing/:id
   * Get analytics for a specific listing
   */
  static async getListingAnalytics(req: any, res: Response) {
    try {
      const sellerId = req.user?.id;
      const { id } = req.params;

      if (!sellerId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const listing = await Listing.findById(id);
      if (!listing) {
        return res.status(404).json({ success: false, message: "Listing not found" });
      }

      // Check ownership
      if (listing.sellerId.toString() !== sellerId) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }

      // Get orders for this listing
      const orders = await Order.find({ listingId: id });
      const completedOrders = orders.filter(o => o.status === OrderStatus.COMPLETED);

      // Calculate metrics
      const views = listing.views || 0;
      const inquiries = orders.length;
      const sales = completedOrders.length;
      const conversionRate = views > 0 ? (inquiries / views) * 100 : 0;
      const salesRate = inquiries > 0 ? (sales / inquiries) * 100 : 0;

      res.json({
        success: true,
        data: {
          listing: {
            id: listing._id,
            title: listing.title,
            status: listing.status,
            price: listing.pricing.amount,
            createdAt: listing.createdAt,
            boostedUntil: listing.boostedUntil,
            boostCount: listing.boostCount || 0,
          },
          metrics: {
            views,
            inquiries,
            sales,
            conversionRate: parseFloat(conversionRate.toFixed(2)),
            salesRate: parseFloat(salesRate.toFixed(2)),
          },
          orders,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
