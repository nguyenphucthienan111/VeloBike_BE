import { User, UserRole } from "../models/User";
import { Listing } from "../models/Listing";
import { Order, OrderStatus } from "../models/Order";
import { Review } from "../models/Review";
import mongoose from "mongoose";

interface FraudScore {
  score: number; // 0-100, higher = more suspicious
  reasons: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendations: string[];
}

export class FraudDetectionService {
  /**
   * Analyze user for fraud indicators
   */
  static async analyzeUser(userId: string): Promise<FraudScore> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      let score = 0;
      const reasons: string[] = [];
      const recommendations: string[] = [];

      // 1. Account age analysis
      const accountAge = Date.now() - user.createdAt.getTime();
      const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);
      
      if (daysSinceCreation < 1) {
        score += 30;
        reasons.push("Very new account (less than 1 day old)");
        recommendations.push("Require additional verification for new accounts");
      } else if (daysSinceCreation < 7) {
        score += 15;
        reasons.push("New account (less than 1 week old)");
      }

      // 2. KYC status
      if (user.kycStatus !== "VERIFIED" && user.role === UserRole.SELLER) {
        score += 25;
        reasons.push("Seller without verified KYC");
        recommendations.push("Require KYC verification before allowing sales");
      }

      // 3. Profile completeness
      let profileCompleteness = 0;
      if (user.fullName) profileCompleteness += 20;
      if (user.phone) profileCompleteness += 20;
      if (user.address?.city) profileCompleteness += 20;
      if (user.avatar) profileCompleteness += 20;
      if (user.bankAccount?.accountNumber) profileCompleteness += 20;

      if (profileCompleteness < 60) {
        score += 20;
        reasons.push("Incomplete profile information");
        recommendations.push("Encourage profile completion");
      }

      // 4. Activity patterns
      const listings = await Listing.find({ sellerId: new mongoose.Types.ObjectId(userId) });
      const orders = await Order.find({
        $or: [
          { buyerId: new mongoose.Types.ObjectId(userId) },
          { sellerId: new mongoose.Types.ObjectId(userId) }
        ]
      });

      // Too many listings in short time
      const recentListings = listings.filter(l => 
        Date.now() - l.createdAt.getTime() < 24 * 60 * 60 * 1000
      );
      
      if (recentListings.length > 10) {
        score += 25;
        reasons.push("Excessive listing activity (>10 listings in 24h)");
        recommendations.push("Implement daily listing limits");
      }

      // 5. Price analysis for sellers
      if (user.role === UserRole.SELLER && listings.length > 0) {
        const avgMarketPrice = await this.getAverageMarketPrice(listings[0].type);
        const suspiciouslyLowPriced = listings.filter(l => 
          l.pricing.amount < avgMarketPrice * 0.3 // 70% below market
        );

        if (suspiciouslyLowPriced.length > 0) {
          score += 20;
          reasons.push("Listings priced significantly below market value");
          recommendations.push("Flag listings with unusual pricing for review");
        }
      }

      // 6. Review patterns
      const reviews = await Review.find({ revieweeId: new mongoose.Types.ObjectId(userId) });
      if (reviews.length > 0) {
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        const recentNegativeReviews = reviews.filter(r => 
          r.rating <= 2 && Date.now() - r.createdAt.getTime() < 30 * 24 * 60 * 60 * 1000
        );

        if (avgRating < 2.5) {
          score += 30;
          reasons.push("Low average rating from other users");
        }

        if (recentNegativeReviews.length >= 3) {
          score += 25;
          reasons.push("Multiple recent negative reviews");
          recommendations.push("Investigate user complaints");
        }
      }

      // 7. Failed order patterns
      const failedOrders = orders.filter(o => 
        o.status === OrderStatus.CANCELLED || 
        o.status === OrderStatus.DISPUTED ||
        o.status === OrderStatus.REFUNDED
      );

      const failureRate = orders.length > 0 ? failedOrders.length / orders.length : 0;
      if (failureRate > 0.3 && orders.length >= 5) {
        score += 20;
        reasons.push("High order failure rate (>30%)");
        recommendations.push("Monitor transaction success rate");
      }

      // Determine risk level
      let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      if (score >= 80) riskLevel = "CRITICAL";
      else if (score >= 60) riskLevel = "HIGH";
      else if (score >= 30) riskLevel = "MEDIUM";
      else riskLevel = "LOW";

      return {
        score: Math.min(score, 100),
        reasons,
        riskLevel,
        recommendations
      };
    } catch (error) {
      console.error("Error analyzing user for fraud:", error);
      throw error;
    }
  }

  /**
   * Analyze listing for fraud indicators
   */
  static async analyzeListing(listingId: string): Promise<FraudScore> {
    try {
      const listing = await Listing.findById(listingId).populate('sellerId');
      if (!listing) {
        throw new Error("Listing not found");
      }

      let score = 0;
      const reasons: string[] = [];
      const recommendations: string[] = [];

      // 1. Price analysis
      const avgMarketPrice = await this.getAverageMarketPrice(listing.type, listing.generalInfo.brand);
      const priceRatio = listing.pricing.amount / avgMarketPrice;

      if (priceRatio < 0.3) {
        score += 40;
        reasons.push("Price significantly below market average (>70% discount)");
        recommendations.push("Require additional verification for low-priced items");
      } else if (priceRatio < 0.5) {
        score += 20;
        reasons.push("Price below market average (>50% discount)");
      }

      // 2. Image analysis
      if (!listing.media.thumbnails || listing.media.thumbnails.length < 3) {
        score += 15;
        reasons.push("Insufficient images (less than 3)");
        recommendations.push("Require minimum number of images");
      }

      // 3. Description quality
      if (!listing.description || listing.description.length < 50) {
        score += 10;
        reasons.push("Very short or missing description");
      }

      // 4. Seller analysis
      const seller = listing.sellerId as any;
      if (seller) {
        const sellerFraudScore = await this.analyzeUser(seller._id.toString());
        if (sellerFraudScore.riskLevel === "HIGH" || sellerFraudScore.riskLevel === "CRITICAL") {
          score += 30;
          reasons.push("High-risk seller");
          recommendations.push("Review seller account");
        }
      }

      // 5. Duplicate detection
      const similarListings = await Listing.find({
        _id: { $ne: new mongoose.Types.ObjectId(listingId) },
        'generalInfo.brand': listing.generalInfo.brand,
        'generalInfo.model': listing.generalInfo.model,
        'generalInfo.year': listing.generalInfo.year,
        status: "PUBLISHED"
      });

      if (similarListings.length > 0) {
        // Check for exact price matches (suspicious)
        const exactPriceMatches = similarListings.filter(l => 
          Math.abs(l.pricing.amount - listing.pricing.amount) < 1000
        );

        if (exactPriceMatches.length > 0) {
          score += 25;
          reasons.push("Identical or very similar listings found");
          recommendations.push("Check for duplicate listings");
        }
      }

      // 6. Urgency indicators in title/description
      const urgencyKeywords = ['urgent', 'quick sale', 'must sell', 'leaving country', 'emergency'];
      const hasUrgencyKeywords = urgencyKeywords.some(keyword => 
        listing.title.toLowerCase().includes(keyword) || 
        listing.description.toLowerCase().includes(keyword)
      );

      if (hasUrgencyKeywords) {
        score += 15;
        reasons.push("Contains urgency keywords often used in scams");
      }

      // Determine risk level
      let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      if (score >= 80) riskLevel = "CRITICAL";
      else if (score >= 60) riskLevel = "HIGH";
      else if (score >= 30) riskLevel = "MEDIUM";
      else riskLevel = "LOW";

      return {
        score: Math.min(score, 100),
        reasons,
        riskLevel,
        recommendations
      };
    } catch (error) {
      console.error("Error analyzing listing for fraud:", error);
      throw error;
    }
  }

  /**
   * Analyze order for fraud indicators
   */
  static async analyzeOrder(orderId: string): Promise<FraudScore> {
    try {
      const order = await Order.findById(orderId)
        .populate('buyerId sellerId listingId');
      
      if (!order) {
        throw new Error("Order not found");
      }

      let score = 0;
      const reasons: string[] = [];
      const recommendations: string[] = [];

      // 1. Buyer analysis
      const buyer = order.buyerId as any;
      const buyerFraudScore = await this.analyzeUser(buyer._id.toString());
      
      if (buyerFraudScore.riskLevel === "HIGH" || buyerFraudScore.riskLevel === "CRITICAL") {
        score += 25;
        reasons.push("High-risk buyer");
      }

      // 2. Seller analysis
      const seller = order.sellerId as any;
      const sellerFraudScore = await this.analyzeUser(seller._id.toString());
      
      if (sellerFraudScore.riskLevel === "HIGH" || sellerFraudScore.riskLevel === "CRITICAL") {
        score += 25;
        reasons.push("High-risk seller");
      }

      // 3. Order value analysis
      if (order.financials.totalAmount > 100000000) { // > 100M VND
        score += 15;
        reasons.push("High-value transaction");
        recommendations.push("Require additional verification for high-value orders");
      }

      // 4. Speed of transaction
      const listing = order.listingId as any;
      if (listing) {
        const timeSinceListing = order.createdAt.getTime() - listing.createdAt.getTime();
        const minutesSinceListing = timeSinceListing / (1000 * 60);

        if (minutesSinceListing < 30) {
          score += 20;
          reasons.push("Very quick purchase after listing (< 30 minutes)");
        }
      }

      // 5. Payment patterns
      // Check for multiple failed payment attempts (would need payment logs)
      
      // 6. Geographic analysis
      // Check if buyer and seller are in very different locations for high-value items
      
      // Determine risk level
      let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      if (score >= 80) riskLevel = "CRITICAL";
      else if (score >= 60) riskLevel = "HIGH";
      else if (score >= 30) riskLevel = "MEDIUM";
      else riskLevel = "LOW";

      return {
        score: Math.min(score, 100),
        reasons,
        riskLevel,
        recommendations
      };
    } catch (error) {
      console.error("Error analyzing order for fraud:", error);
      throw error;
    }
  }

  /**
   * Get average market price for bike type and brand
   */
  private static async getAverageMarketPrice(bikeType: string, brand?: string): Promise<number> {
    try {
      const query: any = {
        type: bikeType,
        status: "PUBLISHED"
      };

      if (brand) {
        query['generalInfo.brand'] = brand;
      }

      const priceAgg = await Listing.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: "$pricing.amount" },
            count: { $sum: 1 }
          }
        }
      ]);

      return priceAgg[0]?.avgPrice || 50000000; // Default 50M VND if no data
    } catch (error) {
      console.error("Error getting average market price:", error);
      return 50000000; // Default fallback
    }
  }

  /**
   * Get fraud statistics for admin dashboard
   */
  static async getFraudStats(): Promise<any> {
    try {
      // This would be implemented with a FraudAlert model to track flagged items
      return {
        flaggedUsers: 0,
        flaggedListings: 0,
        flaggedOrders: 0,
        resolvedCases: 0
      };
    } catch (error) {
      console.error("Error getting fraud stats:", error);
      return null;
    }
  }
}