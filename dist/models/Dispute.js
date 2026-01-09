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
exports.Dispute = exports.DisputeReason = exports.DisputeStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var DisputeStatus;
(function (DisputeStatus) {
    DisputeStatus["OPEN"] = "OPEN";
    DisputeStatus["IN_REVIEW"] = "IN_REVIEW";
    DisputeStatus["RESOLVED"] = "RESOLVED";
    DisputeStatus["CLOSED"] = "CLOSED";
})(DisputeStatus || (exports.DisputeStatus = DisputeStatus = {}));
var DisputeReason;
(function (DisputeReason) {
    DisputeReason["ITEM_NOT_RECEIVED"] = "ITEM_NOT_RECEIVED";
    DisputeReason["ITEM_NOT_AS_DESCRIBED"] = "ITEM_NOT_AS_DESCRIBED";
    DisputeReason["ITEM_DAMAGED"] = "ITEM_DAMAGED";
    DisputeReason["QUALITY_ISSUE"] = "QUALITY_ISSUE";
    DisputeReason["PAYMENT_ISSUE"] = "PAYMENT_ISSUE";
    DisputeReason["INSPECTION_DISPUTE"] = "INSPECTION_DISPUTE";
    DisputeReason["OTHER"] = "OTHER";
})(DisputeReason || (exports.DisputeReason = DisputeReason = {}));
const DisputeSchema = new mongoose_1.Schema({
    orderId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    claimantId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    respondentId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reason: { type: String, enum: Object.values(DisputeReason), required: true },
    description: { type: String, required: true },
    evidence: [String],
    status: {
        type: String,
        enum: Object.values(DisputeStatus),
        default: DisputeStatus.OPEN,
        index: true,
    },
    resolution: String,
    resolvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: Date,
    compensationAmount: { type: Number, min: 0 },
}, { timestamps: true });
DisputeSchema.index({ orderId: 1, claimantId: 1 }, { unique: true });
exports.Dispute = mongoose_1.default.model("Dispute", DisputeSchema);
//# sourceMappingURL=Dispute.js.map