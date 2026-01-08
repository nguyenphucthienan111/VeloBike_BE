import { Request, Response } from 'express';
import { User, UserRole } from '../models/User';

// In production, use bcryptjs for hashing and jsonwebtoken for tokens
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';

export class AuthController {
  
  // POST /api/auth/register
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, fullName, role } = req.body;

      // 1. Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ success: false, message: 'Email already registered' });
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
        role: role || UserRole.GUEST
      });

      await newUser.save();

      res.status(201).json({ 
        success: true, 
        message: 'User registered successfully',
        user: { id: newUser._id, email: newUser.email, role: newUser.role }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/auth/login
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // 1. Find User
      const user = await User.findOne({ email });
      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      // 2. Check Password (Simulation)
      // const isMatch = await bcrypt.compare(password, user.passwordHash);
      const isMatch = user.passwordHash === `hashed_${password}`; // Mock check

      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
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
          role: user.role
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}