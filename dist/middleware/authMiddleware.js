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
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.protect = void 0;
const User_1 = require("../models/User");
// 1. Verify Token Middleware
const protect = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let token;
    if (req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")) {
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
                const role = Object.values(User_1.UserRole).includes(roleStr)
                    ? roleStr
                    : User_1.UserRole.BUYER;
                req.user = {
                    id: userId,
                    role: role,
                };
                next();
            }
            else {
                res
                    .status(401)
                    .json({
                    success: false,
                    message: "Not authorized, token format invalid",
                });
            }
            // -----------------------------------
        }
        catch (error) {
            res
                .status(401)
                .json({ success: false, message: "Not authorized, token failed" });
        }
    }
    else {
        res
            .status(401)
            .json({ success: false, message: "Not authorized, no token" });
    }
});
exports.protect = protect;
// 2. Role Restriction Middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        const authReq = req;
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
exports.authorize = authorize;
//# sourceMappingURL=authMiddleware.js.map