import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatbotConversation } from "../models/ChatbotConversation";

export class ChatbotService {
  private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  private static model = this.genAI.getGenerativeModel({ model: "gemini-pro" });

  /**
   * VeloBike context for AI responses
   */
  private static readonly VELOBIKE_CONTEXT = `
Bạn là trợ lý AI của VeloBike - sàn thương mại điện tử C2C chuyên về xe đạp thể thao tại Việt Nam.

Thông tin về VeloBike:
- Chuyên mua bán xe đạp thể thao (Road bike, Mountain bike, Hybrid, v.v.)
- Có dịch vụ kiểm định chuyên nghiệp (50 điểm kiểm tra, phí 500.000 VNĐ)
- Thanh toán an toàn qua PayOS với hệ thống Escrow
- Hỗ trợ giao hàng toàn quốc qua GHN, GHTK
- Có hệ thống đánh giá và phản hồi
- Hỗ trợ KYC để xác thực người bán

Hãy trả lời bằng tiếng Việt, thân thiện và chuyên nghiệp. Nếu không biết thông tin cụ thể, hãy gợi ý liên hệ hotline hoặc hướng dẫn sử dụng tính năng trên app.
`;

  static async processMessage(userId: string, message: string): Promise<string> {
    console.log("ChatbotService.processMessage called with:", { userId, message });
    
    try {
      // 1. Save user message to conversation history
      console.log("Saving user message...");
      await this.saveConversation(userId, message, "user");

      // 2. Check for basic keywords first (Rule-based layer)
      console.log("Checking for quick response...");
      const quickResponse = this.getQuickResponse(message);
      if (quickResponse) {
        console.log("Found quick response:", quickResponse.substring(0, 50) + "...");
        await this.saveConversation(userId, quickResponse, "bot");
        return quickResponse;
      }

      console.log("No quick response found, using fallback...");

      // 4. Default fallback response
      const fallbackResponse = "Cảm ơn bạn đã liên hệ VeloBike! Tôi chưa hiểu rõ câu hỏi của bạn. Bạn có thể hỏi về:\n" +
        "• Giá xe và định giá\n" +
        "• Quy trình kiểm định\n" +
        "• Thanh toán và bảo mật\n" +
        "• Giao hàng và vận chuyển\n" +
        "Hoặc liên hệ hotline 1900-xxxx để được hỗ trợ trực tiếp.";

      await this.saveConversation(userId, fallbackResponse, "bot");
      return fallbackResponse;

    } catch (error) {
      console.error("Chatbot Service Error:", error);
      const errorResponse = "Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau hoặc liên hệ hotline 1900-xxxx.";
      await this.saveConversation(userId, errorResponse, "bot");
      return errorResponse;
    }
  }

  /**
   * Quick rule-based responses for common questions
   */
  private static getQuickResponse(message: string): string | null {
    const lowerMsg = message.toLowerCase();
    console.log("Checking quick response for:", lowerMsg);
    
    if (lowerMsg.includes("giá") || lowerMsg.includes("price") || lowerMsg.includes("bao nhiêu")) {
      console.log("Found pricing question");
      return "💰 **Định giá xe đạp**\n\n" +
        "Để định giá chính xác, tôi cần thông tin:\n" +
        "• Thương hiệu (Trek, Giant, Specialized...)\n" +
        "• Model và năm sản xuất\n" +
        "• Tình trạng xe (mới, như mới, tốt, cần sửa chữa)\n" +
        "• Hình ảnh thực tế\n\n" +
        "Bạn cũng có thể sử dụng tính năng 'Định giá AI' trong app để có giá tham khảo ngay!";
    }
    
    if (lowerMsg.includes("kiểm định") || lowerMsg.includes("inspection")) {
      return "🔍 **Dịch vụ kiểm định VeloBike**\n\n" +
        "✅ 50 điểm kiểm tra kỹ thuật chuyên nghiệp\n" +
        "✅ Báo cáo chi tiết với hình ảnh\n" +
        "✅ Đảm bảo chất lượng cho người mua\n" +
        "💵 Phí dịch vụ: 500.000 VNĐ\n" +
        "⏰ Thời gian: 2-3 ngày làm việc\n\n" +
        "Bạn có muốn đặt lịch kiểm định ngay không?";
    }

    if (lowerMsg.includes("thanh toán") || lowerMsg.includes("payos") || lowerMsg.includes("escrow")) {
      return "💳 **Thanh toán an toàn**\n\n" +
        "VeloBike sử dụng hệ thống Escrow (ký quỹ):\n" +
        "1️⃣ Bạn thanh toán qua PayOS\n" +
        "2️⃣ Tiền được giữ an toàn bởi VeloBike\n" +
        "3️⃣ Tiền chỉ chuyển cho người bán khi bạn xác nhận hài lòng\n" +
        "4️⃣ Nếu có vấn đề, tiền được hoàn lại 100%\n\n" +
        "Hỗ trợ: Visa, Mastercard, ATM nội địa, QR Pay";
    }

    if (lowerMsg.includes("giao hàng") || lowerMsg.includes("vận chuyển") || lowerMsg.includes("ship")) {
      return "🚚 **Giao hàng toàn quốc**\n\n" +
        "Đối tác vận chuyển:\n" +
        "• Giao Hàng Nhanh (GHN) - Nhanh, uy tín\n" +
        "• Giao Hàng Tiết Kiệm (GHTK) - Giá tốt\n" +
        "• VNPost - Phủ sóng rộng\n\n" +
        "🎁 Đóng gói chuyên nghiệp cho xe đạp\n" +
        "📱 Theo dõi đơn hàng real-time\n" +
        "💯 Bảo hiểm hàng hóa";
    }

    return null; // No quick response found
  }

  /**
   * Build contextual prompt for Gemini AI
   */
  private static buildContextualPrompt(message: string, history: any[]): string {
    let prompt = this.VELOBIKE_CONTEXT + "\n\n";
    
    if (history.length > 0) {
      prompt += "Lịch sử trò chuyện gần đây:\n";
      history.forEach(conv => {
        prompt += `${conv.sender === 'user' ? 'Khách hàng' : 'Bot'}: ${conv.message}\n`;
      });
      prompt += "\n";
    }
    
    prompt += `Câu hỏi hiện tại: ${message}\n\n`;
    prompt += "Hãy trả lời câu hỏi một cách hữu ích và chuyên nghiệp:";
    
    return prompt;
  }

  /**
   * Save conversation to database
   */
  private static async saveConversation(userId: string, message: string, sender: 'user' | 'bot'): Promise<void> {
    try {
      // For now, just log the conversation - we can implement proper storage later
      console.log(`[CHATBOT] ${sender.toUpperCase()}: ${message}`);
      
      // TODO: Implement proper conversation storage with ChatbotConversation model
      // The current model uses a different schema (sessionId + messages array)
      // We would need to either update the model or adapt the storage logic
    } catch (error) {
      console.error("Error saving conversation:", error);
      // Don't throw error, just log it
    }
  }

  /**
   * Get recent conversation history
   */
  private static async getRecentConversation(userId: string, limit: number = 5): Promise<any[]> {
    try {
      // For now, return empty array - implement proper history retrieval later
      return [];
    } catch (error) {
      console.error("Error getting conversation history:", error);
      return [];
    }
  }

  /**
   * Get conversation statistics
   */
  static async getConversationStats(): Promise<any> {
    try {
      // For now, return mock stats - implement proper stats later
      return {
        totalConversations: 0,
        uniqueUsers: 0,
        todayConversations: 0
      };
    } catch (error) {
      console.error("Error getting conversation stats:", error);
      return null;
    }
  }
}