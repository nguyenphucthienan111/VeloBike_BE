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
const dotenv_1 = __importDefault(require("dotenv"));
// Load .env as early as possible so EmailService and other modules read config
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs")); // Import File System
const http_1 = require("http");
const socket_io_1 = require("socket.io");
// Import Security Middleware
const rateLimitMiddleware_1 = require("./middleware/rateLimitMiddleware");
const securityMiddleware_1 = require("./middleware/securityMiddleware");
const requestLoggerMiddleware_1 = require("./middleware/requestLoggerMiddleware");
// Import Services
const CacheService_1 = require("./services/CacheService");
const AlertService_1 = require("./services/AlertService");
// Import Routes
const authRoutes_1 = require("./routes/authRoutes");
const listingRoutes_1 = require("./routes/listingRoutes");
const orderRoutes_1 = require("./routes/orderRoutes");
const inspectionRoutes_1 = require("./routes/inspectionRoutes");
const paymentRoutes_1 = require("./routes/paymentRoutes");
const uploadRoutes_1 = require("./routes/uploadRoutes");
const reviewRoutes_1 = require("./routes/reviewRoutes");
const messageRoutes_1 = require("./routes/messageRoutes");
const wishlistRoutes_1 = require("./routes/wishlistRoutes");
const disputeRoutes_1 = require("./routes/disputeRoutes");
const adminRoutes_1 = require("./routes/adminRoutes");
const chatbotRoutes_1 = require("./routes/chatbotRoutes");
const logisticsRoutes_1 = require("./routes/logisticsRoutes");
const notificationRoutes_1 = require("./routes/notificationRoutes");
const kycRoutes_1 = require("./routes/kycRoutes");
const dashboardRoutes_1 = require("./routes/dashboardRoutes");
const recommendationRoutes_1 = require("./routes/recommendationRoutes");
const alertRoutes_1 = require("./routes/alertRoutes");
const fraudRoutes_1 = require("./routes/fraudRoutes");
const bulkRoutes_1 = require("./routes/bulkRoutes");
const reportRoutes_1 = require("./routes/reportRoutes");
const transactionRoutes_1 = require("./routes/transactionRoutes");
const subscriptionRoutes_1 = require("./routes/subscriptionRoutes");
const analyticsRoutes_1 = require("./routes/analyticsRoutes");
const debugRoutes_1 = require("./routes/debugRoutes");
const walletRoutes_1 = require("./routes/walletRoutes");
const walletRoutes_2 = require("./routes/walletRoutes");
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
// Import Subscription Service for initialization
const SubscriptionService_1 = require("./services/SubscriptionService");
// Initialize App & Socket.io
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
const PORT = process.env.PORT || 5000;
// Initialize Cache Service only if not in test environment
if (process.env.NODE_ENV !== 'test') {
    CacheService_1.CacheService.init().catch(console.error);
    // Start alert processing
    AlertService_1.AlertService.startAlertProcessing();
    // Initialize default subscription plans
    SubscriptionService_1.SubscriptionService.initializeDefaultPlans().catch(console.error);
}
// Ensure uploads directory exists (Task B4 Fix)
const uploadDir = path_1.default.join(__dirname, "uploads");
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir);
    console.log("Created uploads directory");
}
// Security Middleware (Apply early)
app.use(securityMiddleware_1.securityHeaders);
app.use((0, securityMiddleware_1.requestSizeLimiter)("50mb")); // Limit request size
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(securityMiddleware_1.sanitizeInput); // Sanitize inputs
// Logging Middleware
app.use(requestLoggerMiddleware_1.requestLogger);
app.use(requestLoggerMiddleware_1.performanceMonitor);
app.use(requestLoggerMiddleware_1.apiAnalytics);
// General Rate Limiting (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
    app.use(rateLimitMiddleware_1.generalLimiter);
}
// Inject Socket.io into Request object so Controllers can use it
app.use((req, res, next) => {
    req.io = io;
    next();
});
// Serve uploaded files statically so frontend can view them
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "uploads")));
// --- SOCKET.IO LOGIC ---
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    socket.on("join_room", (orderId) => {
        socket.join(orderId);
        console.log(`User with ID: ${socket.id} joined room: ${orderId}`);
    });
    socket.on("send_message", (data) => {
        socket.to(data.orderId).emit("receive_message", data);
    });
    socket.on("disconnect", () => {
        console.log("User Disconnected", socket.id);
    });
});
// --- SWAGGER CONFIGURATION ---
const routesPath = path_1.default.join(__dirname, "routes", "*.ts").replace(/\\/g, "/");
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "VeloBike API Documentation",
            version: "1.0.0",
            description: "API documentation for VeloBike C2C Marketplace",
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: "Local Development Server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: {
                User: {
                    type: "object",
                    properties: {
                        _id: { type: "string" },
                        email: { type: "string" },
                        fullName: { type: "string" },
                        role: { type: "string", enum: ["BUYER", "SELLER", "INSPECTOR", "ADMIN"] },
                        avatar: { type: "string" },
                        phone: { type: "string" },
                        kycStatus: { type: "string", enum: ["PENDING", "VERIFIED", "REJECTED"] },
                        emailVerified: { type: "boolean" },
                        createdAt: { type: "string", format: "date-time" },
                    },
                },
                Listing: {
                    type: "object",
                    properties: {
                        _id: { type: "string" },
                        sellerId: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        type: { type: "string", enum: ["ROAD", "MTB", "GRAVEL", "TRIATHLON", "E_BIKE"] },
                        status: { type: "string", enum: ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "REJECTED", "IN_INSPECTION", "SOLD"] },
                        generalInfo: {
                            type: "object",
                            properties: {
                                brand: { type: "string" },
                                model: { type: "string" },
                                year: { type: "number" },
                                size: { type: "string" },
                                condition: { type: "string", enum: ["NEW", "LIKE_NEW", "GOOD", "FAIR", "PARTS"] },
                            },
                        },
                        specs: {
                            type: "object",
                            properties: {
                                frameMaterial: { type: "string" },
                                groupset: { type: "string" },
                                wheelset: { type: "string" },
                                brakeType: { type: "string" },
                                weight: { type: "number" },
                            },
                        },
                        pricing: {
                            type: "object",
                            properties: {
                                amount: { type: "number" },
                                currency: { type: "string" },
                                originalPrice: { type: "number" },
                            },
                        },
                        media: {
                            type: "object",
                            properties: {
                                thumbnails: { type: "array", items: { type: "string" } },
                                spin360Urls: { type: "array", items: { type: "string" } },
                                videoUrl: { type: "string" },
                            },
                        },
                        location: {
                            type: "object",
                            properties: {
                                type: { type: "string" },
                                coordinates: { type: "array", items: { type: "number" } },
                                address: { type: "string" },
                            },
                        },
                        views: { type: "number" },
                        createdAt: { type: "string", format: "date-time" },
                    },
                },
                Order: {
                    type: "object",
                    properties: {
                        _id: { type: "string" },
                        buyerId: { type: "string" },
                        sellerId: { type: "string" },
                        listingId: { type: "string" },
                        status: { type: "string" },
                        totalAmount: { type: "number" },
                        createdAt: { type: "string", format: "date-time" },
                    },
                },
            },
        },
    },
    apis: [routesPath],
};
const swaggerDocs = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocs));
// Database Connection (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/velobike";
    mongoose_1.default
        .connect(MONGO_URI)
        .then(() => console.log("✅ MongoDB Connected"))
        .catch((err) => console.error("❌ MongoDB Connection Error:", err));
}
// --- ROUTES REGISTRATION WITH SPECIFIC RATE LIMITING ---
const authLimiterMiddleware = process.env.NODE_ENV === 'test' ? [] : [rateLimitMiddleware_1.authLimiter];
const searchLimiterMiddleware = process.env.NODE_ENV === 'test' ? [] : [rateLimitMiddleware_1.searchLimiter];
const paymentLimiterMiddleware = process.env.NODE_ENV === 'test' ? [] : [rateLimitMiddleware_1.paymentLimiter];
const uploadLimiterMiddleware = process.env.NODE_ENV === 'test' ? [] : [rateLimitMiddleware_1.uploadLimiter];
app.use("/api/auth", ...authLimiterMiddleware, authRoutes_1.authRoutes);
app.use("/api/listings", ...searchLimiterMiddleware, listingRoutes_1.listingRoutes);
app.use("/api/orders", orderRoutes_1.orderRoutes);
app.use("/api/inspections", inspectionRoutes_1.inspectionRoutes);
app.use("/api/payment", ...paymentLimiterMiddleware, paymentRoutes_1.paymentRoutes);
app.use("/api/upload", ...uploadLimiterMiddleware, uploadRoutes_1.uploadRoutes);
app.use("/api/reviews", reviewRoutes_1.reviewRoutes);
app.use("/api/messages", messageRoutes_1.messageRoutes);
app.use("/api/wishlist", wishlistRoutes_1.wishlistRoutes);
app.use("/api/disputes", disputeRoutes_1.disputeRoutes);
app.use("/api/admin", adminRoutes_1.adminRoutes);
app.use("/api/chatbot", chatbotRoutes_1.chatbotRoutes);
app.use("/api/logistics", logisticsRoutes_1.logisticsRoutes);
app.use("/api/notifications", notificationRoutes_1.notificationRoutes);
app.use("/api/kyc", kycRoutes_1.kycRoutes);
app.use("/api/users", userRoutes_1.default);
app.use("/api/dashboard", dashboardRoutes_1.dashboardRoutes);
app.use("/api/recommendations", recommendationRoutes_1.recommendationRoutes);
app.use("/api/alerts", alertRoutes_1.alertRoutes);
app.use("/api/fraud", fraudRoutes_1.fraudRoutes);
app.use("/api/bulk", bulkRoutes_1.bulkRoutes);
app.use("/api/reports", reportRoutes_1.reportRoutes);
app.use("/api/transactions", transactionRoutes_1.transactionRoutes);
app.use("/api/subscriptions", subscriptionRoutes_1.subscriptionRoutes);
app.use("/api/analytics", analyticsRoutes_1.analyticsRoutes);
app.use("/api/debug", debugRoutes_1.debugRoutes);
app.use("/api/wallet", walletRoutes_1.walletRoutes);
app.use("/api/admin/withdrawals", walletRoutes_2.adminWithdrawalRoutes);
// Health Check Endpoint
app.get("/health", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cacheStats = yield CacheService_1.CacheService.getStats();
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        cache: cacheStats ? "Connected" : "Disconnected",
        database: mongoose_1.default.connection.readyState === 1 ? "Connected" : "Disconnected",
    });
}));
// Error Handling Middleware (Must be last)
app.use(requestLoggerMiddleware_1.errorLogger);
app.use((err, req, res, next) => {
    console.error(err.stack);
    res
        .status(500)
        .json({ success: false, message: "Server Error", error: err.message });
});
// Graceful Shutdown
process.on("SIGTERM", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("SIGTERM received, shutting down gracefully");
    yield CacheService_1.CacheService.close();
    yield mongoose_1.default.connection.close();
    httpServer.close(() => {
        console.log("Process terminated");
    });
}));
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("SIGINT received, shutting down gracefully");
    yield CacheService_1.CacheService.close();
    yield mongoose_1.default.connection.close();
    httpServer.close(() => {
        console.log("Process terminated");
    });
}));
// Start SERVER
if (require.main === module) {
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Swagger Docs available at http://localhost:${PORT}/api-docs`);
        console.log(`Health Check available at http://localhost:${PORT}/health`);
        console.log(`Socket.io is ready`);
    });
}
exports.default = app;
//# sourceMappingURL=app.js.map