import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

/**
 * API Key validation middleware
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers["x-api-key"] as string;
  const validApiKeys = process.env.VALID_API_KEYS?.split(",") || [];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: "API key is required",
    });
  }

  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      message: "Invalid API key",
    });
  }

  next();
};

/**
 * Webhook signature validation
 */
export const validateWebhookSignature = (secret: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers["x-signature"] as string;
    const body = JSON.stringify(req.body);

    if (!signature) {
      return res.status(401).json({
        success: false,
        message: "Webhook signature is required",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(401).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    next();
  };
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // Enable XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  // Strict transport security (HTTPS only)
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  
  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:;"
  );

  next();
};

/**
 * Request sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Remove potentially dangerous characters from string inputs
  const sanitizeString = (str: string): string => {
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
              .replace(/javascript:/gi, "")
              .replace(/on\w+\s*=/gi, "");
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === "string") {
      return sanitizeString(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === "object") {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

/**
 * IP whitelist middleware (for admin endpoints)
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"];
    
    if (!clientIP || !allowedIPs.includes(clientIP as string)) {
      return res.status(403).json({
        success: false,
        message: "Access denied from this IP address",
      });
    }

    next();
  };
};

/**
 * Request size limiter
 */
export const requestSizeLimiter = (maxSize: string = "10mb") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers["content-length"];
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        return res.status(413).json({
          success: false,
          message: "Request entity too large",
        });
      }
    }

    next();
  };
};

/**
 * Parse size string to bytes
 */
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || "b";

  return Math.floor(value * units[unit]);
}