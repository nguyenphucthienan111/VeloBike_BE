import dotenv from "dotenv";
// Load .env as early as possible so EmailService and other modules read config
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import fs from "fs"; // Import File System
import { createServer } from "http";
import { Server } from "socket.io";

// Import Security Middleware
import { generalLimiter, authLimiter, paymentLimiter, uploadLimiter, searchLimiter } from "./middleware/rateLimitMiddleware";
import { securityHeaders, sanitizeInput, requestSizeLimiter } from "./middleware/securityMiddleware";
import { requestLogger, errorLogger, performanceMonitor, apiAnalytics } from "./middleware/requestLoggerMiddleware";

// Import Services
import { CacheService } from "./services/CacheService";
import { AlertService } from "./services/AlertService";

// Import Routes
import { authRoutes } from "./routes/authRoutes";
import { listingRoutes } from "./routes/listingRoutes";
import { orderRoutes } from "./routes/orderRoutes";
import { inspectionRoutes } from "./routes/inspectionRoutes";
import { paymentRoutes } from "./routes/paymentRoutes";
import { uploadRoutes } from "./routes/uploadRoutes";
import { reviewRoutes } from "./routes/reviewRoutes";
import { messageRoutes } from "./routes/messageRoutes";
import { wishlistRoutes } from "./routes/wishlistRoutes";
import { disputeRoutes } from "./routes/disputeRoutes";
import { adminRoutes } from "./routes/adminRoutes";
import { chatbotRoutes } from "./routes/chatbotRoutes";
import { logisticsRoutes } from "./routes/logisticsRoutes";
import { notificationRoutes } from "./routes/notificationRoutes";
import { kycRoutes } from "./routes/kycRoutes";
import { dashboardRoutes } from "./routes/dashboardRoutes";
import { recommendationRoutes } from "./routes/recommendationRoutes";
import { alertRoutes } from "./routes/alertRoutes";
import { fraudRoutes } from "./routes/fraudRoutes";
import { bulkRoutes } from "./routes/bulkRoutes";
import { reportRoutes } from "./routes/reportRoutes";
import { transactionRoutes } from "./routes/transactionRoutes";
import { subscriptionRoutes } from "./routes/subscriptionRoutes";
import userRoutes from "./routes/userRoutes";

// Import Subscription Service for initialization
import { SubscriptionService } from "./services/SubscriptionService";

// Initialize App & Socket.io
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5000;

// Initialize Cache Service only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  CacheService.init().catch(console.error);
  
  // Start alert processing
  AlertService.startAlertProcessing();
  
  // Initialize default subscription plans
  SubscriptionService.initializeDefaultPlans().catch(console.error);
}

// Ensure uploads directory exists (Task B4 Fix)
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log("Created uploads directory");
}

// Security Middleware (Apply early)
app.use(securityHeaders);
app.use(requestSizeLimiter("50mb")); // Limit request size
app.use(cors());
app.use(express.json() as any);
app.use(sanitizeInput); // Sanitize inputs

// Logging Middleware
app.use(requestLogger);
app.use(performanceMonitor);
app.use(apiAnalytics);

// General Rate Limiting (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use(generalLimiter);
}

// Inject Socket.io into Request object so Controllers can use it
app.use((req: any, res, next) => {
  req.io = io;
  next();
});

// Serve uploaded files statically so frontend can view them
app.use("/uploads", express.static(path.join(__dirname, "uploads")) as any);

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
const routesPath = path.join(__dirname, "routes", "*.ts").replace(/\\/g, "/");

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

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve as any, swaggerUi.setup(swaggerDocs));

// Database Connection (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/velobike";
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err: any) => console.error("❌ MongoDB Connection Error:", err));
}

// --- ROUTES REGISTRATION WITH SPECIFIC RATE LIMITING ---
const authLimiterMiddleware = process.env.NODE_ENV === 'test' ? [] : [authLimiter];
const searchLimiterMiddleware = process.env.NODE_ENV === 'test' ? [] : [searchLimiter];
const paymentLimiterMiddleware = process.env.NODE_ENV === 'test' ? [] : [paymentLimiter];
const uploadLimiterMiddleware = process.env.NODE_ENV === 'test' ? [] : [uploadLimiter];

app.use("/api/auth", ...authLimiterMiddleware, authRoutes);
app.use("/api/listings", ...searchLimiterMiddleware, listingRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/inspections", inspectionRoutes);
app.use("/api/payment", ...paymentLimiterMiddleware, paymentRoutes);
app.use("/api/upload", ...uploadLimiterMiddleware, uploadRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/logistics", logisticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/fraud", fraudRoutes);
app.use("/api/bulk", bulkRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

// Health Check Endpoint
app.get("/health", async (req, res) => {
  const cacheStats = await CacheService.getStats();
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cache: cacheStats ? "Connected" : "Disconnected",
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  });
});

// Error Handling Middleware (Must be last)
app.use(errorLogger);
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ success: false, message: "Server Error", error: err.message });
});

// Graceful Shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await CacheService.close();
  await mongoose.connection.close();
  httpServer.close(() => {
    console.log("Process terminated");
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await CacheService.close();
  await mongoose.connection.close();
  httpServer.close(() => {
    console.log("Process terminated");
  });
});

// Start SERVER
if (require.main === module) {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger Docs available at http://localhost:${PORT}/api-docs`);
    console.log(`Health Check available at http://localhost:${PORT}/health`);
    console.log(`Socket.io is ready`);
  });
}

export default app;
