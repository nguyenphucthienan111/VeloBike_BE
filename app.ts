import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import { authRoutes } from "./routes/authRoutes";
import { listingRoutes } from "./routes/listingRoutes";
import { orderRoutes } from "./routes/orderRoutes";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json() as any);

// --- SWAGGER CONFIGURATION ---
// Fix for Windows: Normalize path separators to forward slashes for glob patterns
const routesPath = path.join(__dirname, "routes", "*.ts").replace(/\\/g, "/");

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "VeloBike API Documentation",
      version: "1.0.0",
      description: "API documentation for VeloBike C2C Marketplace",
      contact: {
        name: "VeloBike Support",
        email: "support@velobike.com",
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Local Development Server",
      },
    ],
    tags: [
      { name: "Auth", description: "User authentication and registration" },
      { name: "Listings", description: "Bike management APIs" },
      {
        name: "Orders",
        description: "Order processing and State Machine transitions",
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
            id: { type: "string" },
            email: { type: "string" },
            fullName: { type: "string" },
            role: {
              type: "string",
              enum: ["GUEST", "BUYER", "SELLER", "INSPECTOR", "ADMIN"],
            },
          },
        },
        Listing: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            price: { type: "number" },
            type: {
              type: "string",
              enum: ["ROAD", "MTB", "GRAVEL", "TRIATHLON"],
            },
          },
        },
      },
    },
  },
  // Use the normalized absolute path
  apis: [routesPath],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve as any, swaggerUi.setup(swaggerDocs));

// Database Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/velobike";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err: any) => console.error("❌ MongoDB Connection Error:", err));

// --- ROUTES ---
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/orders", orderRoutes);

// Base Route
app.get("/", (req, res) => {
  res.send(`
    <h1>VeloBike Backend API 🚀</h1>
    <p>Server is running.</p>
    <a href="/api-docs">👉 Click here to view Swagger API Documentation</a>
  `);
});

// Error Handling Middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ success: false, message: "Server Error", error: err.message });
});

// Only start if not imported (for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger Docs available at http://localhost:${PORT}/api-docs`);
  });
}

export default app;
