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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputeController = void 0;
const Dispute_1 = require("../models/Dispute");
const Order_1 = require("../models/Order");
const User_1 = require("../models/User");
const OrderService_1 = require("../services/OrderService");
const mongoose_1 = __importDefault(require("mongoose"));
class DisputeController {
    /**
     * Open dispute
     * POST /api/disputes
     */
    static openDispute(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { orderId, reason, description, evidence } = req.body;
                const claimantId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Fix: use req.user.id
                // Verify order exists
                const order = yield Order_1.Order.findById(orderId);
                if (!order) {
                    return res.status(404).json({ success: false, message: "Order not found" });
                }
                // Verify dispute reason is valid
                if (!Object.values(Dispute_1.DisputeReason).includes(reason)) {
                    return res.status(400).json({ success: false, message: "Invalid dispute reason" });
                }
                // Check if dispute already exists
                const existingDispute = yield Dispute_1.Dispute.findOne({ orderId, claimantId });
                if (existingDispute) {
                    return res
                        .status(400)
                        .json({ success: false, message: "Dispute already exists for this order" });
                }
                // Determine respondent
                const respondentId = claimantId === order.buyerId.toString() ? order.sellerId : order.buyerId;
                const dispute = new Dispute_1.Dispute({
                    orderId: new mongoose_1.default.Types.ObjectId(orderId),
                    claimantId: new mongoose_1.default.Types.ObjectId(claimantId),
                    respondentId,
                    reason,
                    description,
                    evidence: evidence || [],
                    status: Dispute_1.DisputeStatus.OPEN,
                });
                yield dispute.save();
                // Update order status
                yield OrderService_1.OrderService.openDispute(orderId, claimantId);
                res.status(201).json({
                    success: true,
                    message: "Dispute opened",
                    data: dispute,
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error opening dispute", error: error.message });
            }
        });
    }
    /**
     * Get dispute details
     * GET /api/disputes/:disputeId
     */
    static getDispute(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { disputeId } = req.params;
                const dispute = yield Dispute_1.Dispute.findById(disputeId)
                    .populate("claimantId", "fullName avatar email")
                    .populate("respondentId", "fullName avatar email")
                    .populate("orderId", "listingId buyerId sellerId")
                    .populate("resolvedBy", "fullName");
                if (!dispute) {
                    return res.status(404).json({ success: false, message: "Dispute not found" });
                }
                res.status(200).json({
                    success: true,
                    data: dispute,
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error fetching dispute", error: error.message });
            }
        });
    }
    /**
     * Get user disputes
     * GET /api/disputes
     */
    static getUserDisputes(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Fix: use req.user.id instead of req.userId
                const { status, page = 1, limit = 10 } = req.query;
                const query = {
                    $or: [{ claimantId: userId }, { respondentId: userId }],
                };
                if (status) {
                    query.status = status;
                }
                const disputes = yield Dispute_1.Dispute.find(query)
                    .populate("claimantId", "fullName avatar")
                    .populate("respondentId", "fullName avatar")
                    .populate("orderId", "listingId")
                    .sort({ createdAt: -1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield Dispute_1.Dispute.countDocuments(query);
                res.status(200).json({
                    success: true,
                    data: disputes,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        pages: Math.ceil(total / Number(limit)),
                    },
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error fetching disputes", error: error.message });
            }
        });
    }
    /**
     * Resolve dispute (Admin only)
     * PUT /api/disputes/:disputeId/resolve
     */
    static resolveDispute(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { disputeId } = req.params;
                const { resolution, compensationAmount } = req.body;
                const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Fix: use req.user.id
                // Verify admin role
                const admin = yield User_1.User.findById(adminId);
                if (!admin || admin.role !== "ADMIN") {
                    return res.status(403).json({ success: false, message: "Only admin can resolve disputes" });
                }
                const dispute = yield Dispute_1.Dispute.findById(disputeId);
                if (!dispute) {
                    return res.status(404).json({ success: false, message: "Dispute not found" });
                }
                if (dispute.status !== Dispute_1.DisputeStatus.OPEN && dispute.status !== Dispute_1.DisputeStatus.IN_REVIEW) {
                    return res
                        .status(400)
                        .json({ success: false, message: "Dispute cannot be resolved in current status" });
                }
                // Update dispute
                dispute.status = Dispute_1.DisputeStatus.RESOLVED;
                dispute.resolution = resolution;
                dispute.compensationAmount = compensationAmount || 0;
                dispute.resolvedBy = new mongoose_1.default.Types.ObjectId(adminId);
                dispute.resolvedAt = new Date();
                yield dispute.save();
                // Handle compensation if needed
                if (compensationAmount && compensationAmount > 0) {
                    const recipient = yield User_1.User.findById(dispute.claimantId);
                    if (recipient) {
                        const oldBalance = recipient.wallet.balance;
                        recipient.wallet.balance += compensationAmount;
                        yield recipient.save();
                        console.log(`[DISPUTE REFUND] User ${recipient._id} balance: ${oldBalance} -> ${recipient.wallet.balance} (+${compensationAmount})`);
                    }
                    else {
                        console.error(`[DISPUTE REFUND ERROR] Recipient not found: ${dispute.claimantId}`);
                    }
                }
                else {
                    console.log(`[DISPUTE REFUND] No compensation amount specified: ${compensationAmount}`);
                }
                res.status(200).json({
                    success: true,
                    message: "Dispute resolved",
                    data: dispute,
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error resolving dispute", error: error.message });
            }
        });
    }
    /**
     * Review dispute (Admin action)
     * PUT /api/disputes/:disputeId/review
     */
    static reviewDispute(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { disputeId } = req.params;
                const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Fix: use req.user.id
                // Verify admin role
                const admin = yield User_1.User.findById(adminId);
                if (!admin || admin.role !== "ADMIN") {
                    return res.status(403).json({ success: false, message: "Only admin can review disputes" });
                }
                const dispute = yield Dispute_1.Dispute.findByIdAndUpdate(disputeId, { status: Dispute_1.DisputeStatus.IN_REVIEW }, { new: true });
                if (!dispute) {
                    return res.status(404).json({ success: false, message: "Dispute not found" });
                }
                res.status(200).json({
                    success: true,
                    message: "Dispute moved to review",
                    data: dispute,
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error reviewing dispute", error: error.message });
            }
        });
    }
    /**
     * Close dispute
     * PUT /api/disputes/:disputeId/close
     */
    static closeDispute(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { disputeId } = req.params;
                const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Fix: use req.user.id
                // Verify admin role
                const admin = yield User_1.User.findById(adminId);
                if (!admin || admin.role !== "ADMIN") {
                    return res.status(403).json({ success: false, message: "Only admin can close disputes" });
                }
                const dispute = yield Dispute_1.Dispute.findByIdAndUpdate(disputeId, { status: Dispute_1.DisputeStatus.CLOSED }, { new: true });
                if (!dispute) {
                    return res.status(404).json({ success: false, message: "Dispute not found" });
                }
                res.status(200).json({
                    success: true,
                    message: "Dispute closed",
                    data: dispute,
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error closing dispute", error: error.message });
            }
        });
    }
    /**
     * Add evidence to dispute
     * POST /api/disputes/:disputeId/evidence
     */
    static addEvidence(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { disputeId } = req.params;
                const { evidence } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Fix: use req.user.id
                const dispute = yield Dispute_1.Dispute.findById(disputeId);
                if (!dispute) {
                    return res.status(404).json({ success: false, message: "Dispute not found" });
                }
                // Verify user is involved in dispute
                if (dispute.claimantId.toString() !== userId &&
                    dispute.respondentId.toString() !== userId) {
                    return res
                        .status(403)
                        .json({ success: false, message: "You are not involved in this dispute" });
                }
                if (Array.isArray(evidence)) {
                    dispute.evidence = [...(dispute.evidence || []), ...evidence];
                }
                else {
                    dispute.evidence = [...(dispute.evidence || []), evidence];
                }
                yield dispute.save();
                res.status(200).json({
                    success: true,
                    message: "Evidence added",
                    data: dispute,
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error adding evidence", error: error.message });
            }
        });
    }
    /**
     * Get all disputes (Admin)
     * GET /api/disputes/admin/all
     */
    static getAllDisputes(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { status, page = 1, limit = 20 } = req.query;
                const query = {};
                if (status) {
                    query.status = status;
                }
                const disputes = yield Dispute_1.Dispute.find(query)
                    .populate("claimantId", "fullName email")
                    .populate("respondentId", "fullName email")
                    .populate("orderId", "listingId")
                    .sort({ createdAt: -1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield Dispute_1.Dispute.countDocuments(query);
                res.status(200).json({
                    success: true,
                    data: disputes,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        pages: Math.ceil(total / Number(limit)),
                    },
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error fetching disputes", error: error.message });
            }
        });
    }
}
exports.DisputeController = DisputeController;
//# sourceMappingURL=DisputeController.js.map