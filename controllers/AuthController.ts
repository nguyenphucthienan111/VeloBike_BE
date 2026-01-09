import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { User, UserRole, KycStatus } from "../models/User";

// Simple in-memory OTP store for demo (replace with persistent store in production)
const otpStore: Record<string, { code: string; expiresAt: number }> = {};

function generateToken(user: any) {
  const payload = { id: user._id.toString(), role: user.role };
  const secret = process.env.JWT_SECRET || "dev_secret";
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export class AuthController {
  // POST /api/auth/register
  static async register(req: Request, res: Response) {
    try {
      const { email, password, fullName, role } = req.body;

      if (!email || !password || !fullName) {
        return res.status(400).json({ success: false, message: "Missing fields" });
      }

      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ success: false, message: "Email already registered" });

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newUser = new User({
        email,
        passwordHash,
        fullName,
        role: role || UserRole.BUYER,
        kycStatus: KycStatus.PENDING,
      });

      await newUser.save();

      const token = generateToken(newUser);

      res.status(201).json({ success: true, token, user: { id: newUser._id, email: newUser.email, fullName: newUser.fullName, role: newUser.role } });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST /api/auth/login
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ success: false, message: "Missing credentials" });

      const user = await User.findOne({ email });
      if (!user || !user.passwordHash) return res.status(401).json({ success: false, message: "Invalid credentials" });

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) return res.status(401).json({ success: false, message: "Invalid credentials" });

      const token = generateToken(user);
      res.json({ success: true, token, user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role } });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST /api/auth/google
  // Verify Google ID token and create/link user
  static async googleLogin(req: Request, res: Response) {
    try {
      const { googleToken } = req.body;
      if (!googleToken) return res.status(400).json({ success: false, message: "googleToken is required" });

      // Verify token with Google
      const ticket = await googleClient.verifyIdToken({ idToken: googleToken, audience: GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();

      if (!payload || !payload.email) return res.status(400).json({ success: false, message: "Invalid Google token" });

      const email = payload.email;
      const googleId = payload.sub;
      const name = payload.name || "Google User";
      const picture = (payload.picture as string) || undefined;

      let user = await User.findOne({ email });
      if (user) {
        if (!user.googleId) {
          user.googleId = googleId;
          user.avatar = user.avatar || picture;
          await user.save();
        }
      } else {
        user = new User({
          email,
          fullName: name,
          googleId,
          avatar: picture,
          role: UserRole.BUYER,
          kycStatus: KycStatus.PENDING,
        });
        await user.save();
      }

      const token = generateToken(user);
      res.json({ success: true, token, user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role } });
    } catch (err: any) {
      console.error("Google login error:", err.message || err);
      res.status(500).json({ success: false, message: err.message || "Google authentication failed" });
    }
  }

  // POST /api/auth/send-otp
  // Body: { phone }
  static async sendOtp(req: Request, res: Response) {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ success: false, message: "Phone is required" });

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
      otpStore[phone] = { code, expiresAt };

      // TODO: integrate with SMS provider here
      console.log(`OTP for ${phone}: ${code}`);

      res.json({ success: true, message: "OTP sent (demo)" });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST /api/auth/verify-otp
  // Body: { phone, code }
  static async verifyOtp(req: Request, res: Response) {
    try {
      const { phone, code } = req.body;
      if (!phone || !code) return res.status(400).json({ success: false, message: "Phone and code required" });

      const record = otpStore[phone];
      if (!record) return res.status(400).json({ success: false, message: "No OTP found" });
      if (Date.now() > record.expiresAt) return res.status(400).json({ success: false, message: "OTP expired" });
      if (record.code !== code) return res.status(400).json({ success: false, message: "Invalid OTP" });

      // OTP valid. Find or create user by phone
      let user = await User.findOne({ phone });
      if (!user) {
        user = new User({ email: `phone_${phone}@velobike.local`, fullName: `Phone User ${phone}`, phone, role: UserRole.BUYER, kycStatus: KycStatus.PENDING });
        await user.save();
      }

      // Create token
      const token = generateToken(user);

      // Clean up OTP
      delete otpStore[phone];

      res.json({ success: true, token, user: { id: user._id, email: user.email, fullName: user.fullName, phone: user.phone } });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
