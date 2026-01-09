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
exports.Order = exports.OrderStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["CREATED"] = "CREATED";
    OrderStatus["ESCROW_LOCKED"] = "ESCROW_LOCKED";
    OrderStatus["IN_INSPECTION"] = "IN_INSPECTION";
    OrderStatus["INSPECTION_PASSED"] = "INSPECTION_PASSED";
    OrderStatus["INSPECTION_FAILED"] = "INSPECTION_FAILED";
    OrderStatus["SHIPPING"] = "SHIPPING";
    OrderStatus["DELIVERED"] = "DELIVERED";
    OrderStatus["COMPLETED"] = "COMPLETED";
    OrderStatus["DISPUTED"] = "DISPUTED";
    OrderStatus["REFUNDED"] = "REFUNDED";
    OrderStatus["CANCELLED"] = "CANCELLED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
const OrderSchema = new mongoose_1.Schema({
    listingId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Listing", required: true },
    buyerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    sellerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    inspectorId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" }, // Null initially
    status: {
        type: String,
        enum: Object.values(OrderStatus),
        default: OrderStatus.CREATED,
    },
    financials: {
        totalAmount: { type: Number, required: true },
        itemPrice: { type: Number, required: true },
        inspectionFee: { type: Number, default: 0 },
        shippingFee: { type: Number, default: 0 },
        platformFee: { type: Number, default: 0 },
    },
    timeline: [
        {
            status: { type: String, enum: Object.values(OrderStatus) },
            timestamp: { type: Date, default: Date.now },
            actorId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
            note: String,
        },
    ],
}, { timestamps: true });
exports.Order = mongoose_1.default.model("Order", OrderSchema);
//# sourceMappingURL=Order.js.map