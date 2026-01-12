"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Inspection = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const InspectionSchema = new mongoose_1.Schema({
    listingId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Listing",
        required: true,
        index: true,
    },
    orderId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Order",
        index: true, // Not required for PRE_SALE inspections
    },
    inspectorId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
        type: String,
        enum: ["PRE_SALE", "POST_SALE_ORDER"],
        required: true,
        index: true,
    },
    overallVerdict: {
        type: String,
        enum: ["PASSED", "FAILED", "SUGGEST_ADJUSTMENT"],
        required: true,
    },
    overallScore: { type: Number, required: true, min: 1, max: 10 },
    grade: {
        type: String,
        enum: ["A", "B", "C", "D"],
        required: true
    },
    fee: { type: Number }, // Inspection fee
    feeTransactionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Transaction",
    },
    checkpoints: [
        {
            component: { type: String, required: true },
            status: {
                type: String,
                enum: ["PASS", "FAIL", "WARN"],
                required: true,
            },
            observation: String,
            evidenceImages: [String],
            severity: { type: String, enum: ["LOW", "MEDIUM", "CRITICAL"] },
        },
    ],
    inspectorNote: String,
    completedAt: { type: Date, default: Date.now },
}, { timestamps: true });
exports.Inspection = mongoose_1.default.model("Inspection", InspectionSchema);
//# sourceMappingURL=Inspection.js.map