import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";

interface LogEntry {
  timestamp: string;
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  userId?: string;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

/**
 * Request logger middleware
 */
export const requestLogger = (req: any, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalSend = res.send;

  // Capture response
  res.send = function (body: any) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers["user-agent"] || "",
      userId: req.user?.id,
      statusCode: res.statusCode,
      responseTime,
    };

    // Log errors separately
    if (res.statusCode >= 400) {
      logEntry.error = body;
    }

    // Write to log file
    writeLog(logEntry);

    // Call original send
    return originalSend.call(this, body);
  };

  next();
};

/**
 * Error logger middleware
 */
export const errorLogger = (err: any, req: any, res: Response, next: NextFunction) => {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers["user-agent"] || "",
    userId: req.user?.id,
    statusCode: res.statusCode || 500,
    error: err.message || err,
  };

  writeLog(logEntry, "error");
  next(err);
};

/**
 * Security event logger
 */
export const logSecurityEvent = (
  event: string,
  details: any,
  req?: Request,
  severity: "low" | "medium" | "high" = "medium"
) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    details,
    ip: req?.ip,
    userAgent: req?.headers["user-agent"],
    url: req?.originalUrl,
  };

  writeLog(logEntry, "security");
};

/**
 * Write log entry to file
 */
function writeLog(logEntry: any, type: "access" | "error" | "security" = "access") {
  try {
    const logsDir = path.join(process.cwd(), "logs");
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const date = new Date().toISOString().split("T")[0];
    const filename = `${type}-${date}.log`;
    const filepath = path.join(logsDir, filename);

    const logLine = JSON.stringify(logEntry) + "\n";

    fs.appendFileSync(filepath, logLine);

    // Also log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[${type.toUpperCase()}]`, logEntry);
    }
  } catch (error) {
    console.error("Failed to write log:", error);
  }
}

/**
 * Performance monitoring middleware
 */
export const performanceMonitor = (req: any, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();

  res.on("finish", () => {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();

    const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    // Log slow requests (> 1 second)
    if (responseTime > 1000) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        type: "slow_request",
        method: req.method,
        url: req.originalUrl,
        responseTime: `${responseTime.toFixed(2)}ms`,
        memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
        userId: req.user?.id,
      };

      writeLog(logEntry, "performance" as any);
    }
  });

  next();
};

/**
 * API usage analytics
 */
export const apiAnalytics = (req: any, res: Response, next: NextFunction) => {
  res.on("finish", () => {
    const analyticsEntry = {
      timestamp: new Date().toISOString(),
      endpoint: req.route?.path || req.originalUrl,
      method: req.method,
      statusCode: res.statusCode,
      userId: req.user?.id,
      userRole: req.user?.role,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    // In production, this would be sent to analytics service
    // For now, just log to file
    writeLog(analyticsEntry, "analytics" as any);
  });

  next();
};