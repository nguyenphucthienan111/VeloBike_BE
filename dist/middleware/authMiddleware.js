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
exports.requireRole = exports.authorize = exports.protect = void 0;
const User_1 = require("../models/User");
const TokenService_1 = require("../services/TokenService");
// 1. Verify Token Middleware
const protect = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let token;
    if (req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            // Use new TokenService for verification
            const decoded = TokenService_1.TokenService.verifyAccessToken(token);
            // Check if user exists in DB
            const user = yield User_1.User.findById(decoded.id).select("-passwordHash");
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
// Alias for authorize (used in some routes)
exports.requireRole = exports.authorize;
//# sourceMappingURL=authMiddleware.js.map