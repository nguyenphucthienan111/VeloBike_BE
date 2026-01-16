import { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import { Upload } from "../models/Upload";

// Helper to configure cloudinary
const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

export class UploadController {
  static async uploadImage(req: any, res: any) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: "No file uploaded" });
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      configureCloudinary();

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "velobike_listings",
      });

      // Save to database
      await Upload.create({
        userId,
        publicId: result.public_id,
        url: result.secure_url,
        folder: "velobike_listings",
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
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

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      configureCloudinary();

      const uploadPromises = req.files.map((file: any) => 
        cloudinary.uploader.upload(file.path, { folder: "velobike_360" })
      );

      const results = await Promise.all(uploadPromises);
      
      // Save all to database
      const uploadDocs = results.map((r: any) => ({
        userId,
        publicId: r.public_id,
        url: r.secure_url,
        folder: "velobike_360",
        width: r.width,
        height: r.height,
        format: r.format,
        size: r.bytes,
      }));
      await Upload.insertMany(uploadDocs);

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

  // GET /api/upload/my-images - List user's uploaded images only
  static async getMyImages(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const folder = req.query.folder as string;
      const limit = parseInt(req.query.limit as string) || 50;

      // Query from database - only user's images
      const query: any = { userId };
      if (folder) {
        query.folder = folder;
      }

      const images = await Upload.find(query)
        .sort({ createdAt: -1 })
        .limit(limit);

      const total = await Upload.countDocuments(query);

      res.json({
        success: true,
        count: images.length,
        total,
        data: images.map(img => ({
          public_id: img.publicId,
          url: img.url,
          width: img.width,
          height: img.height,
          format: img.format,
          size: img.size,
          createdAt: img.createdAt,
        })),
      });
    } catch (error: any) {
      console.error("Get images error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // DELETE /api/upload/:publicId - Delete an image (only owner can delete)
  static async deleteImage(req: any, res: Response) {
    try {
      const { publicId } = req.params;
      const userId = req.user?.id;
      
      if (!publicId) {
        return res.status(400).json({ success: false, message: "Public ID is required" });
      }

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      // Decode the publicId (it may contain slashes encoded as %2F)
      const decodedPublicId = decodeURIComponent(publicId);
      
      // Check ownership
      const upload = await Upload.findOne({ publicId: decodedPublicId });
      if (!upload) {
        return res.status(404).json({ success: false, message: "Image not found" });
      }

      if (upload.userId.toString() !== userId && req.user?.role !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Bạn không có quyền xóa ảnh này" });
      }

      configureCloudinary();
      
      const result = await cloudinary.uploader.destroy(decodedPublicId);

      if (result.result === "ok" || result.result === "not found") {
        // Remove from database
        await Upload.deleteOne({ publicId: decodedPublicId });
        res.json({ success: true, message: "Image deleted successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to delete image" });
      }
    } catch (error: any) {
      console.error("Delete image error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
