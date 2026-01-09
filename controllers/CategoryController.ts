import { Request, Response } from "express";
import { Category } from "../models/Category";
import { Brand } from "../models/Brand";

export class CategoryController {
  // GET /api/admin/categories
  static async getAll(req: Request, res: Response) {
    try {
      const { isActive, page = 1, limit = 20 } = req.query;

      const query: any = {};
      if (isActive !== undefined) {
        query.isActive = isActive === "true";
      }

      const categories = await Category.find(query)
        .sort({ name: 1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Category.countDocuments(query);

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
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/admin/categories
  static async create(req: Request, res: Response) {
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
      const existing = await Category.findOne({ slug });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Category with this name already exists",
        });
      }

      const category = new Category({
        name,
        slug,
        description,
        icon,
        isActive,
      });

      await category.save();

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // PUT /api/admin/categories/:id
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, icon, isActive } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (icon !== undefined) updateData.icon = icon;
      if (isActive !== undefined) updateData.isActive = isActive;

      // If name changed, regenerate slug
      if (name) {
        const slug = name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        // Check if new slug conflicts
        const existing = await Category.findOne({ slug, _id: { $ne: id } });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: "Category with this name already exists",
          });
        }
        updateData.slug = slug;
      }

      const category = await Category.findByIdAndUpdate(id, updateData, {
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
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // DELETE /api/admin/categories/:id
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const category = await Category.findByIdAndDelete(id);

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
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export class BrandController {
  // GET /api/admin/brands
  static async getAll(req: Request, res: Response) {
    try {
      const { isActive, page = 1, limit = 20 } = req.query;

      const query: any = {};
      if (isActive !== undefined) {
        query.isActive = isActive === "true";
      }

      const brands = await Brand.find(query)
        .sort({ name: 1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Brand.countDocuments(query);

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
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/admin/brands
  static async create(req: Request, res: Response) {
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
      const existing = await Brand.findOne({ slug });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Brand with this name already exists",
        });
      }

      const brand = new Brand({
        name,
        slug,
        description,
        logo,
        country,
        website,
        isActive,
      });

      await brand.save();

      res.status(201).json({
        success: true,
        data: brand,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // PUT /api/admin/brands/:id
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, logo, country, website, isActive } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (logo !== undefined) updateData.logo = logo;
      if (country !== undefined) updateData.country = country;
      if (website !== undefined) updateData.website = website;
      if (isActive !== undefined) updateData.isActive = isActive;

      // If name changed, regenerate slug
      if (name) {
        const slug = name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        // Check if new slug conflicts
        const existing = await Brand.findOne({ slug, _id: { $ne: id } });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: "Brand with this name already exists",
          });
        }
        updateData.slug = slug;
      }

      const brand = await Brand.findByIdAndUpdate(id, updateData, {
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
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // DELETE /api/admin/brands/:id
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const brand = await Brand.findByIdAndDelete(id);

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
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

