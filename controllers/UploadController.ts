import { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";

// Mock Upload for now to avoid crashing if you don't have Cloudinary keys yet.
// In production, uncomment Cloudinary logic.

export class UploadController {
  static async uploadImage(req: any, res: any) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: "No file uploaded" });
        return;
      }

      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "velobike_listings",
      });

      res.json({
        success: true,
        data: {
          url: result.secure_url,
          public_id: result.public_id,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async upload360(req: any, res: any) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: "No files uploaded" });
      }

      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const uploadPromises = req.files.map((file: any) => 
        cloudinary.uploader.upload(file.path, { folder: "velobike_360" })
      );

      const results = await Promise.all(uploadPromises);
      const urls = results.map((r: any) => r.secure_url);

      res.json({
        success: true,
        count: urls.length,
        data: urls,
      });
    } catch (error: any) {
      console.error("360 Upload Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
