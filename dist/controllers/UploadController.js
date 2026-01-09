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
// Mock Upload for now to avoid crashing if you don't have Cloudinary keys yet.
// In production, uncomment Cloudinary logic.
class UploadController {
    static uploadImage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.file) {
                    res.status(400).json({ success: false, message: "No file uploaded" });
                    return;
                }
                cloudinary_1.v2.config({
                    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                    api_key: process.env.CLOUDINARY_API_KEY,
                    api_secret: process.env.CLOUDINARY_API_SECRET,
                });
                const result = yield cloudinary_1.v2.uploader.upload(req.file.path, {
                    folder: "velobike_listings",
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
}
exports.UploadController = UploadController;
//# sourceMappingURL=UploadController.js.map