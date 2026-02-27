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
 *     summary: Submit KYC data for verification (Deprecated - use /api/auth/kyc-submit instead)
 *     tags: [Users]
 *     deprecated: true
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
 *         description: KYC submitted - Redirects to /api/auth/kyc-submit
 */
userRoutes.post("/kyc", protect, async (req: any, res: any) => {
  // Redirect to main KYC endpoint to avoid duplicate logic
  res.status(301).json({ 
    success: false, 
    message: "This endpoint is deprecated. Please use POST /api/auth/kyc-submit instead" 
  });
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

/**
 * @swagger
 * /api/users/me/upgrade-to-seller:
 *   post:
 *     summary: Upgrade account from BUYER to SELLER (requires KYC verification)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully upgraded to SELLER
 *       400:
 *         description: KYC not verified or already a SELLER
 *       404:
 *         description: User not found
 */
userRoutes.post("/me/upgrade-to-seller", protect, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if already a SELLER
    if (user.role === "SELLER") {
      return res.status(400).json({
        success: false,
        message: "You are already a SELLER"
      });
    }

    // Check if KYC is verified
    if (user.kycStatus !== "VERIFIED") {
      return res.status(400).json({
        success: false,
        message: "KYC verification required. Please complete KYC verification first at /api/kyc/submit"
      });
    }

    // Upgrade to SELLER
    user.role = "SELLER";
    await user.save();

    // Create FREE subscription for new seller (only if not exists)
    const { SubscriptionService } = require("../services/SubscriptionService");
    const existingSubscription = await SubscriptionService.getSellerSubscription(userId);
    
    if (!existingSubscription) {
      await SubscriptionService.createFreeSubscription(userId);
    }

    res.json({
      success: true,
      message: "Successfully upgraded to SELLER! You can now create listings.",
      data: {
        role: user.role,
        kycStatus: user.kycStatus,
        subscription: existingSubscription ? "Already exists" : "Created FREE subscription"
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default userRoutes;
