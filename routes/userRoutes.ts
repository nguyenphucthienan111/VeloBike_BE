import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { User, UserRole } from "../models/User";
import { InspectorApplication } from "../models/InspectorApplication";
import { InspectorReview } from "../models/InspectorReview";
import mongoose from "mongoose";
import { protect } from "../middleware/authMiddleware";

export const userRoutes = Router();

const upload = multer({ dest: "uploads/" });

const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

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
 * /api/users/inspectors/{id}/profile:
 *   get:
 *     summary: Get public profile of an inspector (bio, certs, rating stats)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inspector public profile
 */
/**
 * @swagger
 * /api/users/inspectors:
 *   get:
 *     summary: List all active inspectors (public)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: specialization
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of inspectors with basic info
 */
userRoutes.get("/inspectors", async (req: any, res: any) => {
  try {
    const inspectors = await User.find({ role: UserRole.INSPECTOR, isActive: true })
      .select("fullName avatar reputation address createdAt inspectorProfile")
      .sort({ "reputation.score": -1 });

    // Attach application data as fallback (bio, specializations, yearsOfExperience)
    const ids = inspectors.map(u => u._id);
    const applications = await InspectorApplication.find({ userId: { $in: ids }, status: "APPROVED" })
      .select("userId bio yearsOfExperience specializations");

    const appMap = new Map(applications.map(a => [a.userId.toString(), a]));

    const data = inspectors.map(u => {
      const app = appMap.get(u._id.toString());
      const ip = (u as any).inspectorProfile;
      return {
        _id: u._id,
        fullName: u.fullName,
        avatar: u.avatar,
        address: u.address,
        reputation: u.reputation,
        bio: ip?.bio || app?.bio || '',
        yearsOfExperience: ip?.yearsOfExperience ?? app?.yearsOfExperience ?? 0,
        specializations: ip?.specializations?.length ? ip.specializations : (app?.specializations || []),
      };
    });

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

userRoutes.get("/inspectors/:id/profile", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("fullName avatar reputation role address phone createdAt inspectorProfile");
    if (!user || user.role !== UserRole.INSPECTOR) {
      return res.status(404).json({ success: false, message: "Inspector not found" });
    }

    // Fallback: lấy application đã APPROVED nếu inspectorProfile chưa có data
    const application = await InspectorApplication.findOne({ userId: id, status: "APPROVED" })
      .select("bio yearsOfExperience specializations certificates phone");

    const ip = user.inspectorProfile;
    const bio = ip?.bio || application?.bio || "";
    const yearsOfExperience = ip?.yearsOfExperience ?? application?.yearsOfExperience ?? 0;
    const specializations = (ip?.specializations?.length ? ip.specializations : application?.specializations) || [];
    const certificates = (ip?.certificates?.length ? ip.certificates : application?.certificates) || [];

    // Aggregate review stats
    const categoryStats = await InspectorReview.aggregate([
      { $match: { inspectorId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          avgProfessionalism: { $avg: "$categories.professionalism" },
          avgAccuracy: { $avg: "$categories.accuracy" },
          avgCommunication: { $avg: "$categories.communication" },
          avgTimeliness: { $avg: "$categories.timeliness" },
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = categoryStats[0] || {
      avgRating: 0, avgProfessionalism: 0, avgAccuracy: 0,
      avgCommunication: 0, avgTimeliness: 0, count: 0,
    };

    // Lấy 5 review gần nhất
    const recentReviews = await InspectorReview.find({ inspectorId: id })
      .populate("reviewerId", "fullName avatar")
      .sort({ createdAt: -1 })
      .limit(5)
      .select("rating comment reviewerRole categories createdAt reviewerId");

    res.json({
      success: true,
      data: {
        _id: user._id,
        fullName: user.fullName,
        avatar: user.avatar,
        address: user.address,
        memberSince: user.createdAt,
        bio,
        yearsOfExperience,
        specializations,
        certificates,
        reputation: {
          score: Math.round((stats.avgRating || user.reputation?.score || 5) * 10) / 10,
          reviewCount: stats.count || user.reputation?.reviewCount || 0,
          categories: {
            professionalism: Math.round((stats.avgProfessionalism || 0) * 10) / 10,
            accuracy: Math.round((stats.avgAccuracy || 0) * 10) / 10,
            communication: Math.round((stats.avgCommunication || 0) * 10) / 10,
            timeliness: Math.round((stats.avgTimeliness || 0) * 10) / 10,
          },
        },
        recentReviews,
      },
    });
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
    const user = await User.findById(req.params.id).select("fullName avatar reputation role phone address");
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
    if (user.role === UserRole.SELLER) {
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
    user.role = UserRole.SELLER;
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

/**
 * @swagger
 * /api/users/me/avatar:
 *   put:
 *     summary: Upload or update user avatar
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar updated successfully
 */
userRoutes.put("/me/avatar", protect, upload.single("avatar") as any, async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    configureCloudinary();

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "velobike_avatars",
      transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: result.secure_url },
      { new: true }
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "Avatar updated successfully",
      data: { avatar: result.secure_url, user },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/users/me/fcm-token:
 *   put:
 *     summary: Update FCM token for push notifications
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
userRoutes.put("/me/fcm-token", protect, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ success: false, message: "fcmToken is required" });
    await User.findByIdAndUpdate(userId, { fcmToken });
    res.json({ success: true, message: "FCM token updated" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default userRoutes;

// PUT /api/users/me/inspector-profile
// Update inspector bio, experience, specializations, certificates
userRoutes.put("/me/inspector-profile", protect, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role !== UserRole.INSPECTOR) {
      return res.status(403).json({ success: false, message: "Only inspectors can update inspector profile" });
    }

    const { bio, yearsOfExperience, specializations, certificates } = req.body;

    const updated = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          "inspectorProfile.bio": bio ?? user.inspectorProfile?.bio,
          "inspectorProfile.yearsOfExperience": yearsOfExperience ?? user.inspectorProfile?.yearsOfExperience,
          "inspectorProfile.specializations": specializations ?? user.inspectorProfile?.specializations,
          "inspectorProfile.certificates": certificates ?? user.inspectorProfile?.certificates,
        },
      },
      { new: true }
    ).select("-passwordHash");

    res.json({ success: true, data: updated, message: "Inspector profile updated" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});
