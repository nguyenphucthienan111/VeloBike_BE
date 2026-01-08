import { Request, Response } from "express";
// import { v2 as cloudinary } from 'cloudinary';

// Mock Upload for now to avoid crashing if you don't have Cloudinary keys yet.
// In production, uncomment Cloudinary logic.

export class UploadController {
  static async uploadImage(req: any, res: any) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: "No file uploaded" });
        return;
      }

      // --- REAL CLOUDINARY UPLOAD LOGIC ---
      /*
      cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET 
      });

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'velobike_listings'
      });
      const url = result.secure_url;
      */

      // --- MOCK LOGIC ---
      // Return a fake URL so the frontend works
      const mockUrl = `https://mock-storage.com/uploads/${
        req.file.filename || "image.jpg"
      }`;

      res.json({
        success: true,
        data: {
          url: mockUrl,
          // public_id: result.public_id
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
