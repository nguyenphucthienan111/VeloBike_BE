import { Listing, ListingStatus } from "../models/Listing";
import { SubscriptionService } from "./SubscriptionService";
import { NotificationService } from "./NotificationService";

/**
 * AutoApprovalService
 * Runs on a cron interval and auto-approves PENDING_APPROVAL listings
 * that have exceeded their plan's approvalTimeHours without admin action.
 *
 * Approval time per plan:
 *   FREE    → 48h
 *   BASIC   → 24h
 *   PRO     → 12h
 *   PREMIUM → 2h
 */
export class AutoApprovalService {
  // Check every 15 minutes
  private static readonly INTERVAL_MS = 15 * 60 * 1000;

  static startCron(): void {
    // Run once immediately on startup, then on interval
    this.run().catch(console.error);
    setInterval(() => this.run().catch(console.error), this.INTERVAL_MS);
    console.log("[AUTO-APPROVAL] Cron started (interval: 15 min)");
  }

  static async run(): Promise<number> {
    try {
      const pending = await Listing.find({ status: ListingStatus.PENDING_APPROVAL }).lean();
      if (pending.length === 0) return 0;

      let approved = 0;
      const now = Date.now();

      for (const listing of pending) {
        const sellerId = listing.sellerId?.toString();
        if (!sellerId) continue;

        // Get seller's approval time from their subscription plan
        const approvalHours = await this.getApprovalHours(sellerId);
        const deadlineMs = approvalHours * 60 * 60 * 1000;

        // Use submittedAt if available, fall back to createdAt
        const submittedAt = ((listing as any).submittedAt || (listing as any).createdAt) as Date;
        const elapsed = now - new Date(submittedAt).getTime();

        if (elapsed >= deadlineMs) {
          await Listing.findByIdAndUpdate(listing._id, {
            status: ListingStatus.PUBLISHED,
            autoApprovedAt: new Date(),
          });

          // Notify seller
          await NotificationService.sendNotification(
            sellerId,
            "Listing Auto-Approved",
            `Your listing "${listing.title}" has been automatically approved and is now live on the marketplace.`,
            { listingId: listing._id }
          ).catch(() => {}); // Don't let notification failure break the loop

          approved++;
          console.log(
            `[AUTO-APPROVAL] Approved listing ${listing._id} (seller ${sellerId}, plan deadline ${approvalHours}h)`
          );
        }
      }

      if (approved > 0) {
        console.log(`[AUTO-APPROVAL] Auto-approved ${approved} listing(s)`);
      }

      return approved;
    } catch (err) {
      console.error("[AUTO-APPROVAL] Error during run:", err);
      return 0;
    }
  }

  private static async getApprovalHours(sellerId: string): Promise<number> {
    try {
      const subscription = await SubscriptionService.getSellerSubscription(sellerId);
      if (!subscription) return 48;
      const plan = await SubscriptionService.getPlanByType(subscription.planType);
      return plan?.approvalTimeHours ?? 48;
    } catch {
      return 48; // Safe default
    }
  }
}
