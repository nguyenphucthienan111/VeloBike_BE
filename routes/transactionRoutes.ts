import { Router } from "express";
import { TransactionController } from "../controllers/TransactionController";
import { protect, requireRole } from "../middleware/authMiddleware";
import { UserRole } from "../models/User";

export const transactionRoutes = Router();

/**
 * @swagger
 * /api/transactions/my-transactions:
 *   get:
 *     summary: Get user's transaction history
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [DEPOSIT, WITHDRAW, PAYMENT_HOLD, PAYMENT_RELEASE, REFUND, PLATFORM_FEE, INSPECTION_FEE]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, COMPLETED, FAILED, CANCELLED]
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 */
transactionRoutes.get("/my-transactions", protect, TransactionController.getMyTransactions as any);

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction details
 *       404:
 *         description: Transaction not found
 */
transactionRoutes.get("/:id", protect, TransactionController.getById as any);

/**
 * @swagger
 * /api/transactions/stats:
 *   get:
 *     summary: Get user's transaction statistics
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Transaction statistics
 */
transactionRoutes.get("/stats", protect, TransactionController.getTransactionStats as any);

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Create transaction (Internal use)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - type
 *               - amount
 *               - description
 *             properties:
 *               userId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [DEPOSIT, WITHDRAW, PAYMENT_HOLD, PAYMENT_RELEASE, REFUND, PLATFORM_FEE, INSPECTION_FEE]
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               relatedOrderId:
 *                 type: string
 *               relatedInspectionId:
 *                 type: string
 *               paymentGatewayRef:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transaction created successfully
 */
transactionRoutes.post("/", protect, requireRole(UserRole.ADMIN), TransactionController.createTransaction as any);

/**
 * @swagger
 * /api/transactions/{id}/status:
 *   put:
 *     summary: Update transaction status (Internal use)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, COMPLETED, FAILED, CANCELLED]
 *               paymentGatewayRef:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Transaction status updated
 */
transactionRoutes.put("/:id/status", protect, requireRole(UserRole.ADMIN), TransactionController.updateTransactionStatus as any);

/**
 * @swagger
 * /api/admin/transactions:
 *   get:
 *     summary: Get all transactions (Admin only)
 *     tags: [Admin, Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: All transactions retrieved successfully
 */
transactionRoutes.get("/admin/transactions", protect, requireRole(UserRole.ADMIN), TransactionController.getAllTransactions as any);