import request from "supertest";
import app from "../app";
import { User } from "../models/User";
import mongoose from "mongoose";

describe("Authentication Endpoints", () => {
  beforeAll(async () => {
    // Connect to test database
    const MONGO_URI = process.env.MONGO_TEST_URI || "mongodb://localhost:27017/velobike_test";
    await mongoose.connect(MONGO_URI);
  });

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await User.deleteMany({});
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
        role: "BUYER",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("registered successfully");

      // Verify user was created in database
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeTruthy();
      expect(user?.fullName).toBe(userData.fullName);
      expect(user?.role).toBe(userData.role);
    });

    it("should not register user with existing email", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
        role: "BUYER",
      };

      // Create user first
      await request(app).post("/api/auth/register").send(userData);

      // Try to register again with same email
      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already exists");
    });

    it("should validate required fields", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          // Missing password and fullName
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it("should validate email format", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "invalid-email",
          password: "password123",
          fullName: "Test User",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Create a test user
      await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
        role: "BUYER",
      });

      // Verify email (simulate)
      await User.findOneAndUpdate(
        { email: "test@example.com" },
        { emailVerified: true }
      );
    });

    it("should login with valid credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "password123",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeTruthy();
      expect(response.body.user.email).toBe("test@example.com");
      expect(response.body.user.passwordHash).toBeUndefined(); // Should not return password
    });

    it("should not login with invalid email", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "password123",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid credentials");
    });

    it("should not login with invalid password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid credentials");
    });

    it("should not login with unverified email", async () => {
      // Create unverified user
      await request(app).post("/api/auth/register").send({
        email: "unverified@example.com",
        password: "password123",
        fullName: "Unverified User",
      });

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "unverified@example.com",
          password: "password123",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("verify your email");
    });
  });

  describe("POST /api/auth/change-password", () => {
    let authToken: string;

    beforeEach(async () => {
      // Create and login user
      await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
      });

      await User.findOneAndUpdate(
        { email: "test@example.com" },
        { emailVerified: true }
      );

      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "password123",
        });

      authToken = loginResponse.body.token;
    });

    it("should change password with valid current password", async () => {
      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          currentPassword: "password123",
          newPassword: "newpassword123",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("updated");

      // Verify can login with new password
      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "newpassword123",
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it("should not change password with invalid current password", async () => {
      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          currentPassword: "wrongpassword",
          newPassword: "newpassword123",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Incorrect current password");
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/auth/change-password")
        .send({
          currentPassword: "password123",
          newPassword: "newpassword123",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});