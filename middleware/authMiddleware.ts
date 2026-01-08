import { Request, Response, NextFunction } from "express";
import { UserRole } from "../models/User";

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

      // --- REAL JWT VERIFICATION LOGIC (Commented out for demo) ---
      // const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
      // req.user = { id: decoded.id, role: decoded.role };

      // --- UPDATED MOCK LOGIC FOR DEMO ---
      // Format token để test: "mock_jwt_token_{USER_ID}_{ROLE}"
      // Ví dụ: "Bearer mock_jwt_token_123_SELLER" -> UserID: 123, Role: SELLER
      if (token.startsWith("mock_jwt_token_")) {
        const parts = token.split("_");
        // parts[0]=mock, [1]=jwt, [2]=token, [3]=UserId, [4]=Role (Optional)

        const userId = parts[3] || "default_user_id";
        const roleStr = parts[4] ? parts[4].toUpperCase() : "BUYER";

        // Validate Role
        const role = Object.values(UserRole).includes(roleStr as UserRole)
          ? (roleStr as UserRole)
          : UserRole.BUYER;

        req.user = {
          id: userId,
          role: role,
        };
        next();
      } else {
        res
          .status(401)
          .json({
            success: false,
            message: "Not authorized, token format invalid",
          });
      }
      // -----------------------------------
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
