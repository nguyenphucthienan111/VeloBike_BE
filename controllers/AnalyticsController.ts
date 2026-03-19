import { Request, Response } from "express";
import { Listing } from "../models/Listing";
import { Order, OrderStatus } from "../models/Order";
import { Transaction } from "../models/Transaction";
import { Types } from "mongoose";

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

      const sellerObjId = new Types.ObjectId(sellerId);

      // Run all queries in parallel
      const [listingAgg, orderAgg, topListingsAgg] = await Promise.all([
        // Listing stats via aggregation (no full load)
        Listing.aggregate([
          { $match: { sellerId: sellerObjId } },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalViews: { $sum: { $ifNull: ["$views", 0] } },
            },
          },
        ]),

        // Order stats via aggregation
        Order.aggregate([
          { $match: { sellerId: sellerObjId } },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              revenue: {
                $sum: {
                  $cond: [
                    { $eq: ["$status", OrderStatus.COMPLETED] },
                    { $subtract: ["$financials.itemPrice", "$financials.platformFee"] },
                    0,
                  ],
                },
              },
            },
          },
        ]),

        // Top listings: group completed orders by listingId
        Order.aggregate([
          { $match: { sellerId: sellerObjId, status: OrderStatus.COMPLETED } },
          {
            $group: {
              _id: "$listingId",
              sales: { $sum: 1 },
              revenue: {
                $sum: { $subtract: ["$financials.itemPrice", "$financials.platformFee"] },
              },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 5 },
        ]),
      ]);

      // Process listing aggregation
      let totalViews = 0;
      let totalListings = 0;
      const listingsByStatus: Record<string, number> = { draft: 0, pending: 0, published: 0, sold: 0, rejected: 0 };
      const statusMap: Record<string, string> = {
        DRAFT: "draft", PENDING_APPROVAL: "pending", PUBLISHED: "published", SOLD: "sold", REJECTED: "rejected",
      };
      for (const row of listingAgg) {
        totalViews += row.totalViews;
        totalListings += row.count;
        const key = statusMap[row._id];
        if (key) listingsByStatus[key] = row.count;
      }

      // Process order aggregation
      let totalSales = 0;
      let totalRevenue = 0;
      let totalOrders = 0;
      for (const row of orderAgg) {
        totalOrders += row.count;
        if (row._id === OrderStatus.COMPLETED) {
          totalSales = row.count;
          totalRevenue = row.revenue;
        }
      }

      const averageOrderValue = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;
      const conversionRate = totalViews > 0 ? parseFloat(((totalOrders / totalViews) * 100).toFixed(2)) : 0;

      // Fetch listing titles for top listings (separate query, no $lookup)
      const topListingIds = topListingsAgg.map((r: any) => r._id);
      const topListingDocs = topListingIds.length > 0
        ? await Listing.find({ _id: { $in: topListingIds } }).select("title views").lean()
        : [];
      const listingMap: Record<string, { title: string; views: number }> = {};
      for (const doc of topListingDocs) {
        listingMap[doc._id.toString()] = { title: doc.title, views: doc.views || 0 };
      }

      const mappedTopListings = topListingsAgg.map((l: any) => ({
        id: l._id,
        title: listingMap[l._id.toString()]?.title || 'Unknown',
        views: listingMap[l._id.toString()]?.views || 0,
        sales: l.sales,
        revenue: l.revenue,
      }));

      res.json({
        success: true,
        data: {
          overview: {
            totalListings,
            totalViews,
            totalSales,
            totalRevenue,
            averageOrderValue,
            conversionRate,
          },
          listingsByStatus,
          topListings: mappedTopListings,
          recentTransactions: [], // fetched separately by FE from /orders
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
      const { period = "30d" } = req.query;

      if (!sellerId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Use aggregation to group by date in DB instead of loading all orders
      const performanceData = await Order.aggregate([
        {
          $match: {
            sellerId: new Types.ObjectId(sellerId),
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            orders: { $sum: 1 },
            revenue: {
              $sum: {
                $cond: [
                  { $eq: ["$status", OrderStatus.COMPLETED] },
                  { $subtract: ["$financials.itemPrice", "$financials.platformFee"] },
                  0,
                ],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: "$_id", orders: 1, revenue: 1 } },
      ]);

      res.json({
        success: true,
        data: { period, performanceData },
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
