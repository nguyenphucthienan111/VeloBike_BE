"use strict";
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
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
// Fix for missing Node.js type definitions
// declare var __dirname: string;
// declare var require: any;
// declare var module: any;
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
// Ensure uploads directory exists (Task B4 Fix)
const uploadDir = path_1.default.join(__dirname, "uploads");
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir);
    console.log("Created uploads directory");
}
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
        },
    },
    apis: [routesPath],
};
const swaggerDocs = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocs));
// Database Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/velobike";
mongoose_1.default
    .connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));
// --- ROUTES REGISTRATION ---
app.use("/api/auth", authRoutes_1.authRoutes);
app.use("/api/listings", listingRoutes_1.listingRoutes);
app.use("/api/orders", orderRoutes_1.orderRoutes);
app.use("/api/inspections", inspectionRoutes_1.inspectionRoutes);
app.use("/api/payment", paymentRoutes_1.paymentRoutes);
app.use("/api/upload", uploadRoutes_1.uploadRoutes);
app.use("/api/reviews", reviewRoutes_1.reviewRoutes);
app.use("/api/messages", messageRoutes_1.messageRoutes);
app.use("/api/wishlist", wishlistRoutes_1.wishlistRoutes);
app.use("/api/disputes", disputeRoutes_1.disputeRoutes);
app.use("/api/admin", adminRoutes_1.adminRoutes);
app.use("/api/chatbot", chatbotRoutes_1.chatbotRoutes);
app.use("/api/logistics", logisticsRoutes_1.logisticsRoutes);
app.use("/api/notifications", notificationRoutes_1.notificationRoutes);
app.use("/api/users", userRoutes_1.default);
// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res
        .status(500)
        .json({ success: false, message: "Server Error", error: err.message });
});
// Start SERVER
if (require.main === module) {
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Swagger Docs available at http://localhost:${PORT}/api-docs`);
        console.log(`Socket.io is ready`);
    });
}
exports.default = app;
//# sourceMappingURL=app.js.map