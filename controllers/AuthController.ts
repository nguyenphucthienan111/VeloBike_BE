import { Request, Response } from "express";
import { User, UserRole } from "../models/User";

// In production, use bcryptjs for hashing and jsonwebtoken for tokens
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import { OAuth2Client } from 'google-auth-library'; // Install this for real implementation

export class AuthController {
  // POST /api/auth/register
  static async register(req: any, res: any): Promise<void> {
    try {
      const { email, password, fullName, role } = req.body;

      // 1. Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res
          .status(400)
          .json({ success: false, message: "Email already registered" });
        return;
      }

      // 2. Hash Password (Simulation)
      // const salt = await bcrypt.genSalt(10);
      // const passwordHash = await bcrypt.hash(password, salt);
      const passwordHash = `hashed_${password}`; // Mock hashing

      // 3. Create User
      const newUser = new User({
        email,
        passwordHash,
        fullName,
        role: role || UserRole.GUEST,
      });

      await newUser.save();

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: { id: newUser._id, email: newUser.email, role: newUser.role },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/auth/login
  static async login(req: any, res: any): Promise<void> {
    try {
      const { email, password } = req.body;

      // 1. Find User
      const user = await User.findOne({ email });
      if (!user) {
        res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });
        return;
      }

      // 2. Check Password (Simulation)
      // const isMatch = await bcrypt.compare(password, user.passwordHash);
      // NOTE: Users created via Google might not have a passwordHash
      if (!user.passwordHash) {
        res
          .status(400)
          .json({ success: false, message: "Please login with Google" });
        return;
      }

      const isMatch = user.passwordHash === `hashed_${password}`; // Mock check

      if (!isMatch) {
        res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });
        return;
      }

      // 3. Generate Token (Mock)
      const token = `mock_jwt_token_${user._id}`;

      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          avatar: user.avatar,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/auth/google
  static async googleLogin(req: any, res: any): Promise<void> {
    try {
      const { googleToken } = req.body;

      // --- REAL WORLD IMPLEMENTATION ---
      // const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      // const ticket = await client.verifyIdToken({
      //   idToken: googleToken,
      //   audience: process.env.GOOGLE_CLIENT_ID,
      // });
      // const payload = ticket.getPayload();
      // ---------------------------------

      // --- SIMULATION FOR DEMO ---
      // Assuming the frontend sends a mock token or valid structure
      const payload = {
        email: "demo.google@example.com",
        name: "Google User Demo",
        sub: "google_id_12345", // Google ID
        picture: "https://lh3.googleusercontent.com/a-/AOh14Gj...",
      };

      if (!payload || !payload.email) {
        res
          .status(400)
          .json({ success: false, message: "Invalid Google Token" });
        return;
      }

      // 1. Check if user exists
      let user = await User.findOne({ email: payload.email });

      if (user) {
        // If user exists but no googleId, link it
        if (!user.googleId) {
          user.googleId = payload.sub;
          user.avatar = user.avatar || payload.picture;
          await user.save();
        }
      } else {
        // Create new user from Google info
        user = new User({
          email: payload.email,
          fullName: payload.name,
          googleId: payload.sub,
          avatar: payload.picture,
          role: UserRole.BUYER, // Default role
          kycStatus: "PENDING",
        });
        await user.save();
      }

      // 2. Generate Token
      const token = `mock_jwt_token_${user._id}`;

      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          avatar: user.avatar,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
