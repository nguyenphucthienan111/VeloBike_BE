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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
// 1. Verify Token Middleware
const protect = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let token;
    if (req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const secret = process.env.JWT_SECRET || "dev_secret";
            const decoded = jsonwebtoken_1.default.verify(token, secret);
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
//# sourceMappingURL=authMiddleware.js.map