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
exports.userRoutes.post("/kyc", authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { documentId, documentType } = req.body;
        const user = yield User_1.User.findById(userId);
        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });
        user.kycData = { documentId, documentType, verifiedAt: undefined };
        user.kycStatus = "PENDING";
        yield user.save();
        res.json({ success: true, message: "KYC submitted", data: { kycStatus: user.kycStatus } });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
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
exports.default = exports.userRoutes;
//# sourceMappingURL=userRoutes.js.map