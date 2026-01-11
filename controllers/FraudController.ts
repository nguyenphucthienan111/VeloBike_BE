import { Request, Response } from "express";
import { FraudDetectionService } from "../services/FraudDetectionService";

export class FraudController {
  /**
   * Analyze user for fraud indicators
   */
  static async analyzeUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const analysis = await FraudDetectionService.analyzeUser(userId);

      res.json({
        success: true,
        data: {
          userId,
          analysis,
          analyzedAt: new Date()
        }
      });
    } catch (error) {
      console.error("Error analyzing user:", error);
      res.status(500).json({
        success: false,
        message: "Error analyzing user for fraud"
      });
    }
  }

  /**
   * Analyze listing for fraud indicators
   */
  static async analyzeListing(req: Request, res: Response) {
    try {
      const { listingId } = req.params;

      const analysis = await FraudDetectionService.analyzeListing(listingId);

      res.json({
        success: true,
        data: {
          listingId,
          analysis,
          analyzedAt: new Date()
        }
      });
    } catch (error) {
      console.error("Error analyzing listing:", error);
      res.status(500).json({
        success: false,
        message: "Error analyzing listing for fraud"
      });
    }
  }

  /**
   * Analyze order for fraud indicators
   */
  static async analyzeOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      const analysis = await FraudDetectionService.analyzeOrder(orderId);

      res.json({
        success: true,
        data: {
          orderId,
          analysis,
          analyzedAt: new Date()
        }
      });
    } catch (error) {
      console.error("Error analyzing order:", error);
      res.status(500).json({
        success: false,
        message: "Error analyzing order for fraud"
      });
    }
  }

  /**
   * Get fraud detection statistics
   */
  static async getFraudStats(req: Request, res: Response) {
    try {
      const stats = await FraudDetectionService.getFraudStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error("Error getting fraud stats:", error);
      res.status(500).json({
        success: false,
        message: "Error getting fraud statistics"
      });
    }
  }
}