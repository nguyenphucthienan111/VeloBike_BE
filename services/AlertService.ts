import { PriceAlert } from "../models/PriceAlert";
import { SavedSearch } from "../models/SavedSearch";
import { Listing, ListingStatus } from "../models/Listing";
import { NotificationService } from "./NotificationService";
import mongoose from "mongoose";

export class AlertService {
  /**
   * Process price alerts - check if any listings have dropped to target price
   */
  static async processPriceAlerts(): Promise<void> {
    try {
      console.log("Processing price alerts...");

      // Get all active price alerts
      const activeAlerts = await PriceAlert.find({
        isActive: true,
        triggered: false
      }).populate('listingId userId');

      let triggeredCount = 0;

      for (const alert of activeAlerts) {
        const listing = alert.listingId as any;
        
        if (!listing || listing.status !== ListingStatus.PUBLISHED) {
          // Listing no longer available, deactivate alert
          alert.isActive = false;
          await alert.save();
          continue;
        }

        const currentPrice = listing.pricing.amount;
        
        // Update current price
        alert.currentPrice = currentPrice;

        // Check if target price is reached
        if (currentPrice <= alert.targetPrice) {
          // Trigger alert
          alert.triggered = true;
          alert.triggeredAt = new Date();
          await alert.save();

          // Send notification
          await NotificationService.sendNotification(
            alert.userId.toString(),
            "Price Alert Triggered! 🎯",
            `The bike "${listing.title}" has dropped to ${currentPrice.toLocaleString('vi-VN')} VND (your target: ${alert.targetPrice.toLocaleString('vi-VN')} VND)`,
            {
              type: "PRICE_ALERT",
              listingId: listing._id.toString(),
              alertId: alert._id.toString()
            }
          );

          triggeredCount++;
        } else {
          // Just update the current price
          await alert.save();
        }
      }

      console.log(`Price alerts processed: ${triggeredCount} alerts triggered`);
    } catch (error) {
      console.error("Error processing price alerts:", error);
    }
  }

  /**
   * Process saved search alerts - notify users of new listings matching their searches
   */
  static async processSavedSearchAlerts(): Promise<void> {
    try {
      console.log("Processing saved search alerts...");

      // Get saved searches with alerts enabled
      const savedSearches = await SavedSearch.find({
        alertsEnabled: true
      }).populate('userId');

      let notificationsSent = 0;

      for (const search of savedSearches) {
        // Check for new listings since last notification
        const lastNotified = search.lastNotified || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to 24h ago
        
        const newListings = await Listing.find({
          ...search.query,
          status: ListingStatus.PUBLISHED,
          createdAt: { $gt: lastNotified }
        }).limit(10); // Limit to prevent spam

        if (newListings.length > 0) {
          // Send notification about new matches
          const message = newListings.length === 1 
            ? `New bike matches your saved search "${search.name}": ${newListings[0].title}`
            : `${newListings.length} new bikes match your saved search "${search.name}"`;

          await NotificationService.sendNotification(
            search.userId.toString(),
            "New Search Results! 🔍",
            message,
            {
              type: "SAVED_SEARCH_ALERT",
              searchId: search._id.toString(),
              newListingsCount: newListings.length,
              listings: newListings.slice(0, 3).map(l => ({ // Send top 3
                id: l._id.toString(),
                title: l.title,
                price: l.pricing.amount
              }))
            }
          );

          // Update last notified timestamp
          search.lastNotified = new Date();
          search.resultsCount = await Listing.countDocuments({
            ...search.query,
            status: ListingStatus.PUBLISHED
          });
          await search.save();

          notificationsSent++;
        }
      }

      console.log(`Saved search alerts processed: ${notificationsSent} notifications sent`);
    } catch (error) {
      console.error("Error processing saved search alerts:", error);
    }
  }

  /**
   * Clean up old triggered alerts and inactive searches
   */
  static async cleanupAlerts(): Promise<void> {
    try {
      console.log("Cleaning up old alerts...");

      // Remove triggered price alerts older than 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const deletedPriceAlerts = await PriceAlert.deleteMany({
        triggered: true,
        triggeredAt: { $lt: thirtyDaysAgo }
      });

      // Deactivate price alerts for sold/removed listings
      const inactiveListings = await Listing.find({
        status: { $in: [ListingStatus.SOLD, "REMOVED"] }
      }).select('_id');

      const inactiveListingIds = inactiveListings.map(l => l._id);
      
      const deactivatedAlerts = await PriceAlert.updateMany(
        {
          listingId: { $in: inactiveListingIds },
          isActive: true
        },
        {
          isActive: false
        }
      );

      console.log(`Cleanup completed: ${deletedPriceAlerts.deletedCount} old alerts deleted, ${deactivatedAlerts.modifiedCount} alerts deactivated`);
    } catch (error) {
      console.error("Error cleaning up alerts:", error);
    }
  }

  /**
   * Get alert statistics for admin dashboard
   */
  static async getAlertStats(): Promise<any> {
    try {
      const [priceAlertStats, savedSearchStats] = await Promise.all([
        PriceAlert.aggregate([
          {
            $group: {
              _id: null,
              totalAlerts: { $sum: 1 },
              activeAlerts: { $sum: { $cond: ["$isActive", 1, 0] } },
              triggeredAlerts: { $sum: { $cond: ["$triggered", 1, 0] } }
            }
          }
        ]),
        SavedSearch.aggregate([
          {
            $group: {
              _id: null,
              totalSearches: { $sum: 1 },
              alertsEnabled: { $sum: { $cond: ["$alertsEnabled", 1, 0] } }
            }
          }
        ])
      ]);

      return {
        priceAlerts: priceAlertStats[0] || { totalAlerts: 0, activeAlerts: 0, triggeredAlerts: 0 },
        savedSearches: savedSearchStats[0] || { totalSearches: 0, alertsEnabled: 0 }
      };
    } catch (error) {
      console.error("Error getting alert stats:", error);
      return null;
    }
  }

  /**
   * Start alert processing cron job (call this from app startup)
   */
  static startAlertProcessing(): void {
    // Process price alerts every 30 minutes
    setInterval(async () => {
      await this.processPriceAlerts();
    }, 30 * 60 * 1000);

    // Process saved search alerts every 2 hours
    setInterval(async () => {
      await this.processSavedSearchAlerts();
    }, 2 * 60 * 60 * 1000);

    // Cleanup old alerts daily
    setInterval(async () => {
      await this.cleanupAlerts();
    }, 24 * 60 * 60 * 1000);

    console.log("Alert processing cron jobs started");
  }
}