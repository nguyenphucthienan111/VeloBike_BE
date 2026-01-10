import { GoogleGenerativeAI } from "@google/generative-ai";
// import { ChatbotConversation } from "../models/ChatbotConversation"; // Uncomment when needed

export class ChatbotService {
  // Initialize Gemini AI - make sure dotenv.config() runs before this
  private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  private static model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    console.log("=== ChatbotService.processMessage START ===");
    console.log("Input:", { userId, message });
    
    try {
      // 1. Save user message to conversation history
      console.log("Step 1: Saving user message...");
      await this.saveConversation(userId, message, "user");

      // 2. Try Gemini AI FIRST (prioritize AI over keywords)
      console.log("Step 2: Calling Gemini AI...");
      console.log("API Key available:", process.env.GEMINI_API_KEY ? "Yes" : "No");
      
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "") {
        try {
          const history = await this.getRecentConversation(userId, 5);
          const contextualPrompt = this.buildEnhancedPrompt(message, history);
          
          console.log("Sending to Gemini AI with enhanced prompt...");
          const result = await this.model.generateContent(contextualPrompt);
          const response = result.response;
          const aiResponse = response.text();
          
          console.log("✅ Gemini AI response received:", aiResponse.substring(0, 100) + "...");
          await this.saveConversation(userId, aiResponse, "bot");
          return aiResponse;
          
        } catch (aiError) {
          console.error("❌ Gemini AI Error:", aiError);
          console.log("Falling back to keyword-based responses...");
        }
      } else {
        console.log("⚠️ No Gemini API key found, using keyword responses only");
      }

      // 3. Fallback to keyword matching when AI fails or unavailable
      const keywordResponse = this.getKeywordResponse(message);
      if (keywordResponse) {
        console.log("✅ Found keyword response");
        await this.saveConversation(userId, keywordResponse, "bot");
        return keywordResponse;
      }

      // 4. Final fallback response
      const fallbackResponse = "Cảm ơn bạn đã liên hệ VeloBike! 🚴‍♂️\n\n" +
        "Tôi có thể giúp bạn với:\n\n" +
        "💰 **Định giá xe đạp** - Hỏi về giá xe\n" +
        "🔍 **Dịch vụ kiểm định** - Hỏi về kiểm định\n" +
        "🚲 **Bán xe đạp** - Hướng dẫn bán xe\n" +
        "🛒 **Mua xe đạp** - Hướng dẫn mua xe\n" +
        "🔒 **An toàn giao dịch** - Hỏi về bảo mật\n\n" +
        "Hoặc liên hệ:\n" +
        "📞 **Hotline**: 1900-xxxx (24/7)\n" +
        "💬 **Chat trực tiếp** trong app VeloBike";

      await this.saveConversation(userId, fallbackResponse, "bot");
      console.log("=== ChatbotService.processMessage END ===");
      return fallbackResponse;

    } catch (error) {
      console.error("Chatbot Service Error:", error);
      const errorResponse = "Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau hoặc liên hệ hotline 1900-xxxx.";
      await this.saveConversation(userId, errorResponse, "bot");
      return errorResponse;
    }
  }

  /**
   * Build enhanced contextual prompt for Gemini AI with better instructions
   */
  private static buildEnhancedPrompt(message: string, history: any[]): string {
    let prompt = `${this.VELOBIKE_CONTEXT}

HƯỚNG DẪN TRẢ LỜI:
- Trả lời bằng tiếng Việt, thân thiện và chuyên nghiệp
- Sử dụng emoji phù hợp để làm cho câu trả lời sinh động
- Cung cấp thông tin cụ thể về VeloBike khi có thể
- Nếu không chắc chắn, gợi ý liên hệ hotline hoặc sử dụng tính năng trong app
- Luôn tập trung vào việc giúp khách hàng mua/bán xe đạp an toàn và hiệu quả
- Đưa ra lời khuyên thực tế và hữu ích

`;
    
    if (history.length > 0) {
      prompt += "LỊCH SỬ TRƯỚC ĐÓ:\n";
      history.forEach(conv => {
        prompt += `${conv.sender === 'user' ? 'Khách hàng' : 'VeloBike Bot'}: ${conv.message}\n`;
      });
      prompt += "\n";
    }
    
    prompt += `KHÁCH HÀNG HỎI: "${message}"\n\n`;
    prompt += `VELOBIKE BOT TRẢ LỜI:`;
    
    return prompt;
  }

  /**
   * Keyword-based responses as fallback when AI fails
   */
  private static getKeywordResponse(message: string): string | null {
    const lowerMsg = message.toLowerCase();
    console.log("Checking keyword response for:", lowerMsg);
    
    // Pricing queries
    if (lowerMsg.includes("giá") || lowerMsg.includes("price") || lowerMsg.includes("bao nhiêu")) {
      return "� **Định giá xe đạp VeloBike**\n\n" +
        "Để định giá chính xác, tôi cần thông tin:\n" +
        "🔸 **Thương hiệu**: Trek, Giant, Specialized, Cannondale...\n" +
        "🔸 **Model và năm**: VD: Trek Domane 2022\n" +
        "🔸 **Tình trạng**: Mới, như mới, tốt, cần sửa chữa\n" +
        "🔸 **Hình ảnh**: Ảnh thực tế của xe\n\n" +
        "💡 **Mẹo**: Dùng tính năng 'Định giá AI' trong app để có giá tham khảo ngay!\n" +
        "📞 **Hỗ trợ**: Chat với chuyên gia định giá trong app";
    }
    
    // Inspection service
    if (lowerMsg.includes("kiểm định") || lowerMsg.includes("check") || lowerMsg.includes("inspection")) {
      return "🔍 **Dịch vụ kiểm định VeloBike**\n\n" +
        "✅ **50 điểm kiểm tra** kỹ thuật chuyên nghiệp\n" +
        "✅ **Báo cáo chi tiết** với hình ảnh minh họa\n" +
        "✅ **Đảm bảo chất lượng** cho người mua\n" +
        "✅ **Kỹ thuật viên** có chứng chỉ\n\n" +
        "� **Phí dịch vụ**: 500.000 VNĐ\n" +
        "⏰ **Thời gian**: 2-3 ngày làm việc\n" +
        "📍 **Địa điểm**: Tại nhà hoặc showroom\n\n" +
        "🎯 **Đặt lịch ngay**: Trong app VeloBike > Dịch vụ > Kiểm định";
    }
    
    // Selling process
    if (lowerMsg.includes("bán xe") || lowerMsg.includes("muốn bán") || lowerMsg.includes("sell")) {
      return "� **Bán xe đạp trên VeloBike**\n\n" +
        "**Quy trình 6 bước đơn giản**:\n" +
        "1️⃣ **Đăng ký** tài khoản SELLER\n" +
        "2️⃣ **Xác thực KYC** (bắt buộc)\n" +
        "3️⃣ **Tạo listing** với thông tin chi tiết\n" +
        "4️⃣ **Chờ người mua** đặt hàng\n" +
        "5️⃣ **Kiểm định** (nếu yêu cầu)\n" +
        "6️⃣ **Giao hàng** và nhận tiền\n\n" +
        "🔒 **An toàn**: Hệ thống Escrow giữ tiền\n" +
        "💰 **Phí bán**: Chỉ 3% khi bán thành công\n" +
        "📱 **Bắt đầu**: Mở app > Đăng bán > Tạo listing";
    }
    
    // Buying process
    if (lowerMsg.includes("mua xe") || lowerMsg.includes("muốn mua") || lowerMsg.includes("buy") || lowerMsg.includes("tìm xe")) {
      return "🛒 **Mua xe đạp trên VeloBike**\n\n" +
        "**Quy trình mua an toàn**:\n" +
        "1️⃣ **Tìm kiếm** xe theo nhu cầu\n" +
        "2️⃣ **Xem chi tiết** và hình ảnh\n" +
        "3️⃣ **Chat** với người bán\n" +
        "4️⃣ **Đặt hàng** và thanh toán\n" +
        "5️⃣ **Yêu cầu kiểm định** (khuyến nghị)\n" +
        "6️⃣ **Nhận xe** và xác nhận\n\n" +
        "🔒 **Bảo vệ**: Tiền được giữ Escrow\n" +
        "🛡️ **An toàn**: Hoàn tiền 100% nếu xe không đúng mô tả\n" +
        "🔍 **Tìm ngay**: Mở app > Tìm kiếm > Lọc theo nhu cầu";
    }
    
    // Safety and security
    if (lowerMsg.includes("an toàn") || lowerMsg.includes("lừa đảo") || lowerMsg.includes("bảo mật") || lowerMsg.includes("escrow")) {
      return "� **Hệ thống an toàn VeloBike**\n\n" +
        "**Bảo vệ người mua**:\n" +
        "✅ Hệ thống **Escrow** giữ tiền an toàn\n" +
        "✅ **KYC verification** cho người bán\n" +
        "✅ **Kiểm định chuyên nghiệp** 50 điểm\n" +
        "✅ **Đánh giá** từ cộng đồng\n" +
        "✅ **Bảo hiểm** giao dịch\n\n" +
        "**Nguyên tắc vàng**:\n" +
        "❌ Không chuyển tiền trực tiếp\n" +
        "❌ Không giao dịch ngoài app\n" +
        "✅ Luôn yêu cầu kiểm định\n" +
        "✅ Gặp mặt nơi công cộng\n\n" +
        "🆘 **Hỗ trợ 24/7**: Hotline 1900-xxxx";
    }
    
    // Greeting responses
    if (lowerMsg.includes("xin chào") || lowerMsg.includes("hello") || lowerMsg.includes("hi") || lowerMsg === "chào") {
      return "👋 **Xin chào! Chào mừng bạn đến với VeloBike!**\n\n" +
        "Tôi là trợ lý AI của VeloBike - sàn mua bán xe đạp thể thao uy tín nhất Việt Nam.\n\n" +
        "🚴‍♂️ **Tôi có thể giúp bạn**:\n" +
        "• Tư vấn mua/bán xe đạp\n" +
        "• Định giá xe chính xác\n" +
        "• Hướng dẫn sử dụng dịch vụ\n" +
        "• Giải đáp thắc mắc về an toàn\n\n" +
        "💬 **Hãy hỏi tôi bất cứ điều gì về xe đạp nhé!**";
    }
    
    return null;
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
      console.log(`Getting conversation history for user ${userId}, limit: ${limit}`);
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