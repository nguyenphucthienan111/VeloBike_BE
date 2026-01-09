import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, UserRole } from "../models/User";

// Extend Express Request to include user info
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
  };
}

// 1. Verify Token Middleware
export const protect = async (req: any, res: any, next: NextFunction) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const secret = process.env.JWT_SECRET || "dev_secret";
      const decoded: any = jwt.verify(token, secret);

      // Check if user exists in DB
      const user = await User.findById(decoded.id).select("-passwordHash");
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "User not found" });
      }

      req.user = {
        id: user._id.toString(),
        role: user.role,
      };
      next();
    } catch (error) {
      res
        .status(401)
        .json({ success: false, message: "Not authorized, token failed" });
    }
  } else {
    res
      .status(401)
      .json({ success: false, message: "Not authorized, no token" });
  }
};

// 2. Role Restriction Middleware
export const authorize = (...roles: UserRole[]) => {
  return (req: any, res: any, next: NextFunction) => {
    const authReq = req as any;

    if (!authReq.user) {
      return res
        .status(401)
        .json({ success: false, message: "User context missing" });
    }

    if (!roles.includes(authReq.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${authReq.user.role} is not authorized to access this route`,
      });
    }

    next();
  };
};
