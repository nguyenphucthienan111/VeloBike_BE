"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const cloudinary_1 = require("cloudinary");
const Upload_1 = require("../models/Upload");
// Helper to configure cloudinary
const configureCloudinary = () => {
    cloudinary_1.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
};
class UploadController {
    static uploadImage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                if (!req.file) {
                    res.status(400).json({ success: false, message: "No file uploaded" });
                    return;
                }
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({ success: false, message: "Unauthorized" });
                }
                configureCloudinary();
                const result = yield cloudinary_1.v2.uploader.upload(req.file.path, {
                    folder: "velobike_listings",
                });
                // Save to database
                yield Upload_1.Upload.create({
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
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    static upload360(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                if (!req.files || req.files.length === 0) {
                    return res.status(400).json({ success: false, message: "No files uploaded" });
                }
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({ success: false, message: "Unauthorized" });
                }
                configureCloudinary();
                const uploadPromises = req.files.map((file) => cloudinary_1.v2.uploader.upload(file.path, { folder: "velobike_360" }));
                const results = yield Promise.all(uploadPromises);
                // Save all to database
                const uploadDocs = results.map((r) => ({
                    userId,
                    publicId: r.public_id,
                    url: r.secure_url,
                    folder: "velobike_360",
                    width: r.width,
                    height: r.height,
                    format: r.format,
                    size: r.bytes,
                }));
                yield Upload_1.Upload.insertMany(uploadDocs);
                const urls = results.map((r) => r.secure_url);
                res.json({
                    success: true,
                    count: urls.length,
                    data: urls,
                });
            }
            catch (error) {
                console.error("360 Upload Error:", error);
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // GET /api/upload/my-images - List user's uploaded images only
    static getMyImages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({ success: false, message: "Unauthorized" });
                }
                const folder = req.query.folder;
                const limit = parseInt(req.query.limit) || 50;
                // Query from database - only user's images
                const query = { userId };
                if (folder) {
                    query.folder = folder;
                }
                const images = yield Upload_1.Upload.find(query)
                    .sort({ createdAt: -1 })
                    .limit(limit);
                const total = yield Upload_1.Upload.countDocuments(query);
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
            }
            catch (error) {
                console.error("Get images error:", error);
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // DELETE /api/upload/:publicId - Delete an image (only owner can delete)
    static deleteImage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { publicId } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!publicId) {
                    return res.status(400).json({ success: false, message: "Public ID is required" });
                }
                if (!userId) {
                    return res.status(401).json({ success: false, message: "Unauthorized" });
                }
                // Decode the publicId (it may contain slashes encoded as %2F)
                const decodedPublicId = decodeURIComponent(publicId);
                // Check ownership
                const upload = yield Upload_1.Upload.findOne({ publicId: decodedPublicId });
                if (!upload) {
                    return res.status(404).json({ success: false, message: "Image not found" });
                }
                if (upload.userId.toString() !== userId && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== "ADMIN") {
                    return res.status(403).json({ success: false, message: "Bạn không có quyền xóa ảnh này" });
                }
                configureCloudinary();
                const result = yield cloudinary_1.v2.uploader.destroy(decodedPublicId);
                if (result.result === "ok" || result.result === "not found") {
                    // Remove from database
                    yield Upload_1.Upload.deleteOne({ publicId: decodedPublicId });
                    res.json({ success: true, message: "Image deleted successfully" });
                }
                else {
                    res.status(500).json({ success: false, message: "Failed to delete image" });
                }
            }
            catch (error) {
                console.error("Delete image error:", error);
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
}
exports.UploadController = UploadController;
//# sourceMappingURL=UploadController.js.map