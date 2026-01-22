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
exports.CategoryController = void 0;
const Category_1 = require("../models/Category");
class CategoryController {
    /**
     * Get all categories
     * GET /api/categories
     */
    static getAll(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { isActive, page = 1, limit = 50 } = req.query;
                const query = {};
                if (isActive !== undefined) {
                    query.isActive = isActive === "true";
                }
                const categories = yield Category_1.Category.find(query)
                    .sort({ name: 1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield Category_1.Category.countDocuments(query);
                res.json({
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
                res.status(500).json({
                    success: false,
                    message: "Error fetching categories",
                    error: error.message,
                });
            }
        });
    }
    /**
     * Get category by ID
     * GET /api/categories/:id
     */
    static getById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const category = yield Category_1.Category.findById(id);
                if (!category) {
                    return res.status(404).json({
                        success: false,
                        message: "Category not found",
                    });
                }
                res.json({
                    success: true,
                    data: category,
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: "Error fetching category",
                    error: error.message,
                });
            }
        });
    }
    /**
     * Create new category (Admin only)
     * POST /api/categories
     */
    static create(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, slug, description, icon, specsTemplate, isActive } = req.body;
                // Validate required fields
                if (!name || !slug) {
                    return res.status(400).json({
                        success: false,
                        message: "Name and slug are required",
                    });
                }
                // Check if category already exists
                const existingCategory = yield Category_1.Category.findOne({
                    $or: [{ name }, { slug }],
                });
                if (existingCategory) {
                    return res.status(400).json({
                        success: false,
                        message: "Category with this name or slug already exists",
                    });
                }
                const category = new Category_1.Category({
                    name,
                    slug,
                    description,
                    icon,
                    specsTemplate: specsTemplate || [],
                    isActive: isActive !== undefined ? isActive : true,
                });
                yield category.save();
                res.status(201).json({
                    success: true,
                    message: "Category created successfully",
                    data: category,
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: "Error creating category",
                    error: error.message,
                });
            }
        });
    }
    /**
     * Update category (Admin only)
     * PUT /api/categories/:id
     */
    static update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { name, slug, description, icon, specsTemplate, isActive } = req.body;
                const category = yield Category_1.Category.findById(id);
                if (!category) {
                    return res.status(404).json({
                        success: false,
                        message: "Category not found",
                    });
                }
                // Check if new name/slug conflicts with existing category
                if (name || slug) {
                    const existingCategory = yield Category_1.Category.findOne({
                        _id: { $ne: id },
                        $or: [
                            ...(name ? [{ name }] : []),
                            ...(slug ? [{ slug }] : []),
                        ],
                    });
                    if (existingCategory) {
                        return res.status(400).json({
                            success: false,
                            message: "Category with this name or slug already exists",
                        });
                    }
                }
                // Update fields
                if (name)
                    category.name = name;
                if (slug)
                    category.slug = slug;
                if (description !== undefined)
                    category.description = description;
                if (icon !== undefined)
                    category.icon = icon;
                if (specsTemplate !== undefined)
                    category.specsTemplate = specsTemplate;
                if (isActive !== undefined)
                    category.isActive = isActive;
                yield category.save();
                res.json({
                    success: true,
                    message: "Category updated successfully",
                    data: category,
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: "Error updating category",
                    error: error.message,
                });
            }
        });
    }
    /**
     * Delete category (Admin only)
     * DELETE /api/categories/:id
     */
    static delete(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const category = yield Category_1.Category.findById(id);
                if (!category) {
                    return res.status(404).json({
                        success: false,
                        message: "Category not found",
                    });
                }
                // Check if category is used in any listings
                const { Listing } = require("../models/Listing");
                const listingCount = yield Listing.countDocuments({ categoryId: id });
                if (listingCount > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Cannot delete category. It is used in ${listingCount} listing(s). Consider deactivating instead.`,
                    });
                }
                yield Category_1.Category.findByIdAndDelete(id);
                res.json({
                    success: true,
                    message: "Category deleted successfully",
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: "Error deleting category",
                    error: error.message,
                });
            }
        });
    }
    /**
     * Toggle category active status (Admin only)
     * PUT /api/categories/:id/toggle-active
     */
    static toggleActive(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const category = yield Category_1.Category.findById(id);
                if (!category) {
                    return res.status(404).json({
                        success: false,
                        message: "Category not found",
                    });
                }
                category.isActive = !category.isActive;
                yield category.save();
                res.json({
                    success: true,
                    message: `Category ${category.isActive ? "activated" : "deactivated"} successfully`,
                    data: category,
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: "Error toggling category status",
                    error: error.message,
                });
            }
        });
    }
}
exports.CategoryController = CategoryController;
//# sourceMappingURL=CategoryController.js.map