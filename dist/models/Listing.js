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
exports.TriathlonListing = exports.EBikeListing = exports.MtbListing = exports.RoadListing = exports.Listing = exports.ListingStatus = exports.BikeType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// 1. Base Interfaces & Enums
var BikeType;
(function (BikeType) {
    BikeType["ROAD"] = "ROAD";
    BikeType["MTB"] = "MTB";
    BikeType["GRAVEL"] = "GRAVEL";
    BikeType["TRIATHLON"] = "TRIATHLON";
    BikeType["E_BIKE"] = "E_BIKE";
})(BikeType || (exports.BikeType = BikeType = {}));
var ListingStatus;
(function (ListingStatus) {
    ListingStatus["DRAFT"] = "DRAFT";
    ListingStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    ListingStatus["PUBLISHED"] = "PUBLISHED";
    ListingStatus["REJECTED"] = "REJECTED";
    ListingStatus["IN_INSPECTION"] = "IN_INSPECTION";
    ListingStatus["SOLD"] = "SOLD";
})(ListingStatus || (exports.ListingStatus = ListingStatus = {}));
// 2. Base Schema
const ListingSchema = new mongoose_1.Schema({
    sellerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    brandId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Brand",
        index: true, // Optional for backward compatibility
    },
    categoryId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Category",
        index: true, // Optional for backward compatibility
    },
    title: { type: String, required: true, index: "text" },
    description: { type: String, required: true },
    type: {
        type: String,
        enum: Object.values(BikeType),
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: Object.values(ListingStatus),
        default: ListingStatus.DRAFT,
        index: true,
    },
    generalInfo: {
        brand: { type: String, required: true, index: true },
        model: { type: String, required: true, index: true },
        year: { type: Number, required: true, index: true },
        size: { type: String, required: true },
        condition: {
            type: String,
            enum: ["NEW", "LIKE_NEW", "GOOD", "FAIR", "PARTS"],
            default: "GOOD",
        },
    },
    specs: {
        frameMaterial: String,
        groupset: String,
        wheelset: String,
        brakeType: String,
        suspensionType: String,
        travelFront: String,
        travelRear: String,
        wheelSize: String,
        weight: Number,
    },
    geometry: {
        stack: Number,
        reach: Number,
    },
    pricing: {
        amount: { type: Number, required: true, min: 0, index: true },
        currency: { type: String, default: "VND" },
        originalPrice: Number,
    },
    media: {
        thumbnails: [String],
        spin360Urls: [String],
        videoUrl: String,
    },
    location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], index: "2dsphere" },
        address: String,
    },
    inspectionRequired: { type: Boolean, default: false },
    inspectionScore: { type: Number, min: 1, max: 10 },
    inspectionReport: { type: mongoose_1.Schema.Types.ObjectId, ref: "Inspection" },
    views: { type: Number, default: 0, index: true },
}, {
    timestamps: true,
    discriminatorKey: "type",
});
// 3. Create Base Model
exports.Listing = mongoose_1.default.model("Listing", ListingSchema);
// 4. Define Discriminator Schemas (Specific Specs)
// --- ROAD BIKE ---
const RoadBikeSchema = new mongoose_1.Schema({
    specs: {
        frameMaterial: { type: String, required: true }, // e.g., Carbon FACT 12r
        groupset: { type: String, required: true }, // e.g., Dura-Ace Di2
        wheelset: String,
        brakeType: { type: String, enum: ["Disc", "Rim"], required: true },
    },
    geometry: {
        stack: Number,
        reach: Number,
    },
});
// --- MTB ---
const MtbSchema = new mongoose_1.Schema({
    specs: {
        frameMaterial: String,
        suspensionType: { type: String, enum: ["Hardtail", "Full-Suspension"] },
        travelFront: { type: String }, // e.g., "160mm"
        travelRear: { type: String },
        wheelSize: { type: String, enum: ["27.5", "29", "Mullet"] },
    },
});
// --- E-BIKE ---
const EBikeSchema = new mongoose_1.Schema({
    specs: {
        frameMaterial: String,
        motor: String, // e.g., Bosch Performance Line CX
        battery: String, // e.g., 625Wh
        range: String, // e.g., 80km
        maxSpeed: String, // e.g., 25km/h
        odometer: Number, // Total km ridden
    },
});
// 5. Apply Discriminators
exports.RoadListing = exports.Listing.discriminator(BikeType.ROAD, RoadBikeSchema);
exports.MtbListing = exports.Listing.discriminator(BikeType.MTB, MtbSchema);
exports.EBikeListing = exports.Listing.discriminator(BikeType.E_BIKE, EBikeSchema);
exports.TriathlonListing = exports.Listing.discriminator(BikeType.TRIATHLON, RoadBikeSchema); // Shares structure with Road for now
//# sourceMappingURL=Listing.js.map