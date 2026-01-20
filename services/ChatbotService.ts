import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatbotConversation } from "../models/ChatbotConversation";
import { User } from "../models/User";
import { SubscriptionService } from "./SubscriptionService";

export class ChatbotService {
  // Initialize Gemini AI - make sure dotenv.config() runs before this
  private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  // Using gemini-1.5-flash: 1,500 requests/day (vs gemini-2.5-flash: only 20 requests/day)
  private static model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

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

  /**
   * Check if user can send message (rate limiting)
   */
  static async canSendMessage(userId: string): Promise<{ allowed: boolean; remaining: number; message?: string }> {
    try {
      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return { allowed: false, remaining: 0, message: "User not found. Please login." };
      }

      // Check subscription status
      // Only SELLER with PREMIUM subscription gets unlimited chat
      let isPremium = false;
      
      if (user.role === "SELLER") {
        const subscription = await SubscriptionService.getSellerSubscription(userId);
        isPremium = subscription?.planType === "PREMIUM" && subscription?.status === "ACTIVE";
      }
      
      if (isPremium) {
        return { allowed: true, remaining: -1 }; // -1 means unlimited
      }

      // For regular users: 25 messages per day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayMessages = await ChatbotConversation.aggregate([
        {
          $match: {
            userId: userId,
            createdAt: { $gte: today }
          }
        },
        {
          $unwind: "$messages"
        },
        {
          $match: {
            "messages.sender": "USER"
          }
        },
        {
          $count: "total"
        }
      ]);

      const messageCount = todayMessages[0]?.total || 0;
      const limit = 25;
      const remaining = Math.max(0, limit - messageCount);

      if (messageCount >= limit) {
        return { 
          allowed: false, 
          remaining: 0,
          message: "Bạn đã hết lượt chat hôm nay (25/25). Nâng cấp Premium để chat không giới hạn!" 
        };
      }

      return { allowed: true, remaining };
    } catch (error) {
      console.error("Error checking rate limit:", error);
      return { allowed: true, remaining: 25 }; // Fail open
    }
  }

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
      console.log("API Key (first 10 chars):", process.env.GEMINI_API_KEY?.substring(0, 10));
      
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "") {
        try {
          const history = await this.getRecentConversation(userId, 5);
          const contextualPrompt = this.buildEnhancedPrompt(message, history);
          
          console.log("Sending to Gemini AI with enhanced prompt...");
          console.log("Prompt length:", contextualPrompt.length);
          
          const result = await this.model.generateContent(contextualPrompt);
          const response = result.response;
          const aiResponse = response.text();
          
          console.log("✅ Gemini AI response received:", aiResponse.substring(0, 100) + "...");
          await this.saveConversation(userId, aiResponse, "bot");
          return aiResponse;
          
        } catch (aiError: any) {
          console.error("❌ Gemini AI Error:", aiError);
          console.error("Error details:", {
            message: aiError.message,
            status: aiError.status,
            statusText: aiError.statusText,
            name: aiError.name
          });
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
      if (!userId || userId === 'guest') {
        console.log('[CHATBOT] Skipping save for guest user');
        return;
      }

      // Find or create today's conversation
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const sessionId = `${userId}_${today.toISOString().split('T')[0]}`;

      await ChatbotConversation.findOneAndUpdate(
        { sessionId },
        {
          $setOnInsert: { userId, sessionId },
          $push: {
            messages: {
              sender: sender === 'user' ? 'USER' : 'BOT',
              text: message,
              timestamp: new Date()
            }
          }
        },
        { upsert: true, new: true }
      );

      console.log(`[CHATBOT] Saved ${sender.toUpperCase()} message for user ${userId}`);
    } catch (error) {
      console.error("Error saving conversation:", error);
    }
  }

  /**
   * Get recent conversation history
   */
  private static async getRecentConversation(userId: string, limit: number = 5): Promise<any[]> {
    try {
      if (!userId || userId === 'guest') {
        return [];
      }

      const conversations = await ChatbotConversation.find({ userId })
        .sort({ createdAt: -1 })
        .limit(1);

      if (conversations.length === 0) {
        return [];
      }

      const recentMessages = conversations[0].messages
        .slice(-limit * 2) // Get last N pairs (user + bot)
        .map(msg => ({
          sender: msg.sender.toLowerCase(),
          message: msg.text
        }));

      console.log(`Got ${recentMessages.length} recent messages for user ${userId}`);
      return recentMessages;
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
      const totalConversations = await ChatbotConversation.countDocuments();
      const uniqueUsers = await ChatbotConversation.distinct('userId');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayConversations = await ChatbotConversation.countDocuments({
        createdAt: { $gte: today }
      });

      return {
        totalConversations,
        uniqueUsers: uniqueUsers.length,
        todayConversations
      };
    } catch (error) {
      console.error("Error getting conversation stats:", error);
      return null;
    }
  }

  /**
   * Get user's conversations with pagination
   */
  static async getUserConversations(userId: string, skip: number = 0, limit: number = 10): Promise<any[]> {
    try {
      return await ChatbotConversation.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('sessionId messages createdAt updatedAt');
    } catch (error) {
      console.error("Error getting user conversations:", error);
      return [];
    }
  }

  /**
   * Get total conversation count for user
   */
  static async getConversationCount(userId: string): Promise<number> {
    try {
      return await ChatbotConversation.countDocuments({ userId });
    } catch (error) {
      console.error("Error getting conversation count:", error);
      return 0;
    }
  }
}