import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { User, UserRole, KycStatus } from "../models/User";
import { Otp } from "../models/Otp";
import { EmailService } from "../services/EmailService";
import { TokenService } from "../services/TokenService";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export class AuthController {
  // POST /api/auth/register
  // Creates user (email not verified yet) and sends verification OTP to email
  static async register(req: Request, res: Response) {
    try {
      const { email, password, fullName, role } = req.body;

      if (!email || !password || !fullName) {
        return res
          .status(400)
          .json({ success: false, message: "Missing fields" });
      }

      const existing = await User.findOne({ email });
      if (existing)
        return res
          .status(400)
          .json({ success: false, message: "Email already registered" });

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newUser = new User({
        email,
        passwordHash,
        fullName,
        role: role || UserRole.BUYER,
        kycStatus: KycStatus.PENDING,
        emailVerified: false,
      } as any);

      await newUser.save();

      // Generate email OTP (6 digits)
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Save to DB (upsert)
      await Otp.findOneAndUpdate(
        { identifier: `email:${email}` },
        { code, expiresAt },
        { upsert: true, new: true }
      );

      // Send verification email (best-effort)
      const subject = "VeloBike - Xác thực email của bạn";
      const html = `<p>Xin chào ${newUser.fullName},</p><p>Mã xác thực email của bạn là: <strong>${code}</strong></p><p>Mã có hiệu lực trong 15 phút.</p>`;
      // Attempt to send and log result to server console for debugging (useful when requests come from Swagger UI)
      const _sent = await EmailService.sendVerificationEmail(email, newUser.fullName, code);
      console.log(
        `AuthController.register: sendVerificationEmail -> ${email} => ${
          _sent ? "OK" : "FAILED"
        }`
      );

      // Don't return tokens until email is verified
      res.status(201).json({
        success: true,
        message: "Tài khoản đã được tạo. Vui lòng kiểm tra email để xác thực.",
        user: {
          id: newUser._id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          emailVerified: false,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST /api/auth/verify-email
  // Body: { email, code }
  static async verifyEmail(req: Request, res: Response) {
    try {
      const { email, code } = req.body;
      if (!email || !code)
        return res
          .status(400)
          .json({ success: false, message: "Email and code required" });

      const record = await Otp.findOne({ identifier: `email:${email}` });

      if (!record)
        return res
          .status(400)
          .json({
            success: false,
            message: "Invalid or expired verification code",
          });

      if (record.code !== code)
        return res
          .status(400)
          .json({ success: false, message: "Invalid verification code" });

      const user = await User.findOne({ email });
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      user.emailVerified = true;
      await user.save();

      // Clean up OTP immediately
      await Otp.deleteOne({ _id: record._id });

      const deviceInfo = TokenService.extractDeviceInfo(req);
      const { accessToken, refreshToken } = await TokenService.generateTokenPair(user, deviceInfo);
      
      res.json({
        success: true,
        message: "Email verified",
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          emailVerified: true,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST /api/auth/login
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res
          .status(400)
          .json({ success: false, message: "Missing credentials" });

      const user = await User.findOne({ email });
      if (!user || !user.passwordHash)
        return res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match)
        return res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });

      // Check if email is verified
      if (!(user as any).emailVerified) {
        return res
          .status(403)
          .json({ success: false, message: "Vui lòng xác thực email trước khi đăng nhập" });
      }

      const deviceInfo = TokenService.extractDeviceInfo(req);
      const { accessToken, refreshToken } = await TokenService.generateTokenPair(user, deviceInfo);
      
      res.json({
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          emailVerified: (user as any).emailVerified,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST /api/auth/google
  // Verify Google ID token and create/link user
  static async googleLogin(req: Request, res: Response) {
    try {
      const { googleToken } = req.body;
      if (!googleToken)
        return res
          .status(400)
          .json({ success: false, message: "googleToken is required" });

      // Verify token with Google
      const ticket = await googleClient.verifyIdToken({
        idToken: googleToken,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (!payload || !payload.email)
        return res
          .status(400)
          .json({ success: false, message: "Invalid Google token" });

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
          emailVerified: true, // Google verified
        } as any);
        await user.save();
      }

      const deviceInfo = TokenService.extractDeviceInfo(req);
      const { accessToken, refreshToken } = await TokenService.generateTokenPair(user, deviceInfo);
      
      res.json({
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      });
    } catch (err: any) {
      console.error("Google login error:", err.message || err);
      res.status(500).json({
        success: false,
        message: err.message || "Google authentication failed",
      });
    }
  }

  // POST /api/auth/facebook
  // Verify Facebook Access Token and create/link user
  // Note: In production, verify token via Graph API: https://graph.facebook.com/me?access_token=...
  static async facebookLogin(req: Request, res: Response) {
    try {
      const { facebookToken, userID } = req.body;
      if (!facebookToken || !userID)
        return res
          .status(400)
          .json({ success: false, message: "facebookToken and userID are required" });

      // Mock verification (Replace with real Graph API call)
      // const response = await axios.get(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${facebookToken}`);
      // const { id, name, email, picture } = response.data;
      
      // Simulated data for demo/stub
      const email = `fb_${userID}@velobike.local`; // Fallback if FB doesn't return email
      const name = "Facebook User";
      const picture = `https://graph.facebook.com/${userID}/picture?type=large`;

      let user = await User.findOne({ facebookId: userID });
      if (!user) {
        // Try to link by email if exists
        user = await User.findOne({ email });
        if (user) {
           user.facebookId = userID;
           await user.save();
        } else {
           user = new User({
             email,
             fullName: name,
             facebookId: userID,
             avatar: picture,
             role: UserRole.BUYER,
             kycStatus: KycStatus.PENDING,
             emailVerified: true,
           } as any);
           await user.save();
        }
      }

      const deviceInfo = TokenService.extractDeviceInfo(req);
      const { accessToken, refreshToken } = await TokenService.generateTokenPair(user, deviceInfo);
      
      res.json({
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      });
    } catch (err: any) {
      console.error("Facebook login error:", err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST /api/auth/send-otp
  // Body: { phone }
  static async sendOtp(req: Request, res: Response) {
    try {
      const { phone } = req.body;
      if (!phone)
        return res
          .status(400)
          .json({ success: false, message: "Phone is required" });

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Save to DB
      await Otp.findOneAndUpdate(
        { identifier: `phone:${phone}` },
        { code, expiresAt },
        { upsert: true, new: true }
      );

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
      if (!phone || !code)
        return res
          .status(400)
          .json({ success: false, message: "Phone and code required" });

      const record = await Otp.findOne({ identifier: `phone:${phone}` });

      if (!record)
        return res
          .status(400)
          .json({ success: false, message: "Invalid or expired OTP" });

      if (record.code !== code)
        return res.status(400).json({ success: false, message: "Invalid OTP" });

      // OTP valid. Find or create user by phone
      let user = await User.findOne({ phone });
      if (!user) {
        user = new User({
          email: `phone_${phone}@velobike.local`,
          fullName: `Phone User ${phone}`,
          phone,
          role: UserRole.BUYER,
          kycStatus: KycStatus.PENDING,
        } as any);
        await user.save();
      }

      // Create tokens using new TokenService
      const deviceInfo = TokenService.extractDeviceInfo(req);
      const { accessToken, refreshToken } = await TokenService.generateTokenPair(user, deviceInfo);

      // Clean up OTP immediately
      await Otp.deleteOne({ _id: record._id });

      res.json({
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST /api/auth/change-password
  // Body: { currentPassword, newPassword }
  // Requires Authentication Middleware
  static async changePassword(req: any, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: "Missing passwords" });
      }

      const user = await User.findById(userId);
      if (!user || !user.passwordHash) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: "Incorrect current password" });
      }

      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      await user.save();

      res.json({ success: true, message: "Password updated successfully" });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST /api/auth/forgot-password
  // Body: { email }
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, message: "Email required" });

      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      // Generate OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      await Otp.findOneAndUpdate(
        { identifier: `reset:${email}` },
        { code, expiresAt },
        { upsert: true, new: true }
      );

      // Send Email
      await EmailService.sendPasswordResetEmail(email, user.fullName, code);

      res.json({ success: true, message: "Reset OTP sent to email" });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST /api/auth/reset-password
  // Body: { email, code, newPassword }
  static async resetPassword(req: Request, res: Response) {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        return res.status(400).json({ success: false, message: "Missing fields" });
      }

      const record = await Otp.findOne({ identifier: `reset:${email}` });
      if (!record || record.code !== code || new Date() > record.expiresAt) {
        return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
      }

      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      await user.save();

      await Otp.deleteOne({ _id: record._id });

      res.json({ success: true, message: "Password reset successfully" });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST /api/auth/refresh-token
  // Body: { refreshToken }
  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: "Refresh token required" });
      }

      const { accessToken, user } = await TokenService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        accessToken,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      });
    } catch (err: any) {
      res.status(401).json({ success: false, message: err.message });
    }
  }

  // POST /api/auth/logout
  // Body: { refreshToken }
  static async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: "Refresh token required" });
      }

      const revoked = await TokenService.revokeRefreshToken(refreshToken);
      if (!revoked) {
        return res.status(400).json({ success: false, message: "Invalid refresh token" });
      }

      res.json({ success: true, message: "Logged out successfully" });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST /api/auth/logout-all
  // Logout from all devices
  static async logoutAll(req: any, res: Response) {
    try {
      const userId = req.user.id; // From auth middleware

      const revokedCount = await TokenService.revokeAllUserTokens(userId);

      res.json({ 
        success: true, 
        message: `Logged out from ${revokedCount} devices successfully` 
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // GET /api/auth/sessions
  // Get user's active sessions
  static async getActiveSessions(req: any, res: Response) {
    try {
      const userId = req.user.id;

      const sessions = await TokenService.getUserActiveSessions(userId);

      res.json({ success: true, data: sessions });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST /api/auth/kyc-submit
  // Body: { documentType, documentId, frontImage, backImage }
  static async submitKyc(req: any, res: Response) {
    try {
      const { documentType, documentId, frontImage, backImage } = req.body;
      const userId = req.user.id; // From middleware

      if (!documentType || !documentId || !frontImage || !backImage) {
        return res
          .status(400)
          .json({ success: false, message: "Missing KYC data" });
      }

      const user = await User.findById(userId);
      if (!user)
        return res.status(404).json({ success: false, message: "User not found" });

      user.kycData = {
        documentType,
        documentId,
        frontImage,
        backImage,
        verifiedAt: undefined,
      };

      // If not already verified, set to PENDING
      if (user.kycStatus !== KycStatus.VERIFIED) {
        user.kycStatus = KycStatus.PENDING;
      }

      await user.save();

      res.json({ success: true, message: "KYC data submitted for review" });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
