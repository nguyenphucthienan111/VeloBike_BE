import { Router } from "express";

export const chatbotRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Chatbot
 *   description: Chatbot webhook and simple bot endpoints
 */

/**
 * @swagger
 * /api/chatbot/webhook:
 *   post:
 *     summary: Receive chatbot webhook events (incoming messages from third-party bot provider)
 *     tags: [Chatbot]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bot processed message
 */
chatbotRoutes.post("/webhook", async (req: any, res: any) => {
  try {
    const { userId, message } = req.body || {};

    // Simple rule-based reply stub
    let reply = "Xin chào! Tôi là trợ lý VeloBike. Bạn cần giúp gì?";
    const text = (message || "").toString().toLowerCase();
    if (text.includes("giá") || text.includes("bao nhiêu")) {
      reply =
        "Bạn có thể gửi link tin đăng hoặc mô tả, tôi sẽ giúp ước lượng giá.";
    } else if (text.includes("kiểm định") || text.includes("inspection")) {
      reply =
        "Chúng tôi có dịch vụ kiểm định 50 điểm. Bạn muốn đặt lịch không?";
    } else if (text.includes("thanh toán")) {
      reply = "Thanh toán sẽ được xử lý qua PayOS và bảo đảm bằng Escrow.";
    }

    // In production: persist message, call NLP/LLM, or forward to human agent
    console.log(`Chatbot webhook from ${userId}: ${message}`);
    console.log(`Bot reply: ${reply}`);

    res.json({ success: true, reply });
  } catch (err: any) {
    console.error("Chatbot webhook error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default chatbotRoutes;
