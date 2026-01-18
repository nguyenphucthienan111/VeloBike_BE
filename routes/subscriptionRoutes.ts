import { Router } from "express";
import { SubscriptionController } from "../controllers/SubscriptionController";
import { protect } from "../middleware/authMiddleware";

export const subscriptionRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Seller subscription plans management
 */

/**
 * @swagger
 * /api/subscriptions/plans:
 *   get:
 *     summary: Get all available subscription plans
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: List of subscription plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         enum: [FREE, BASIC, PRO, PREMIUM]
 *                       displayName:
 *                         type: string
 *                       price:
 *                         type: number
 *                       commissionRate:
 *                         type: number
 *                       maxListingsPerMonth:
 *                         type: number
 *                       features:
 *                         type: array
 *                         items:
 *                           type: string
 */
subscriptionRoutes.get("/plans", SubscriptionController.getAllPlans);

/**
 * @swagger
 * /api/subscriptions/my-subscription:
 *   get:
 *     summary: Get current seller's subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription details
 */
subscriptionRoutes.get("/my-subscription", protect, SubscriptionController.getMySubscription as any);

/**
 * @swagger
 * /api/subscriptions/check-quota:
 *   get:
 *     summary: Check if seller can create a new listing
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quota check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     canCreate:
 *                       type: boolean
 *                     reason:
 *                       type: string
 *                     used:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     planType:
 *                       type: string
 */
subscriptionRoutes.get("/check-quota", protect, SubscriptionController.checkQuota as any);

/**
 * @swagger
 * /api/subscriptions/create-payment-link:
 *   post:
 *     summary: Create payment link for subscription upgrade
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planType
 *             properties:
 *               planType:
 *                 type: string
 *                 enum: [BASIC, PRO, PREMIUM]
 *     responses:
 *       200:
 *         description: Payment link created
 */
subscriptionRoutes.post("/create-payment-link", protect, SubscriptionController.createPaymentLink as any);

/**
 * @swagger
 * /api/subscriptions/subscribe:
 *   post:
 *     summary: Subscribe to a plan (after payment)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planType
 *             properties:
 *               planType:
 *                 type: string
 *                 enum: [FREE, BASIC, PRO, PREMIUM]
 *               transactionId:
 *                 type: string
 *                 description: Required for paid plans
 *     responses:
 *       200:
 *         description: Subscription successful
 */
subscriptionRoutes.post("/subscribe", protect, SubscriptionController.subscribe as any);

/**
 * @swagger
 * /api/subscriptions/test-payment-success:
 *   post:
 *     summary: TEST ONLY - Simulate successful payment without actual payment
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderCode
 *               - planType
 *             properties:
 *               orderCode:
 *                 type: number
 *                 description: The orderCode from create-payment-link
 *               planType:
 *                 type: string
 *                 enum: [BASIC, PRO, PREMIUM]
 *     responses:
 *       200:
 *         description: Test payment successful
 */
subscriptionRoutes.post("/test-payment-success", protect, SubscriptionController.testPaymentSuccess as any);

/**
 * @swagger
 * /api/subscriptions/webhook:
 *   post:
 *     summary: Handle PayOS webhook for subscription payment
 *     tags: [Subscriptions]
 *     description: This endpoint is called by PayOS when a subscription payment is completed
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       403:
 *         description: Invalid signature
 */
subscriptionRoutes.post("/webhook", SubscriptionController.handleWebhook);

/**
 * @swagger
 * /api/admin/subscriptions/stats:
 *   get:
 *     summary: Get subscription statistics (Admin only)
 *     tags: [Subscriptions, Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription statistics
 */
subscriptionRoutes.get("/admin/stats", protect, SubscriptionController.getStats as any);

/**
 * @swagger
 * /api/admin/subscriptions/plans/{planType}:
 *   put:
 *     summary: Update a subscription plan (Admin only)
 *     tags: [Subscriptions, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [FREE, BASIC, PRO, PREMIUM]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               price:
 *                 type: number
 *               commissionRate:
 *                 type: number
 *               maxListingsPerMonth:
 *                 type: number
 *     responses:
 *       200:
 *         description: Plan updated
 */
subscriptionRoutes.put("/admin/plans/:planType", protect, SubscriptionController.updatePlan as any);
