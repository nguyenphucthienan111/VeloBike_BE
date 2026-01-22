import { Request, Response } from "express";
import { Brand } from "../models/Brand";

export class BrandController {
  /**
   * Get all brands
   * GET /api/brands
   */
  static async getAll(req: Request, res: Response) {
    try {
      const { isActive, country, page = 1, limit = 50, search } = req.query;

      const query: any = {};
      if (isActive !== undefined) {
        query.isActive = isActive === "true";
      }
      if (country) {
        query.country = country;
      }
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const brands = await Brand.find(query)
        .sort({ name: 1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Brand.countDocuments(query);

      res.json({
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
      res.status(500).json({
        success: false,
        message: "Error fetching brands",
        error: error.message,
      });
    }
  }

  /**
   * Get brand by ID
   * GET /api/brands/:id
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const brand = await Brand.findById(id);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: "Brand not found",
        });
      }

      res.json({
        success: true,
        data: brand,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching brand",
        error: error.message,
      });
    }
  }

  /**
   * Get brand statistics
   * GET /api/brands/:id/stats
   */
  static async getStats(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const brand = await Brand.findById(id);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: "Brand not found",
        });
      }

      const { Listing } = require("../models/Listing");
      const { Order } = require("../models/Order");

      // Get listing count
      const listingCount = await Listing.countDocuments({
        "generalInfo.brand": brand.name,
        status: "PUBLISHED",
      });

      // Get sold count
      const soldCount = await Listing.countDocuments({
        "generalInfo.brand": brand.name,
        status: "SOLD",
      });

      // Get average price
      const priceStats = await Listing.aggregate([
        {
          $match: {
            "generalInfo.brand": brand.name,
            status: { $in: ["PUBLISHED", "SOLD"] },
          },
        },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: "$pricing.amount" },
            minPrice: { $min: "$pricing.amount" },
            maxPrice: { $max: "$pricing.amount" },
          },
        },
      ]);

      res.json({
        success: true,
        data: {
          brand,
          stats: {
            activeListings: listingCount,
            soldListings: soldCount,
            priceRange: priceStats[0] || {
              avgPrice: 0,
              minPrice: 0,
              maxPrice: 0,
            },
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching brand stats",
        error: error.message,
      });
    }
  }

  /**
   * Create new brand (Admin only)
   * POST /api/brands
   */
  static async create(req: Request, res: Response) {
    try {
      const { name, slug, description, logo, country, website, isActive } = req.body;

      // Validate required fields
      if (!name || !slug) {
        return res.status(400).json({
          success: false,
          message: "Name and slug are required",
        });
      }

      // Check if brand already exists
      const existingBrand = await Brand.findOne({
        $or: [{ name }, { slug }],
      });

      if (existingBrand) {
        return res.status(400).json({
          success: false,
          message: "Brand with this name or slug already exists",
        });
      }

      const brand = new Brand({
        name,
        slug,
        description,
        logo,
        country,
        website,
        isActive: isActive !== undefined ? isActive : true,
      });

      await brand.save();

      res.status(201).json({
        success: true,
        message: "Brand created successfully",
        data: brand,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error creating brand",
        error: error.message,
      });
    }
  }

  /**
   * Update brand (Admin only)
   * PUT /api/brands/:id
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, slug, description, logo, country, website, isActive } = req.body;

      const brand = await Brand.findById(id);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: "Brand not found",
        });
      }

      // Check if new name/slug conflicts with existing brand
      if (name || slug) {
        const existingBrand = await Brand.findOne({
          _id: { $ne: id },
          $or: [
            ...(name ? [{ name }] : []),
            ...(slug ? [{ slug }] : []),
          ],
        });

        if (existingBrand) {
          return res.status(400).json({
            success: false,
            message: "Brand with this name or slug already exists",
          });
        }
      }

      // Update fields
      if (name) brand.name = name;
      if (slug) brand.slug = slug;
      if (description !== undefined) brand.description = description;
      if (logo !== undefined) brand.logo = logo;
      if (country !== undefined) brand.country = country;
      if (website !== undefined) brand.website = website;
      if (isActive !== undefined) brand.isActive = isActive;

      await brand.save();

      res.json({
        success: true,
        message: "Brand updated successfully",
        data: brand,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error updating brand",
        error: error.message,
      });
    }
  }

  /**
   * Delete brand (Admin only)
   * DELETE /api/brands/:id
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const brand = await Brand.findById(id);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: "Brand not found",
        });
      }

      // Check if brand is used in any listings
      const { Listing } = require("../models/Listing");
      const listingCount = await Listing.countDocuments({
        "generalInfo.brand": brand.name,
      });

      if (listingCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete brand. It is used in ${listingCount} listing(s). Consider deactivating instead.`,
        });
      }

      await Brand.findByIdAndDelete(id);

      res.json({
        success: true,
        message: "Brand deleted successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error deleting brand",
        error: error.message,
      });
    }
  }

  /**
   * Toggle brand active status (Admin only)
   * PUT /api/brands/:id/toggle-active
   */
  static async toggleActive(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const brand = await Brand.findById(id);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: "Brand not found",
        });
      }

      brand.isActive = !brand.isActive;
      await brand.save();

      res.json({
        success: true,
        message: `Brand ${brand.isActive ? "activated" : "deactivated"} successfully`,
        data: brand,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error toggling brand status",
        error: error.message,
      });
    }
  }

  /**
   * Get popular brands (based on listing count)
   * GET /api/brands/popular
   */
  static async getPopular(req: Request, res: Response) {
    try {
      const { limit = 10 } = req.query;

      const { Listing } = require("../models/Listing");

      const popularBrands = await Listing.aggregate([
        {
          $match: {
            status: { $in: ["PUBLISHED", "SOLD"] },
          },
        },
        {
          $group: {
            _id: "$generalInfo.brand",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: Number(limit) },
      ]);

      // Get full brand details
      const brandNames = popularBrands.map((b: any) => b._id);
      const brands = await Brand.find({
        name: { $in: brandNames },
        isActive: true,
      });

      // Merge count with brand details
      const result = brands.map((brand) => {
        const stats = popularBrands.find((b: any) => b._id === brand.name);
        return {
          ...brand.toObject(),
          listingCount: stats?.count || 0,
        };
      });

      // Sort by count
      result.sort((a: any, b: any) => b.listingCount - a.listingCount);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching popular brands",
        error: error.message,
      });
    }
  }
}
