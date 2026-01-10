import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

// General API rate limiting
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict rate limiting for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Payment endpoint rate limiting
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // Limit each IP to 3 payment requests per minute
  message: {
    success: false,
    message: "Too many payment requests, please wait before trying again.",
  },
});

// Upload rate limiting
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 uploads per minute
  message: {
    success: false,
    message: "Too many upload requests, please wait before trying again.",
  },
});

// Search rate limiting (more lenient)
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 searches per minute
  message: {
    success: false,
    message: "Too many search requests, please slow down.",
  },
});

// Admin operations rate limiting
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit admin operations
  message: {
    success: false,
    message: "Too many admin requests, please wait.",
  },
});

// Custom rate limiter factory
export const createRateLimiter = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || "Rate limit exceeded",
    },
  });
};