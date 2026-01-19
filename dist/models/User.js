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
exports.User = exports.KycStatus = exports.UserRole = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var UserRole;
(function (UserRole) {
    UserRole["GUEST"] = "GUEST";
    UserRole["BUYER"] = "BUYER";
    UserRole["SELLER"] = "SELLER";
    UserRole["INSPECTOR"] = "INSPECTOR";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var KycStatus;
(function (KycStatus) {
    KycStatus["PENDING"] = "PENDING";
    KycStatus["VERIFIED"] = "VERIFIED";
    KycStatus["REJECTED"] = "REJECTED";
})(KycStatus || (exports.KycStatus = KycStatus = {}));
const UserSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    facebookId: { type: String, unique: true, sparse: true },
    fullName: { type: String, required: true },
    avatar: { type: String },
    phone: { type: String },
    address: {
        street: String,
        district: String,
        city: String,
        province: String,
        zipCode: String,
    },
    role: {
        type: String,
        enum: Object.values(UserRole),
        default: UserRole.GUEST,
    },
    kycStatus: {
        type: String,
        enum: Object.values(KycStatus),
        default: KycStatus.PENDING,
    },
    kycData: {
        documentId: String,
        documentType: String,
        frontImage: String,
        backImage: String,
        verifiedAt: Date,
        confidence: Number,
        documentData: mongoose_1.Schema.Types.Mixed,
        faceMatchScore: Number,
        verifiedBy: String,
        note: String,
    },
    bodyMeasurements: {
        height: Number, // cm
        inseam: Number, // cm
        weight: Number, // kg
    },
    wallet: {
        balance: { type: Number, default: 0 },
        currency: { type: String, default: "VND" },
    },
    reputation: {
        score: { type: Number, default: 5.0 },
        reviewCount: { type: Number, default: 0 },
    },
    fcmToken: String,
    bankAccount: {
        accountName: String,
        accountNumber: String,
        bankName: String,
    },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
}, { timestamps: true });
exports.User = mongoose_1.default.model("User", UserSchema);
//# sourceMappingURL=User.js.map