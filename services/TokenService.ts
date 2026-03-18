import jwt from "jsonwebtoken";
import crypto from "crypto";
import { UserToken } from "../models/UserToken";

export class TokenService {
  private static JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
  
  // Token expiration times
  private static ACCESS_TOKEN_EXPIRY = "1h"; // 1 hour

  /**
   * Generate access token (short-lived)
   */
  static generateAccessToken(user: any): string {
    const payload = { 
      id: user._id.toString(), 
      role: user.role,
      type: "access"
    };
    
    return jwt.sign(payload, this.JWT_SECRET, { 
      expiresIn: this.ACCESS_TOKEN_EXPIRY 
    } as jwt.SignOptions);
  }

  /**
   * Generate refresh token (long-lived) and store in database
   * Revokes previous tokens from the same device to prevent accumulation
   */
  static async generateRefreshToken(
    userId: string, 
    deviceInfo?: { userAgent?: string; ipAddress?: string; deviceId?: string }
  ): Promise<string> {
    // Revoke existing tokens for this user+device combo to avoid accumulation
    if (deviceInfo?.userAgent) {
      await UserToken.deleteMany({
        userId,
        tokenType: "REFRESH",
        "deviceInfo.userAgent": deviceInfo.userAgent,
      });
    }

    // Generate secure random token
    const tokenString = crypto.randomBytes(64).toString('hex');
    
    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Store in database
    const userToken = new UserToken({
      userId,
      token: tokenString,
      tokenType: "REFRESH",
      expiresAt,
      deviceInfo,
    });

    await userToken.save();
    return tokenString;
  }

  /**
   * Generate both access and refresh tokens
   */
  static async generateTokenPair(
    user: any,
    deviceInfo?: { userAgent?: string; ipAddress?: string; deviceId?: string }
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user._id.toString(), deviceInfo);

    return { accessToken, refreshToken };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new Error("Invalid or expired access token");
    }
  }

  /**
   * Verify refresh token and get user
   */
  static async verifyRefreshToken(token: string): Promise<any> {
    // Find token in database
    const userToken = await UserToken.findOne({
      token,
      tokenType: "REFRESH",
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    }).populate("userId");

    if (!userToken) {
      throw new Error("Invalid or expired refresh token");
    }

    // Update last used time
    userToken.lastUsedAt = new Date();
    await userToken.save();

    return userToken.userId;
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; user: any }> {
    const user = await this.verifyRefreshToken(refreshToken);
    const accessToken = this.generateAccessToken(user);

    return { accessToken, user };
  }

  /**
   * Revoke refresh token (logout)
   */
  static async revokeRefreshToken(token: string): Promise<boolean> {
    const result = await UserToken.updateOne(
      { token, tokenType: "REFRESH" },
      { isRevoked: true }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Revoke all refresh tokens for user (logout all devices)
   */
  static async revokeAllUserTokens(userId: string): Promise<number> {
    const result = await UserToken.updateMany(
      { userId, tokenType: "REFRESH", isRevoked: false },
      { isRevoked: true }
    );

    return result.modifiedCount;
  }

  /**
   * Get user's active sessions
   */
  static async getUserActiveSessions(userId: string): Promise<any[]> {
    const sessions = await UserToken.find({
      userId,
      tokenType: "REFRESH",
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    }).select("deviceInfo lastUsedAt createdAt").sort({ lastUsedAt: -1 });

    return sessions;
  }

  /**
   * Clean up expired tokens (run as cron job)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    const result = await UserToken.deleteMany({
      expiresAt: { $lt: new Date() }
    });

    return result.deletedCount;
  }

  /**
   * Extract device info from request
   */
  static extractDeviceInfo(req: any): { userAgent?: string; ipAddress?: string; deviceId?: string } {
    return {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
      deviceId: req.get('X-Device-ID'), // Custom header if frontend sends it
    };
  }
}