"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationRules = exports.validate = void 0;
const express_validator_1 = require("express-validator");
/**
 * Validation middleware - checks validation results
 */
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: "Validation errors",
            errors: errors.array(),
        });
    }
    next();
};
exports.validate = validate;
/**
 * Validation rules for common endpoints
 */
exports.validationRules = {
    // Auth validations
    register: [
        (0, express_validator_1.body)("email").isEmail().withMessage("Invalid email format"),
        (0, express_validator_1.body)("password")
            .isLength({ min: 6 })
            .withMessage("Password must be at least 6 characters"),
        (0, express_validator_1.body)("fullName")
            .trim()
            .notEmpty()
            .withMessage("Full name is required")
            .isLength({ min: 2, max: 100 })
            .withMessage("Full name must be between 2 and 100 characters"),
        (0, express_validator_1.body)("role")
            .optional()
            .isIn(["BUYER", "SELLER", "INSPECTOR"])
            .withMessage("Invalid role"),
    ],
    login: [
        (0, express_validator_1.body)("email").isEmail().withMessage("Invalid email format"),
        (0, express_validator_1.body)("password").notEmpty().withMessage("Password is required"),
    ],
    // Listing validations
    createListing: [
        (0, express_validator_1.body)("title")
            .trim()
            .notEmpty()
            .withMessage("Title is required")
            .isLength({ min: 5, max: 200 })
            .withMessage("Title must be between 5 and 200 characters"),
        (0, express_validator_1.body)("description")
            .trim()
            .notEmpty()
            .withMessage("Description is required")
            .isLength({ min: 10 })
            .withMessage("Description must be at least 10 characters"),
        (0, express_validator_1.body)("type")
            .isIn(["ROAD", "MTB", "GRAVEL", "TRIATHLON"])
            .withMessage("Invalid bike type"),
        (0, express_validator_1.body)("generalInfo.brand")
            .trim()
            .notEmpty()
            .withMessage("Brand is required"),
        (0, express_validator_1.body)("generalInfo.model")
            .trim()
            .notEmpty()
            .withMessage("Model is required"),
        (0, express_validator_1.body)("generalInfo.year")
            .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
            .withMessage("Invalid year"),
        (0, express_validator_1.body)("generalInfo.size")
            .trim()
            .notEmpty()
            .withMessage("Size is required"),
        (0, express_validator_1.body)("pricing.amount")
            .isFloat({ min: 0 })
            .withMessage("Price must be a positive number"),
        (0, express_validator_1.body)("location.coordinates")
            .isArray({ min: 2, max: 2 })
            .withMessage("Coordinates must be an array of 2 numbers [lng, lat]"),
        (0, express_validator_1.body)("location.coordinates.*")
            .isFloat()
            .withMessage("Coordinates must be numbers"),
    ],
    // Order validations
    createOrder: [
        (0, express_validator_1.body)("listingId")
            .notEmpty()
            .withMessage("Listing ID is required")
            .isMongoId()
            .withMessage("Invalid listing ID format"),
        (0, express_validator_1.body)("inspectionRequired")
            .optional()
            .isBoolean()
            .withMessage("inspectionRequired must be a boolean"),
    ],
    // Inspection validations
    submitInspection: [
        (0, express_validator_1.body)("orderId")
            .notEmpty()
            .withMessage("Order ID is required")
            .isMongoId()
            .withMessage("Invalid order ID format"),
        (0, express_validator_1.body)("checkpoints")
            .isArray({ min: 1 })
            .withMessage("At least one checkpoint is required"),
        (0, express_validator_1.body)("checkpoints.*.component")
            .trim()
            .notEmpty()
            .withMessage("Component name is required"),
        (0, express_validator_1.body)("checkpoints.*.status")
            .isIn(["PASS", "FAIL", "WARN"])
            .withMessage("Invalid checkpoint status"),
        (0, express_validator_1.body)("overallVerdict")
            .optional()
            .isIn(["PASSED", "FAILED", "SUGGEST_ADJUSTMENT"])
            .withMessage("Invalid overall verdict"),
        (0, express_validator_1.body)("overallScore")
            .optional()
            .isFloat({ min: 1, max: 10 })
            .withMessage("Overall score must be between 1 and 10"),
    ],
    // Review validations
    createReview: [
        (0, express_validator_1.body)("orderId")
            .notEmpty()
            .withMessage("Order ID is required")
            .isMongoId()
            .withMessage("Invalid order ID format"),
        (0, express_validator_1.body)("rating")
            .isInt({ min: 1, max: 5 })
            .withMessage("Rating must be between 1 and 5"),
        (0, express_validator_1.body)("comment")
            .optional()
            .trim()
            .isLength({ max: 1000 })
            .withMessage("Comment must not exceed 1000 characters"),
        (0, express_validator_1.body)("type")
            .isIn(["SELLER", "BUYER"])
            .withMessage("Invalid review type"),
        (0, express_validator_1.body)("categories.itemAccuracy")
            .optional()
            .isInt({ min: 1, max: 5 })
            .withMessage("Item accuracy rating must be between 1 and 5"),
        (0, express_validator_1.body)("categories.communication")
            .optional()
            .isInt({ min: 1, max: 5 })
            .withMessage("Communication rating must be between 1 and 5"),
        (0, express_validator_1.body)("categories.shipping")
            .optional()
            .isInt({ min: 1, max: 5 })
            .withMessage("Shipping rating must be between 1 and 5"),
        (0, express_validator_1.body)("categories.packaging")
            .optional()
            .isInt({ min: 1, max: 5 })
            .withMessage("Packaging rating must be between 1 and 5"),
    ],
    // Payment validations
    createPaymentLink: [
        (0, express_validator_1.body)("orderId")
            .notEmpty()
            .withMessage("Order ID is required")
            .isMongoId()
            .withMessage("Invalid order ID format"),
    ],
    // Fit Calculator validations
    fitCalculator: [
        (0, express_validator_1.body)("riderHeight")
            .isFloat({ min: 100, max: 250 })
            .withMessage("Rider height must be between 100 and 250 cm"),
        (0, express_validator_1.body)("riderInseam")
            .isFloat({ min: 50, max: 150 })
            .withMessage("Rider inseam must be between 50 and 150 cm"),
        (0, express_validator_1.body)("riderReach")
            .optional()
            .isFloat({ min: 0 })
            .withMessage("Rider reach must be a positive number"),
        (0, express_validator_1.body)("listingId")
            .optional()
            .isMongoId()
            .withMessage("Invalid listing ID format"),
    ],
    // Dispute validations
    createDispute: [
        (0, express_validator_1.body)("orderId")
            .notEmpty()
            .withMessage("Order ID is required")
            .isMongoId()
            .withMessage("Invalid order ID format"),
        (0, express_validator_1.body)("reason")
            .isIn([
            "ITEM_NOT_RECEIVED",
            "ITEM_NOT_AS_DESCRIBED",
            "ITEM_DAMAGED",
            "QUALITY_ISSUE",
            "PAYMENT_ISSUE",
            "INSPECTION_DISPUTE",
            "OTHER",
        ])
            .withMessage("Invalid dispute reason"),
        (0, express_validator_1.body)("description")
            .trim()
            .notEmpty()
            .withMessage("Description is required")
            .isLength({ min: 10, max: 1000 })
            .withMessage("Description must be between 10 and 1000 characters"),
    ],
    // Admin validations
    updateUserKyc: [
        (0, express_validator_1.body)("kycStatus")
            .isIn(["PENDING", "VERIFIED", "REJECTED"])
            .withMessage("Invalid KYC status"),
    ],
    updateListingStatus: [
        (0, express_validator_1.body)("status")
            .isIn(["DRAFT", "PUBLISHED", "IN_INSPECTION", "SOLD"])
            .withMessage("Invalid listing status"),
    ],
    // Price Alert validation
    createPriceAlert: [
        (0, express_validator_1.body)("listingId")
            .isMongoId()
            .withMessage("Valid listing ID is required"),
        (0, express_validator_1.body)("targetPrice")
            .isNumeric()
            .withMessage("Target price must be a number")
            .isFloat({ min: 0 })
            .withMessage("Target price must be positive"),
    ],
    // Saved Search validation
    createSavedSearch: [
        (0, express_validator_1.body)("name")
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage("Search name must be 1-100 characters"),
        (0, express_validator_1.body)("query")
            .isObject()
            .withMessage("Query must be an object"),
        (0, express_validator_1.body)("alertsEnabled")
            .optional()
            .isBoolean()
            .withMessage("Alerts enabled must be boolean"),
    ],
};
//# sourceMappingURL=validationMiddleware.js.map