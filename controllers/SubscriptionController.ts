import { Request, Response } from "express";
import { SubscriptionService } from "../services/SubscriptionService";
import { PlanType } from "../models/SubscriptionPlan";
import { User, UserRole } from "../models/User";

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

      // Get user info for PayOS
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Create payment link using PayOS (same as PaymentService)
      const result = await SubscriptionService.createPaymentLink(
        userId,
        planType as PlanType,
        user
      );
      
      res.json({
        success: true,
        data: {
          planType,
          planName: plan.displayName,
          amount: plan.price,
          orderCode: result.orderCode,
          paymentLink: result.paymentLink,
          message: "Sau khi thanh toán, gọi POST /api/subscriptions/subscribe với orderCode làm transactionId",
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

  /**
   * POST /api/subscriptions/verify-payment
   * Called from FE success page to verify PayOS payment and activate subscription
   */
  static async verifyPayment(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { orderCode } = req.body;
      if (!orderCode) {
        return res.status(400).json({ success: false, message: "orderCode is required" });
      }

      // Verify payment with PayOS first
      const { PaymentService } = await import("../services/PaymentService");
      let payosStatus: string | null = null;
      try {
        const info = await PaymentService.getPaymentInfo(Number(orderCode));
        payosStatus = info?.status || null;
      } catch (e) {
        console.warn("Could not fetch PayOS info:", e);
      }

      if (payosStatus && payosStatus !== "PAID") {
        return res.status(400).json({ success: false, message: `Payment not completed. Status: ${payosStatus}` });
      }

      const result = await SubscriptionService.verifyAndActivate(Number(orderCode), userId);

      if (!result.success) {
        return res.status(400).json({ success: false, message: "Could not activate subscription. Payment may still be processing." });
      }

      res.json({ success: true, message: `Subscription activated!`, data: { planName: result.planName } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/subscriptions/test-payment-success
   * TEST ONLY: Simulate successful payment without actual payment
   */
  static async testPaymentSuccess(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { orderCode, planType } = req.body;

      if (!orderCode) {
        return res.status(400).json({ 
          success: false, 
          message: "orderCode is required" 
        });
      }

      if (!planType || !Object.values(PlanType).includes(planType)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid plan type" 
        });
      }

      // Simulate payment success - directly subscribe
      const subscription = await SubscriptionService.subscribeToPlan(
        userId,
        planType as PlanType,
        `test_${orderCode}`
      );

      const plan = await SubscriptionService.getPlanByType(planType as PlanType);

      res.json({
        success: true,
        message: `[TEST MODE] Đăng ký ${plan?.displayName} thành công!`,
        data: { 
          subscription, 
          plan,
          note: "This is a test payment - no actual money was charged"
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/subscriptions/webhook
   * Handle PayOS webhook for subscription payment
   */
  static async handleWebhook(req: Request, res: Response) {
    try {
      // Validate signature header if provided
      const signatureHeader = (req.headers["x-payos-signature"] ||
        req.headers["x-signature"] ||
        req.headers["signature"]) as string | undefined;

      if (signatureHeader) {
        // Import PaymentService for signature verification
        const { PaymentService } = await import("../services/PaymentService");
        const valid = PaymentService.verifyWebhookSignature(
          req.body,
          signatureHeader
        );
        if (!valid) {
          console.warn("Invalid subscription webhook signature");
          return res
            .status(403)
            .json({ success: false, message: "Invalid signature" });
        }
      }

      // Process webhook
      await SubscriptionService.handleSubscriptionWebhook(req.body);

      res.json({ success: true, message: "Webhook processed" });
    } catch (error: any) {
      console.error("Subscription Webhook Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
