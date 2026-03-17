import { Request, Response } from "express";
import { User, UserRole, KycStatus } from "../models/User";
import { Listing, ListingStatus } from "../models/Listing";
import { Order, OrderStatus } from "../models/Order";
import { Dispute } from "../models/Dispute";
import { Review } from "../models/Review";
import mongoose from "mongoose";

export class AdminController {
  /**
   * Get dashboard statistics
   * GET /api/admin/dashboard
   */
  static async getDashboard(req: Request, res: Response) {
    try {
      const stats = await Promise.all([
        User.countDocuments(),
        Listing.countDocuments(),
        Order.countDocuments(),
        Order.aggregate([
          { $match: { status: OrderStatus.COMPLETED } },
          { $group: { _id: null, totalRevenue: { $sum: "$financials.platformFee" } } },
        ]),
        Dispute.countDocuments({ status: "OPEN" }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalUsers: stats[0],
          totalListings: stats[1],
          totalOrders: stats[2],
          totalRevenue: stats[3][0]?.totalRevenue || 0,
          openDisputes: stats[4],
        },
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error fetching dashboard", error: error.message });
    }
  }

  /**
   * Get all users
   * GET /api/admin/users
   */
  static async getAllUsers(req: Request, res: Response) {
    try {
      const { role, status, page = 1, limit = 20 } = req.query;

      const query: any = {};
      if (role) query.role = role;
      if (status) query.isActive = status === "active";

      const users = await User.find(query)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await User.countDocuments(query);

      res.status(200).json({
        success: true,
        data: users,
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
        .json({ success: false, message: "Error fetching users", error: error.message });
    }
  }

  /**
   * Update user KYC status
   * PUT /api/admin/users/:userId/kyc
   */
  static async updateUserKyc(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { kycStatus } = req.body;

      if (!Object.values(KycStatus).includes(kycStatus)) {
        return res.status(400).json({ success: false, message: "Invalid KYC status" });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { kycStatus, "kycData.verifiedAt": new Date() },
        { new: true }
      ).select("-passwordHash");

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      res.status(200).json({
        success: true,
        message: "KYC status updated",
        data: user,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error updating KYC", error: error.message });
    }
  }

  /**
   * Ban/Suspend user
   * PUT /api/admin/users/:userId/status
   */
  static async updateUserStatus(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      const user = await User.findByIdAndUpdate(
        userId,
        { isActive },
        { new: true }
      ).select("-passwordHash");

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      res.status(200).json({
        success: true,
        message: `User ${isActive ? "activated" : "deactivated"}`,
        data: user,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error updating user status", error: error.message });
    }
  }

  /**
   * Get all listings for moderation (with priority sorting for pending approvals)
   * GET /api/admin/listings
   */
  static async getAllListings(req: Request, res: Response) {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      const query: any = {};
      if (status) query.status = status;

      let listings = await Listing.find(query)
        .populate("sellerId", "fullName email reputation")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean();

      // If filtering PENDING_APPROVAL, sort by subscription priority
      if (status === "PENDING_APPROVAL") {
        const { SubscriptionService } = await import("../services/SubscriptionService");
        
        // Enrich with seller priority
        listings = await Promise.all(
          listings.map(async (listing: any) => {
            const subscription = await SubscriptionService.getSellerSubscription(
              listing.sellerId._id || listing.sellerId
            );
            if (subscription) {
              const plan = await SubscriptionService.getPlanByType(subscription.planType);
              listing.priorityLevel = plan?.priorityLevel || 0;
              listing.approvalTimeHours = plan?.approvalTimeHours || 48;
              listing.sellerPlanType = subscription.planType;
            } else {
              listing.priorityLevel = 0;
              listing.approvalTimeHours = 48;
              listing.sellerPlanType = "FREE";
            }
            return listing;
          })
        );

        // Sort by priority (highest first), then by createdAt (oldest first)
        listings.sort((a: any, b: any) => {
          if (a.priorityLevel !== b.priorityLevel) {
            return b.priorityLevel - a.priorityLevel; // Higher priority first
          }
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); // Older first
        });
      }

      const total = await Listing.countDocuments(query);

      res.status(200).json({
        success: true,
        data: listings,
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
        .json({ success: false, message: "Error fetching listings", error: error.message });
    }
  }

  /**
   * Approve/Reject listing (SRS BikeMarket requirement)
   * PUT /api/admin/listings/:listingId/status
   */
  static async updateListingStatus(req: Request, res: Response) {
    try {
      const { listingId } = req.params;
      const { status, rejectionReason } = req.body;

      // SRS BikeMarket: Admin can approve (PUBLISHED) or reject (REJECTED)
      const allowedStatuses = ["PUBLISHED", "REJECTED"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid status. Admin can only PUBLISHED or REJECTED listings per SRS BikeMarket" 
        });
      }

      const updateData: any = { status };
      if (status === "REJECTED" && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }

      const listing = await Listing.findByIdAndUpdate(
        listingId,
        updateData,
        { new: true }
      ).populate("sellerId", "fullName email");

      if (!listing) {
        return res.status(404).json({ success: false, message: "Listing not found" });
      }

      // TODO: Send notification to seller about listing approval/rejection

      const message = status === "PUBLISHED" 
        ? "Listing approved and published per SRS BikeMarket workflow"
        : "Listing rejected per SRS BikeMarket workflow";

      res.status(200).json({
        success: true,
        message,
        data: listing,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error updating listing", error: error.message });
    }
  }

  /**
   * Get all orders
   * GET /api/admin/orders
   */
  static async getAllOrders(req: Request, res: Response) {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      const query: any = {};
      if (status) query.status = status;

      const orders = await Order.find(query)
        .populate("buyerId", "fullName email")
        .populate("sellerId", "fullName email")
        .populate("listingId", "title")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Order.countDocuments(query);

      res.status(200).json({
        success: true,
        data: orders,
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
        .json({ success: false, message: "Error fetching orders", error: error.message });
    }
  }

  /**
   * Get system reports & analytics
   * GET /api/admin/analytics
   */
  static async getAnalytics(req: Request, res: Response) {
    try {
      const { period = "month" } = req.query; // day, week, month, year

      const dateFilter = AdminController.getDateFilter(period as string);

      const analytics = await Promise.all([
        Order.countDocuments({ createdAt: { $gte: dateFilter } }),
        Order.aggregate([
          { $match: { createdAt: { $gte: dateFilter } } },
          { $group: { _id: null, totalRevenue: { $sum: "$financials.platformFee" } } },
        ]),
        User.countDocuments({
          role: UserRole.SELLER,
          createdAt: { $gte: dateFilter },
        }),
        Review.countDocuments({ createdAt: { $gte: dateFilter } }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          period,
          orders: analytics[0],
          revenue: analytics[1][0]?.totalRevenue || 0,
          newSellers: analytics[2],
          reviews: analytics[3],
        },
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error fetching analytics", error: error.message });
    }
  }

  /**
   * Manage platform settings/categories
   * This would typically interact with a Settings model
   */
  static async getSettings(req: Request, res: Response) {
    try {
      // TODO: Implement settings model and retrieval
      res.status(200).json({
        success: true,
        data: {
          platformFeePercentage: 10,
          inspectionFee: 500000,
          shippingFee: 150000,
          minimumBikePrice: 500000,
          maximumBikePrice: 500000000,
        },
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error fetching settings", error: error.message });
    }
  }

  /**
   * Update platform settings
   */
  static async updateSettings(req: Request, res: Response) {
    try {
      const settings = req.body;

      // TODO: Save to database

      res.status(200).json({
        success: true,
        message: "Settings updated",
        data: settings,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Error updating settings", error: error.message });
    }
  }

  /**
   * Release payout to seller (Admin only)
   * PUT /api/admin/orders/:id/payout
   */
  static async releasePayout(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { OrderService } = await import("../services/OrderService");

      const order = await Order.findById(id).populate("sellerId");
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      if (order.status !== OrderStatus.DELIVERED) {
        return res.status(400).json({
          success: false,
          message: "Order must be in DELIVERED status to release payout",
        });
      }

      // Complete the order (handles wallet update and status transition)
      await OrderService.completeOrder(id, (req as any).user.id);

      res.status(200).json({
        success: true,
        message: "Payout released and order completed",
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get all inspectors
   * GET /api/admin/inspectors
   */
  static async getAllInspectors(req: Request, res: Response) {
    try {
      const { isActive, page = 1, limit = 20 } = req.query;

      const query: any = { role: UserRole.INSPECTOR };
      if (isActive !== undefined) {
        query.isActive = isActive === "true";
      }

      const inspectors = await User.find(query)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await User.countDocuments(query);

      res.status(200).json({
        success: true,
        data: inspectors,
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

  /**
   * Helper: Get date filter based on period
   */
  private static getDateFilter(period: string): Date {
    const now = new Date();
    const date = new Date(now);

    switch (period) {
      case "day":
        date.setDate(date.getDate() - 1);
        break;
      case "week":
        date.setDate(date.getDate() - 7);
        break;
      case "month":
        date.setMonth(date.getMonth() - 1);
        break;
      case "year":
        date.setFullYear(date.getFullYear() - 1);
        break;
      default:
        date.setMonth(date.getMonth() - 1);
    }

    return date;
  }
}
