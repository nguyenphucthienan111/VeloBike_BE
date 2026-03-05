"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const User_1 = require("../models/User");
const authMiddleware_1 = require("../middleware/authMiddleware");
exports.userRoutes = (0, express_1.Router)();
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
exports.userRoutes.get("/me", authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const user = yield User_1.User.findById(userId).select("-passwordHash");
        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });
        res.json({ success: true, data: user });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}));
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
exports.userRoutes.put("/me", authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const updates = req.body;
        const user = yield User_1.User.findByIdAndUpdate(userId, updates, { new: true }).select("-passwordHash");
        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });
        res.json({ success: true, data: user });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}));
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
exports.userRoutes.post("/kyc", authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Redirect to main KYC endpoint to avoid duplicate logic
    res.status(301).json({
        success: false,
        message: "This endpoint is deprecated. Please use POST /api/auth/kyc-submit instead"
    });
}));
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
exports.userRoutes.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.User.findById(req.params.id).select("fullName avatar reputation role");
        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });
        res.json({ success: true, data: user });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}));
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
exports.userRoutes.post("/me/bank", authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { accountName, accountNumber, bankName } = req.body;
        const user = yield User_1.User.findById(userId);
        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });
        user.bankAccount = { accountName, accountNumber, bankName };
        yield user.save();
        res.json({ success: true, message: "Bank account saved" });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}));
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
exports.userRoutes.get("/me/wallet", authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const user = yield User_1.User.findById(userId).select("wallet");
        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });
        res.json({ success: true, data: user.wallet });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}));
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
exports.userRoutes.post("/me/upgrade-to-seller", authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const user = yield User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        // Check if already a SELLER
        if (user.role === User_1.UserRole.SELLER) {
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
        user.role = User_1.UserRole.SELLER;
        yield user.save();
        // Create FREE subscription for new seller (only if not exists)
        const { SubscriptionService } = require("../services/SubscriptionService");
        const existingSubscription = yield SubscriptionService.getSellerSubscription(userId);
        if (!existingSubscription) {
            yield SubscriptionService.createFreeSubscription(userId);
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
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}));
exports.default = exports.userRoutes;
//# sourceMappingURL=userRoutes.js.map