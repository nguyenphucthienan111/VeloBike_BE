import { Request, Response } from "express";
import { Listing, ListingStatus } from "../models/Listing";
import { Order } from "../models/Order";
import { User } from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";
import mongoose from "mongoose";

export class BulkController {
  /**
   * Bulk update listing status for seller
   */
  static async bulkUpdateListingStatus(req: AuthRequest, res: Response) {
    try {
      const sellerId = req.user?.id;
      const { listingIds, status } = req.body;

      if (!Array.isArray(listingIds) || listingIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Listing IDs array is required"
        });
      }

      if (!Object.values(ListingStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status"
        });
      }

      // Update only listings owned by the seller
      const result = await Listing.updateMany(
        {
          _id: { $in: listingIds.map(id => new mongoose.Types.ObjectId(id)) },
          sellerId: new mongoose.Types.ObjectId(sellerId)
        },
        { status }
      );

      res.json({
        success: true,
        message: `${result.modifiedCount} listings updated successfully`,
        data: {
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount
        }
      });
    } catch (error) {
      console.error("Error bulk updating listing status:", error);
      res.status(500).json({
        success: false,
        message: "Error updating listing status"
      });
    }
  }

  /**
   * Bulk delete listings for seller
   */
  static async bulkDeleteListings(req: AuthRequest, res: Response) {
    try {
      const sellerId = req.user?.id;
      const { listingIds } = req.body;

      if (!Array.isArray(listingIds) || listingIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Listing IDs array is required"
        });
      }

      // Only allow deletion of DRAFT listings or listings without active orders
      const activeOrders = await Order.find({
        listingId: { $in: listingIds.map(id => new mongoose.Types.ObjectId(id)) },
        status: { $in: ["CREATED", "ESCROW_LOCKED", "IN_INSPECTION", "SHIPPING"] }
      });

      if (activeOrders.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete listings with active orders"
        });
      }

      const result = await Listing.deleteMany({
        _id: { $in: listingIds.map(id => new mongoose.Types.ObjectId(id)) },
        sellerId: new mongoose.Types.ObjectId(sellerId),
        status: { $in: [ListingStatus.DRAFT, ListingStatus.PUBLISHED] }
      });

      res.json({
        success: true,
        message: `${result.deletedCount} listings deleted successfully`,
        data: {
          deletedCount: result.deletedCount
        }
      });
    } catch (error) {
      console.error("Error bulk deleting listings:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting listings"
      });
    }
  }

  /**
   * Bulk update listing prices for seller
   */
  static async bulkUpdatePrices(req: AuthRequest, res: Response) {
    try {
      const sellerId = req.user?.id;
      const { updates } = req.body; // Array of { listingId, newPrice }

      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Updates array is required"
        });
      }

      let updatedCount = 0;
      const errors: string[] = [];

      for (const update of updates) {
        try {
          const { listingId, newPrice } = update;
          
          if (!listingId || typeof newPrice !== 'number' || newPrice <= 0) {
            errors.push(`Invalid update data for listing ${listingId}`);
            continue;
          }

          const result = await Listing.updateOne(
            {
              _id: new mongoose.Types.ObjectId(listingId),
              sellerId: new mongoose.Types.ObjectId(sellerId)
            },
            { 'pricing.amount': newPrice }
          );

          if (result.modifiedCount > 0) {
            updatedCount++;
          }
        } catch (error) {
          errors.push(`Error updating listing ${update.listingId}: ${error}`);
        }
      }

      res.json({
        success: true,
        message: `${updatedCount} listings updated successfully`,
        data: {
          updatedCount,
          totalRequested: updates.length,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    } catch (error) {
      console.error("Error bulk updating prices:", error);
      res.status(500).json({
        success: false,
        message: "Error updating prices"
      });
    }
  }

  /**
   * Bulk update user status (Admin only)
   */
  static async bulkUpdateUserStatus(req: AuthRequest, res: Response) {
    try {
      const { userIds, isActive } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "User IDs array is required"
        });
      }

      const result = await User.updateMany(
        { _id: { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) } },
        { isActive }
      );

      res.json({
        success: true,
        message: `${result.modifiedCount} users updated successfully`,
        data: {
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount
        }
      });
    } catch (error) {
      console.error("Error bulk updating user status:", error);
      res.status(500).json({
        success: false,
        message: "Error updating user status"
      });
    }
  }

  /**
   * Bulk moderate listings (Admin only)
   */
  static async bulkModerateListing(req: AuthRequest, res: Response) {
    try {
      const { listingIds, action, reason } = req.body; // action: APPROVE, REJECT, FLAG

      if (!Array.isArray(listingIds) || listingIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Listing IDs array is required"
        });
      }

      let updateData: any = {};
      
      switch (action) {
        case "APPROVE":
          updateData = { status: ListingStatus.PUBLISHED };
          break;
        case "REJECT":
          updateData = { status: "REJECTED" }; // Would need to add this status to enum
          break;
        case "FLAG":
          updateData = { status: "FLAGGED" }; // Would need to add this status to enum
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid action"
          });
      }

      const result = await Listing.updateMany(
        { _id: { $in: listingIds.map(id => new mongoose.Types.ObjectId(id)) } },
        updateData
      );

      // Log moderation action (would implement ModerationLog model)
      console.log(`Admin ${req.user?.id} performed ${action} on ${result.modifiedCount} listings. Reason: ${reason}`);

      res.json({
        success: true,
        message: `${result.modifiedCount} listings ${action.toLowerCase()}ed successfully`,
        data: {
          modifiedCount: result.modifiedCount,
          action,
          reason
        }
      });
    } catch (error) {
      console.error("Error bulk moderating listings:", error);
      res.status(500).json({
        success: false,
        message: "Error moderating listings"
      });
    }
  }

  /**
   * Export listings to CSV
   */
  static async exportListings(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const { format = 'csv', startDate, endDate } = req.query;

      let query: any = {};

      // If seller, only export their listings
      if (userRole === "SELLER") {
        query.sellerId = new mongoose.Types.ObjectId(userId);
      }

      // Date filter
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate as string);
        if (endDate) query.createdAt.$lte = new Date(endDate as string);
      }

      const listings = await Listing.find(query)
        .populate('sellerId', 'fullName email')
        .sort({ createdAt: -1 });

      if (format === 'csv') {
        // Generate CSV
        const csvHeader = 'ID,Title,Brand,Model,Type,Price,Status,Seller,Created Date\n';
        const csvRows = listings.map(listing => {
          const seller = listing.sellerId as any;
          return [
            listing._id,
            `"${listing.title}"`,
            listing.generalInfo.brand,
            listing.generalInfo.model,
            listing.type,
            listing.pricing.amount,
            listing.status,
            seller?.fullName || 'Unknown',
            listing.createdAt.toISOString().split('T')[0]
          ].join(',');
        }).join('\n');

        const csvContent = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="listings_${Date.now()}.csv"`);
        res.send(csvContent);
      } else {
        // Return JSON
        res.json({
          success: true,
          data: {
            listings,
            count: listings.length,
            exportedAt: new Date()
          }
        });
      }
    } catch (error) {
      console.error("Error exporting listings:", error);
      res.status(500).json({
        success: false,
        message: "Error exporting listings"
      });
    }
  }

  /**
   * Export orders to CSV
   */
  static async exportOrders(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const { format = 'csv', startDate, endDate } = req.query;

      let query: any = {};

      // If seller, only export orders where they are the seller
      if (userRole === "SELLER") {
        query.sellerId = new mongoose.Types.ObjectId(userId);
      }

      // Date filter
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate as string);
        if (endDate) query.createdAt.$lte = new Date(endDate as string);
      }

      const orders = await Order.find(query)
        .populate('listingId', 'title')
        .populate('buyerId', 'fullName email')
        .populate('sellerId', 'fullName email')
        .sort({ createdAt: -1 });

      if (format === 'csv') {
        // Generate CSV
        const csvHeader = 'Order ID,Listing,Buyer,Seller,Status,Total Amount,Created Date\n';
        const csvRows = orders.map(order => {
          const listing = order.listingId as any;
          const buyer = order.buyerId as any;
          const seller = order.sellerId as any;
          
          return [
            order._id,
            `"${listing?.title || 'Unknown'}"`,
            buyer?.fullName || 'Unknown',
            seller?.fullName || 'Unknown',
            order.status,
            order.financials.totalAmount,
            order.createdAt?.toISOString().split('T')[0] || 'Unknown'
          ].join(',');
        }).join('\n');

        const csvContent = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="orders_${Date.now()}.csv"`);
        res.send(csvContent);
      } else {
        // Return JSON
        res.json({
          success: true,
          data: {
            orders,
            count: orders.length,
            exportedAt: new Date()
          }
        });
      }
    } catch (error) {
      console.error("Error exporting orders:", error);
      res.status(500).json({
        success: false,
        message: "Error exporting orders"
      });
    }
  }
}