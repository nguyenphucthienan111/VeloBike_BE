import { Request, Response } from "express";
import { SubscriptionService } from "../services/SubscriptionService";
import { PlanType } from "../models/SubscriptionPlan";
import { UserRole } from "../models/User";

export class SubscriptionController {
  /**
   * GET /api/subscriptions/plans
   * Get all available subscription plans
   */
  static async getAllPlans(req: Request, res: Response) {
    try {
      const plans = await SubscriptionService.getAllPlans();
      res.json({ success: true, data: plans });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/subscriptions/my-subscription
   * Get current seller's subscription
   */
  static async getMySubscription(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      let subscription = await SubscriptionService.getSellerSubscription(userId);
      
      // Auto-create FREE subscription if not exists
      if (!subscription) {
        subscription = await SubscriptionService.createFreeSubscription(userId);
      }

      const plan = await SubscriptionService.getPlanByType(subscription.planType);
      const canCreate = await SubscriptionService.canCreateListing(userId);

      res.json({
        success: true,
        data: {
          subscription,
          plan,
          usage: {
            listings: {
              used: canCreate.used,
              limit: canCreate.limit,
              canCreate: canCreate.canCreate,
            },
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/subscriptions/subscribe
   * Subscribe to a plan (upgrade)
   */
  static async subscribe(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { planType, transactionId } = req.body;

      if (!planType || !Object.values(PlanType).includes(planType)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid plan type. Valid types: FREE, BASIC, PRO, PREMIUM" 
        });
      }

      // FREE plan doesn't need payment
      if (planType !== PlanType.FREE && !transactionId) {
        return res.status(400).json({ 
          success: false, 
          message: "Transaction ID required for paid plans" 
        });
      }

      const subscription = await SubscriptionService.subscribeToPlan(
        userId,
        planType as PlanType,
        transactionId || "free_plan"
      );

      const plan = await SubscriptionService.getPlanByType(planType as PlanType);

      res.json({
        success: true,
        message: `Đăng ký ${plan?.displayName} thành công!`,
        data: { subscription, plan },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/subscriptions/check-quota
   * Check if seller can create a new listing
   */
  static async checkQuota(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const result = await SubscriptionService.canCreateListing(userId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/subscriptions/create-payment-link
   * Create payment link for subscription
   */
  static async createPaymentLink(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { planType } = req.body;

      if (!planType || !Object.values(PlanType).includes(planType)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid plan type" 
        });
      }

      if (planType === PlanType.FREE) {
        return res.status(400).json({ 
          success: false, 
          message: "FREE plan doesn't require payment" 
        });
      }

      const plan = await SubscriptionService.getPlanByType(planType as PlanType);
      if (!plan) {
        return res.status(404).json({ success: false, message: "Plan not found" });
      }

      // TODO: Integrate with PayOS to create payment link
      // For now, return mock payment info
      const orderCode = Math.floor(Math.random() * 1000000);
      
      res.json({
        success: true,
        data: {
          planType,
          planName: plan.displayName,
          amount: plan.price,
          orderCode,
          // In production, this would be a real PayOS payment link
          paymentLink: `https://pay.payos.vn/web/${orderCode}`,
          message: "Sau khi thanh toán, gọi POST /api/subscriptions/subscribe với transactionId",
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/admin/subscriptions/stats
   * Get subscription statistics (Admin only)
   */
  static async getStats(req: any, res: Response) {
    try {
      if (req.user?.role !== UserRole.ADMIN) {
        return res.status(403).json({ success: false, message: "Admin only" });
      }

      const stats = await SubscriptionService.getSubscriptionStats();
      const plans = await SubscriptionService.getAllPlans();

      res.json({
        success: true,
        data: {
          ...stats,
          plans,
          estimatedAnnualRevenue: stats.monthlyRevenue * 12,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/admin/subscriptions/plans/:planType
   * Update a subscription plan (Admin only)
   */
  static async updatePlan(req: any, res: Response) {
    try {
      if (req.user?.role !== UserRole.ADMIN) {
        return res.status(403).json({ success: false, message: "Admin only" });
      }

      const { planType } = req.params;
      const updates = req.body;

      // Don't allow changing plan name
      delete updates.name;

      const { SubscriptionPlan } = await import("../models/SubscriptionPlan");
      const plan = await SubscriptionPlan.findOneAndUpdate(
        { name: planType },
        { $set: updates },
        { new: true }
      );

      if (!plan) {
        return res.status(404).json({ success: false, message: "Plan not found" });
      }

      res.json({ success: true, data: plan });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
