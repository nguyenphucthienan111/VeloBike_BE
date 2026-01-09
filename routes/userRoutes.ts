import { Router } from "express";
import { User } from "../models/User";
import { protect } from "../middleware/authMiddleware";

export const userRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile, KYC and wallet endpoints
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 */
userRoutes.get("/me", protect, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId).select("-passwordHash");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: object
 *     responses:
 *       200:
 *         description: Profile updated
 */
userRoutes.put("/me", protect, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const updates = req.body;
    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select("-passwordHash");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/users/kyc:
 *   post:
 *     summary: Submit KYC data for verification
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               documentId:
 *                 type: string
 *               documentType:
 *                 type: string
 *     responses:
 *       200:
 *         description: KYC submitted
 */
userRoutes.post("/kyc", protect, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const { documentId, documentType } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.kycData = { documentId, documentType, verifiedAt: undefined } as any;
    user.kycStatus = "PENDING" as any;
    await user.save();

    res.json({ success: true, message: "KYC submitted", data: { kycStatus: user.kycStatus } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get public profile by user id
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public user profile
 */
userRoutes.get("/:id", async (req: any, res: any) => {
  try {
    const user = await User.findById(req.params.id).select("fullName avatar reputation role");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/users/me/bank:
 *   post:
 *     summary: Add or update seller bank account for payouts
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountName:
 *                 type: string
 *               accountNumber:
 *                 type: string
 *               bankName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bank account saved
 */
userRoutes.post("/me/bank", protect, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const { accountName, accountNumber, bankName } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.bankAccount = { accountName, accountNumber, bankName } as any;
    await user.save();
    res.json({ success: true, message: "Bank account saved" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/users/me/wallet:
 *   get:
 *     summary: Get current user's wallet balance
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet info
 */
userRoutes.get("/me/wallet", protect, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId).select("wallet");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user.wallet });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default userRoutes;
