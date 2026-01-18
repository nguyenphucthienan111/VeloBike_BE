import { SubscriptionPlan, PlanType, ISubscriptionPlan } from "../models/SubscriptionPlan";
import { SellerSubscription, SubscriptionStatus, ISellerSubscription } from "../models/SellerSubscription";
import { User } from "../models/User";
import { Transaction } from "../models/Transaction";
import { Types } from "mongoose";
import { PayOS } from "@payos/node";

// Initialize PayOS with SDK (same as PaymentService)
const payOS = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || "",
  apiKey: process.env.PAYOS_API_KEY || "",
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || ""
});

// Payment link expiration time (in minutes)
const PAYMENT_LINK_EXPIRATION_MINUTES = 30;

// Default plans configuration
const DEFAULT_PLANS = [
  {
    name: PlanType.FREE,
    displayName: "Gói Miễn Phí",
    price: 0,
    commissionRate: 0.12, // 12%
    maxListingsPerMonth: 2,
    features: [
      "2 tin đăng/tháng",
      "Phí hoa hồng 12%",
      "Hỗ trợ qua chatbot",
      "Thời gian duyệt: 24-48h",
    ],
    boostPerWeek: 0,
    freeInspectionsPerMonth: 0,
    priorityLevel: 1,
    approvalTimeHours: 48,
    badge: null,
  },
  {
    name: PlanType.BASIC,
    displayName: "Gói Cơ Bản",
    price: 99000,
    commissionRate: 0.10, // 10%
    maxListingsPerMonth: 10,
    features: [
      "10 tin đăng/tháng",
      "Phí hoa hồng 10%",
      "Badge 'Verified Seller' ✓",
      "Thời gian duyệt: 12-24h",
      "Thống kê cơ bản",
    ],
    boostPerWeek: 0,
    freeInspectionsPerMonth: 0,
    priorityLevel: 2,
    approvalTimeHours: 24,
    badge: "Verified Seller ✓",
  },
  {
    name: PlanType.PRO,
    displayName: "Gói Chuyên Nghiệp",
    price: 299000,
    commissionRate: 0.08, // 8%
    maxListingsPerMonth: 30,
    features: [
      "30 tin đăng/tháng",
      "Phí hoa hồng 8%",
      "Badge 'Pro Seller' ⭐",
      "Ưu tiên hiển thị trong search",
      "Thời gian duyệt: 6-12h",
      "Analytics chi tiết",
      "1 lần boost tin/tuần miễn phí",
    ],
    boostPerWeek: 1,
    freeInspectionsPerMonth: 0,
    priorityLevel: 3,
    approvalTimeHours: 12,
    badge: "Pro Seller ⭐",
  },
  {
    name: PlanType.PREMIUM,
    displayName: "Gói Cao Cấp",
    price: 599000,
    commissionRate: 0.05, // 5%
    maxListingsPerMonth: -1, // Unlimited
    features: [
      "Không giới hạn tin đăng",
      "Phí hoa hồng 5%",
      "Badge 'Premium Seller' 👑",
      "Ưu tiên hiển thị cao nhất",
      "Duyệt tin trong 1-2h",
      "Miễn phí 2 lần kiểm định/tháng",
      "Hỗ trợ 24/7 qua hotline",
      "3 lần boost tin/tuần miễn phí",
      "Featured trên trang chủ",
    ],
    boostPerWeek: 3,
    freeInspectionsPerMonth: 2,
    priorityLevel: 4,
    approvalTimeHours: 2,
    badge: "Premium Seller 👑",
  },
];

export class SubscriptionService {
  /**
   * Initialize default subscription plans (run once on server start)
   */
  static async initializeDefaultPlans(): Promise<void> {
    for (const plan of DEFAULT_PLANS) {
      await SubscriptionPlan.findOneAndUpdate(
        { name: plan.name },
        plan,
        { upsert: true, new: true }
      );
    }
    console.log("[SUBSCRIPTION] Default plans initialized");
  }

  /**
   * Get all available plans
   */
  static async getAllPlans(): Promise<ISubscriptionPlan[]> {
    return SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });
  }

  /**
   * Get plan by type
   */
  static async getPlanByType(planType: PlanType): Promise<ISubscriptionPlan | null> {
    return SubscriptionPlan.findOne({ name: planType, isActive: true });
  }

  /**
   * Get seller's current subscription
   */
  static async getSellerSubscription(sellerId: string): Promise<ISellerSubscription | null> {
    return SellerSubscription.findOne({ sellerId });
  }

  /**
   * Create FREE subscription for new seller
   */
  static async createFreeSubscription(sellerId: string): Promise<ISellerSubscription> {
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 100); // FREE never expires

    const subscription = new SellerSubscription({
      sellerId: new Types.ObjectId(sellerId),
      planType: PlanType.FREE,
      startDate: new Date(),
      endDate,
      status: SubscriptionStatus.ACTIVE,
      autoRenew: false,
      listingsUsedThisMonth: 0,
      lastResetDate: new Date(),
    });

    await subscription.save();
    return subscription;
  }

  /**
   * Upgrade/Subscribe to a plan
   */
  static async subscribeToPlan(
    sellerId: string,
    planType: PlanType,
    transactionId: string
  ): Promise<ISellerSubscription> {
    const plan = await this.getPlanByType(planType);
    if (!plan) throw new Error("Plan not found");

    if (plan.price === 0 && planType !== PlanType.FREE) {
      throw new Error("Invalid plan");
    }

    let subscription = await this.getSellerSubscription(sellerId);
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

    if (subscription) {
      // Upgrade existing subscription
      subscription.planType = planType;
      subscription.startDate = startDate;
      subscription.endDate = planType === PlanType.FREE 
        ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) // 100 years for FREE
        : endDate;
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.listingsUsedThisMonth = 0; // Reset on upgrade
      subscription.boostsUsedThisWeek = 0;
      subscription.inspectionsUsedThisMonth = 0;
      subscription.lastResetDate = new Date();
      
      if (plan.price > 0) {
        subscription.paymentHistory.push({
          amount: plan.price,
          paidAt: new Date(),
          transactionId,
          paymentMethod: "PAYOS",
        });
      }
    } else {
      // Create new subscription
      subscription = new SellerSubscription({
        sellerId: new Types.ObjectId(sellerId),
        planType,
        startDate,
        endDate: planType === PlanType.FREE 
          ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000)
          : endDate,
        status: SubscriptionStatus.ACTIVE,
        autoRenew: planType !== PlanType.FREE,
        paymentHistory: plan.price > 0 ? [{
          amount: plan.price,
          paidAt: new Date(),
          transactionId,
          paymentMethod: "PAYOS",
        }] : [],
      });
    }

    await subscription.save();

    // Create transaction record for subscription payment
    if (plan.price > 0) {
      await Transaction.create({
        userId: sellerId,
        type: "PLATFORM_FEE",
        amount: plan.price,
        status: "COMPLETED",
        description: `Subscription: ${plan.displayName}`,
        paymentGatewayRef: transactionId,
        metadata: {
          subscriptionType: "MONTHLY",
          planType,
          planName: plan.displayName,
        },
      });
    }

    return subscription;
  }

  /**
   * Check if seller can create a new listing
   */
  static async canCreateListing(sellerId: string): Promise<{
    canCreate: boolean;
    reason?: string;
    used: number;
    limit: number;
    planType: PlanType;
  }> {
    let subscription = await this.getSellerSubscription(sellerId);
    
    // Auto-create FREE subscription if not exists
    if (!subscription) {
      subscription = await this.createFreeSubscription(sellerId);
    }

    // Check if subscription is active
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return {
        canCreate: false,
        reason: "Subscription không còn hiệu lực",
        used: subscription.listingsUsedThisMonth,
        limit: 0,
        planType: subscription.planType,
      };
    }

    // Reset monthly quota if needed
    await this.resetMonthlyQuotaIfNeeded(subscription);

    const plan = await this.getPlanByType(subscription.planType);
    if (!plan) {
      return {
        canCreate: false,
        reason: "Plan không tồn tại",
        used: 0,
        limit: 0,
        planType: subscription.planType,
      };
    }

    // Unlimited listings
    if (plan.maxListingsPerMonth === -1) {
      return {
        canCreate: true,
        used: subscription.listingsUsedThisMonth,
        limit: -1,
        planType: subscription.planType,
      };
    }

    // Check quota
    if (subscription.listingsUsedThisMonth >= plan.maxListingsPerMonth) {
      return {
        canCreate: false,
        reason: `Bạn đã sử dụng hết ${plan.maxListingsPerMonth} tin đăng trong tháng. Nâng cấp gói để đăng thêm!`,
        used: subscription.listingsUsedThisMonth,
        limit: plan.maxListingsPerMonth,
        planType: subscription.planType,
      };
    }

    return {
      canCreate: true,
      used: subscription.listingsUsedThisMonth,
      limit: plan.maxListingsPerMonth,
      planType: subscription.planType,
    };
  }

  /**
   * Increment listing count when seller creates a listing
   */
  static async incrementListingCount(sellerId: string): Promise<void> {
    await SellerSubscription.findOneAndUpdate(
      { sellerId },
      { $inc: { listingsUsedThisMonth: 1 } }
    );
  }

  /**
   * Get commission rate for seller
   */
  static async getCommissionRate(sellerId: string): Promise<number> {
    const subscription = await this.getSellerSubscription(sellerId);
    if (!subscription) return 0.12; // Default 12%

    const plan = await this.getPlanByType(subscription.planType);
    return plan?.commissionRate || 0.12;
  }

  /**
   * Reset monthly quota if new month
   */
  private static async resetMonthlyQuotaIfNeeded(subscription: ISellerSubscription): Promise<void> {
    const now = new Date();
    const lastReset = new Date(subscription.lastResetDate);
    
    // Check if it's a new month
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      subscription.listingsUsedThisMonth = 0;
      subscription.inspectionsUsedThisMonth = 0;
      subscription.lastResetDate = now;
      await subscription.save();
    }
  }

  /**
   * Reset weekly boost quota
   */
  static async resetWeeklyBoostIfNeeded(subscription: ISellerSubscription): Promise<void> {
    const now = new Date();
    const lastReset = new Date(subscription.lastResetDate);
    
    // Simple weekly check (every 7 days from last reset)
    const daysDiff = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff >= 7) {
      subscription.boostsUsedThisWeek = 0;
      await subscription.save();
    }
  }

  /**
   * Check and expire subscriptions (run daily via cron)
   */
  static async checkExpiredSubscriptions(): Promise<number> {
    const result = await SellerSubscription.updateMany(
      {
        status: SubscriptionStatus.ACTIVE,
        endDate: { $lt: new Date() },
        planType: { $ne: PlanType.FREE }, // FREE never expires
      },
      {
        $set: { status: SubscriptionStatus.EXPIRED },
      }
    );

    // Downgrade expired subscriptions to FREE
    const expiredSubs = await SellerSubscription.find({
      status: SubscriptionStatus.EXPIRED,
    });

    for (const sub of expiredSubs) {
      sub.planType = PlanType.FREE;
      sub.status = SubscriptionStatus.ACTIVE;
      sub.endDate = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
      sub.listingsUsedThisMonth = 0;
      await sub.save();
    }

    return result.modifiedCount;
  }

  /**
   * Get subscription statistics for admin
   */
  static async getSubscriptionStats(): Promise<{
    totalSubscribers: number;
    byPlan: Record<string, number>;
    monthlyRevenue: number;
  }> {
    const stats = await SellerSubscription.aggregate([
      { $match: { status: SubscriptionStatus.ACTIVE } },
      {
        $group: {
          _id: "$planType",
          count: { $sum: 1 },
        },
      },
    ]);

    const byPlan: Record<string, number> = {};
    let totalSubscribers = 0;
    
    for (const stat of stats) {
      byPlan[stat._id] = stat.count;
      totalSubscribers += stat.count;
    }

    // Calculate monthly revenue
    const plans = await this.getAllPlans();
    let monthlyRevenue = 0;
    for (const plan of plans) {
      const count = byPlan[plan.name] || 0;
      monthlyRevenue += count * plan.price;
    }

    return { totalSubscribers, byPlan, monthlyRevenue };
  }

  /**
   * Create payment link for subscription using PayOS SDK
   */
  static async createPaymentLink(
    userId: string,
    planType: PlanType,
    user: any
  ): Promise<{ paymentLink: string; orderCode: number }> {
    try {
      const plan = await this.getPlanByType(planType);
      if (!plan) throw new Error("Plan not found");

      const orderCode = Number(String(Date.now()).slice(-6));

      // Set expiration time (default: 30 minutes from now)
      const expiredAt = Math.floor(Date.now() / 1000) + (PAYMENT_LINK_EXPIRATION_MINUTES * 60);

      const paymentData = {
        orderCode,
        amount: plan.price,
        description: `VeloBike #${orderCode}`,
        buyerName: user.fullName || "User",
        buyerEmail: user.email || "",
        buyerPhone: user.phone || "",
        buyerAddress: user.address?.street || "",
        items: [
          {
            name: plan.displayName,
            quantity: 1,
            price: plan.price,
          },
        ],
        expiredAt, // Payment link expires after configured minutes
        returnUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/subscription/success`,
        cancelUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/subscription/cancel`,
      };

      // Use PayOS SDK to create payment link
      const paymentLinkResponse = await payOS.paymentRequests.create(paymentData);

      if (!paymentLinkResponse?.checkoutUrl) {
        throw new Error("Failed to create payment link");
      }

      // Store orderCode mapping for webhook lookup
      // Update or create subscription with pending payment info
      let subscription = await SellerSubscription.findOne({ sellerId: new Types.ObjectId(userId) });
      
      if (subscription) {
        // Update existing subscription with pending payment
        subscription.pendingPayment = {
          orderCode,
          planType,
          createdAt: new Date(),
        };
        await subscription.save();
      } else {
        // Create new subscription with FREE plan and pending payment
        subscription = await this.createFreeSubscription(userId);
        subscription.pendingPayment = {
          orderCode,
          planType,
          createdAt: new Date(),
        };
        await subscription.save();
      }

      console.log(`Subscription payment link created: orderCode=${orderCode}, userId=${userId}, planType=${planType}`);

      return { 
        paymentLink: paymentLinkResponse.checkoutUrl, 
        orderCode 
      };
    } catch (err: any) {
      console.error("PayOS subscription payment link error:", err.message);
      throw new Error(`Payment link creation failed: ${err.message}`);
    }
  }

  /**
   * Handle webhook from PayOS for subscription payment
   */
  static async handleSubscriptionWebhook(webhookData: any): Promise<void> {
    try {
      const { orderCode, code, data } = webhookData;

      console.log(`Subscription webhook received: orderCode=${orderCode}, code=${code}`);

      // PayOS success code
      if (code !== "00" && code !== "00000") {
        console.log(`Subscription payment not successful: code=${code}`);
        return;
      }

      if (data?.status !== "PAID") {
        console.log(`Subscription payment status not PAID: ${data?.status}`);
        return;
      }

      // Find subscription with pending payment matching this orderCode
      const subscription = await SellerSubscription.findOne({
        "pendingPayment.orderCode": orderCode,
      });

      if (!subscription) {
        console.warn(`No subscription found with pending orderCode: ${orderCode}`);
        return;
      }

      const { planType, sellerId } = subscription;
      const pendingPlanType = (subscription as any).pendingPayment?.planType;

      if (!pendingPlanType) {
        console.warn(`No pending planType found for orderCode: ${orderCode}`);
        return;
      }

      // Activate subscription
      await this.subscribeToPlan(
        sellerId.toString(),
        pendingPlanType as PlanType,
        data.transactionId || `payos_${orderCode}`
      );

      // Clear pending payment
      await SellerSubscription.findOneAndUpdate(
        { sellerId },
        { $unset: { pendingPayment: "" } }
      );

      console.log(`Subscription activated via webhook: userId=${sellerId}, planType=${pendingPlanType}`);
    } catch (err: any) {
      console.error("Subscription webhook processing error:", err);
      throw err;
    }
  }
}
