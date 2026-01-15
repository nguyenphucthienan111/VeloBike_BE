import { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";

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

      configureCloudinary();

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

      configureCloudinary();

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

  // GET /api/upload/my-images - List all uploaded images
  static async getMyImages(req: any, res: Response) {
    try {
      configureCloudinary();

      const folder = (req.query.folder as string) || "velobike_listings";
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await cloudinary.search
        .expression(`folder:${folder}`)
        .sort_by("created_at", "desc")
        .max_results(limit)
        .execute();

      const images = result.resources.map((img: any) => ({
        public_id: img.public_id,
        url: img.secure_url,
        width: img.width,
        height: img.height,
        format: img.format,
        size: img.bytes,
        createdAt: img.created_at,
      }));

      res.json({
        success: true,
        count: images.length,
        total: result.total_count,
        data: images,
      });
    } catch (error: any) {
      console.error("Get images error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // DELETE /api/upload/:publicId - Delete an image
  static async deleteImage(req: any, res: Response) {
    try {
      const { publicId } = req.params;
      
      if (!publicId) {
        return res.status(400).json({ success: false, message: "Public ID is required" });
      }

      configureCloudinary();

      // Decode the publicId (it may contain slashes encoded as %2F)
      const decodedPublicId = decodeURIComponent(publicId);
      
      const result = await cloudinary.uploader.destroy(decodedPublicId);

      if (result.result === "ok") {
        res.json({ success: true, message: "Image deleted successfully" });
      } else {
        res.status(404).json({ success: false, message: "Image not found or already deleted" });
      }
    } catch (error: any) {
      console.error("Delete image error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
