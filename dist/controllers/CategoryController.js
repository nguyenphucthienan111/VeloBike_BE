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
exports.BrandController = exports.CategoryController = void 0;
const Category_1 = require("../models/Category");
const Brand_1 = require("../models/Brand");
class CategoryController {
    // GET /api/admin/categories
    static getAll(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { isActive, page = 1, limit = 20 } = req.query;
                const query = {};
                if (isActive !== undefined) {
                    query.isActive = isActive === "true";
                }
                const categories = yield Category_1.Category.find(query)
                    .sort({ name: 1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield Category_1.Category.countDocuments(query);
                res.status(200).json({
                    success: true,
                    data: categories,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        pages: Math.ceil(total / Number(limit)),
                    },
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // POST /api/admin/categories
    static create(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, description, icon, isActive = true } = req.body;
                if (!name) {
                    return res.status(400).json({
                        success: false,
                        message: "Category name is required",
                    });
                }
                // Generate slug from name
                const slug = name
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "");
                // Check if slug already exists
                const existing = yield Category_1.Category.findOne({ slug });
                if (existing) {
                    return res.status(400).json({
                        success: false,
                        message: "Category with this name already exists",
                    });
                }
                const category = new Category_1.Category({
                    name,
                    slug,
                    description,
                    icon,
                    isActive,
                });
                yield category.save();
                res.status(201).json({
                    success: true,
                    data: category,
                });
            }
            catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
        });
    }
    // PUT /api/admin/categories/:id
    static update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { name, description, icon, isActive } = req.body;
                const updateData = {};
                if (name !== undefined)
                    updateData.name = name;
                if (description !== undefined)
                    updateData.description = description;
                if (icon !== undefined)
                    updateData.icon = icon;
                if (isActive !== undefined)
                    updateData.isActive = isActive;
                // If name changed, regenerate slug
                if (name) {
                    const slug = name
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "");
                    // Check if new slug conflicts
                    const existing = yield Category_1.Category.findOne({ slug, _id: { $ne: id } });
                    if (existing) {
                        return res.status(400).json({
                            success: false,
                            message: "Category with this name already exists",
                        });
                    }
                    updateData.slug = slug;
                }
                const category = yield Category_1.Category.findByIdAndUpdate(id, updateData, {
                    new: true,
                });
                if (!category) {
                    return res.status(404).json({
                        success: false,
                        message: "Category not found",
                    });
                }
                res.status(200).json({
                    success: true,
                    data: category,
                });
            }
            catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
        });
    }
    // DELETE /api/admin/categories/:id
    static delete(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const category = yield Category_1.Category.findByIdAndDelete(id);
                if (!category) {
                    return res.status(404).json({
                        success: false,
                        message: "Category not found",
                    });
                }
                res.status(200).json({
                    success: true,
                    message: "Category deleted",
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
}
exports.CategoryController = CategoryController;
class BrandController {
    // GET /api/admin/brands
    static getAll(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { isActive, page = 1, limit = 20 } = req.query;
                const query = {};
                if (isActive !== undefined) {
                    query.isActive = isActive === "true";
                }
                const brands = yield Brand_1.Brand.find(query)
                    .sort({ name: 1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield Brand_1.Brand.countDocuments(query);
                res.status(200).json({
                    success: true,
                    data: brands,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        pages: Math.ceil(total / Number(limit)),
                    },
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // POST /api/admin/brands
    static create(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, description, logo, country, website, isActive = true } = req.body;
                if (!name) {
                    return res.status(400).json({
                        success: false,
                        message: "Brand name is required",
                    });
                }
                // Generate slug from name
                const slug = name
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "");
                // Check if slug already exists
                const existing = yield Brand_1.Brand.findOne({ slug });
                if (existing) {
                    return res.status(400).json({
                        success: false,
                        message: "Brand with this name already exists",
                    });
                }
                const brand = new Brand_1.Brand({
                    name,
                    slug,
                    description,
                    logo,
                    country,
                    website,
                    isActive,
                });
                yield brand.save();
                res.status(201).json({
                    success: true,
                    data: brand,
                });
            }
            catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
        });
    }
    // PUT /api/admin/brands/:id
    static update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { name, description, logo, country, website, isActive } = req.body;
                const updateData = {};
                if (name !== undefined)
                    updateData.name = name;
                if (description !== undefined)
                    updateData.description = description;
                if (logo !== undefined)
                    updateData.logo = logo;
                if (country !== undefined)
                    updateData.country = country;
                if (website !== undefined)
                    updateData.website = website;
                if (isActive !== undefined)
                    updateData.isActive = isActive;
                // If name changed, regenerate slug
                if (name) {
                    const slug = name
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "");
                    // Check if new slug conflicts
                    const existing = yield Brand_1.Brand.findOne({ slug, _id: { $ne: id } });
                    if (existing) {
                        return res.status(400).json({
                            success: false,
                            message: "Brand with this name already exists",
                        });
                    }
                    updateData.slug = slug;
                }
                const brand = yield Brand_1.Brand.findByIdAndUpdate(id, updateData, {
                    new: true,
                });
                if (!brand) {
                    return res.status(404).json({
                        success: false,
                        message: "Brand not found",
                    });
                }
                res.status(200).json({
                    success: true,
                    data: brand,
                });
            }
            catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
        });
    }
    // DELETE /api/admin/brands/:id
    static delete(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const brand = yield Brand_1.Brand.findByIdAndDelete(id);
                if (!brand) {
                    return res.status(404).json({
                        success: false,
                        message: "Brand not found",
                    });
                }
                res.status(200).json({
                    success: true,
                    message: "Brand deleted",
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
}
exports.BrandController = BrandController;
//# sourceMappingURL=CategoryController.js.map