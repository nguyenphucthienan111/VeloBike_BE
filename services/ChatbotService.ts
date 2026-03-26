import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatbotConversation } from "../models/ChatbotConversation";
import { User } from "../models/User";
import { Listing } from "../models/Listing";
import { SubscriptionService } from "./SubscriptionService";

const FRONTEND_URL = process.env.CLIENT_URL?.replace(/\/$/, '') || "https://velo-bike-fe.vercel.app";

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

Gói subscription cho Seller:
- FREE: 2 tin đăng/tháng, phí 12%
- BASIC (99k/tháng): 10 tin đăng/tháng, phí 10%, badge Verified
- PRO (299k/tháng): 30 tin đăng/tháng, phí 8%, badge Pro, 1 boost/tuần
- PREMIUM (500k/tháng): Không giới hạn tin đăng, phí 5%, badge Premium, 3 boost/tuần, 2 kiểm định miễn phí/tháng, chat không giới hạn

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

  static async processMessage(userId: string, message: string): Promise<{ reply: string; listings: any[] }> {
    console.log("=== ChatbotService.processMessage START ===");
    console.log("Input:", { userId, message });
    
    try {
      // 1. Save user message to conversation history
      await this.saveConversation(userId, message, "user");

      // 2. Search relevant listings from DB
      const relevantListings = await this.searchRelevantListings(message);
      console.log(`Found ${relevantListings.length} relevant listings`);

      // 3. Try Gemini AI
      console.log("Step 3: Calling Gemini AI...");
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "") {
        try {
          const history = await this.getRecentConversation(userId, 5);
          const contextualPrompt = this.buildEnhancedPrompt(message, history, relevantListings);
          
          const result = await this.model.generateContent(contextualPrompt);
          const aiResponse = result.response.text();
          
          console.log("✅ Gemini AI response received");
          await this.saveConversation(userId, aiResponse, "bot");
          return { reply: aiResponse, listings: relevantListings };
          
        } catch (aiError: any) {
          console.error("❌ Gemini AI Error:", aiError.message);
        }
      }

      // 4. Fallback keyword response
      const keywordResponse = this.getKeywordResponse(message);
      if (keywordResponse) {
        await this.saveConversation(userId, keywordResponse, "bot");
        return { reply: keywordResponse, listings: relevantListings };
      }

      // 5. Final fallback
      const fallbackResponse = "Cảm ơn bạn đã liên hệ VeloBike! 🚴‍♂️\n\nTôi có thể giúp bạn tư vấn mua/bán xe đạp, kiểm định, hoặc hướng dẫn sử dụng dịch vụ.\n\nHãy hỏi tôi bất cứ điều gì!";
      await this.saveConversation(userId, fallbackResponse, "bot");
      return { reply: fallbackResponse, listings: relevantListings };

    } catch (error) {
      console.error("Chatbot Service Error:", error);
      const errorResponse = "Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau.";
      await this.saveConversation(userId, errorResponse, "bot");
      return { reply: errorResponse, listings: [] };
    }
  }

  /**
   * Search listings relevant to user's message
   */
  private static async searchRelevantListings(message: string): Promise<any[]> {
    try {
      // Remove Vietnamese stopwords and short words
      const stopwords = new Set(['bạn','có','biết','shop','nào','bán','xe','đạp','trên','hệ','thống','không','tôi','muốn','tìm','mua','một','chiếc','cho','về','và','là','của','với','được','này','đó','hay','hoặc','cũng','thì','mà','để','từ','theo','như','khi','vì','nếu','nhưng','rất','nhiều','ít','hơn','nhất','loại','dòng','model','hãng','brand','giá','price','nguồn','uy','tín']);

      const words = message
        .replace(/[^\w\sÀ-ỹ]/gi, ' ')
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length > 2 && !stopwords.has(w.toLowerCase()));

      if (words.length === 0) return [];

      // Build targeted search — exact phrase first, then individual keywords
      const phraseQuery = message.replace(/[^\w\sÀ-ỹ]/gi, ' ').trim();

      const orConditions: any[] = [
        { title: { $regex: phraseQuery, $options: 'i' } },
        { title: { $regex: words.join('|'), $options: 'i' } },
        { 'generalInfo.brand': { $regex: words.join('|'), $options: 'i' } },
        { 'generalInfo.model': { $regex: words.join('|'), $options: 'i' } },
      ];

      const typeMap: Record<string, string> = {
        'mountain': 'MTB', 'mtb': 'MTB', 'road': 'ROAD', 'gravel': 'GRAVEL',
        'triathlon': 'TRIATHLON', 'ebike': 'E_BIKE', 'electric': 'E_BIKE', 'e-bike': 'E_BIKE',
      };
      const matchedTypes = words.map(k => typeMap[k.toLowerCase()]).filter(Boolean);
      if (matchedTypes.length > 0) orConditions.push({ type: { $in: matchedTypes } });

      const listings = await Listing.find({ $or: orConditions, status: 'PUBLISHED' })
        .select('_id title type generalInfo pricing media')
        .limit(4)
        .lean();

      // Sort: exact title match first
      const lowerMsg = message.toLowerCase();
      listings.sort((a: any, b: any) => {
        const aMatch = a.title.toLowerCase().includes('specialized') || lowerMsg.includes(a.generalInfo?.brand?.toLowerCase() || '') ? -1 : 0;
        const bMatch = b.title.toLowerCase().includes('specialized') || lowerMsg.includes(b.generalInfo?.brand?.toLowerCase() || '') ? -1 : 0;
        return aMatch - bMatch;
      });

      return listings.map((l: any) => ({
        id: l._id.toString(),
        title: l.title,
        brand: l.generalInfo?.brand || '',
        model: l.generalInfo?.model || '',
        type: l.type,
        price: l.pricing?.amount || 0,
        image: l.media?.thumbnails?.[0] || '',
        url: `${FRONTEND_URL}/bike/${l._id}`,
      }));
    } catch (err) {
      console.error('Error searching listings:', err);
      return [];
    }
  }

  /**
   * Build enhanced contextual prompt for Gemini AI with better instructions
   */
  private static buildEnhancedPrompt(message: string, history: any[], listings: any[] = []): string {
    let prompt = `${this.VELOBIKE_CONTEXT}

HƯỚNG DẪN TRẢ LỜI:
- Trả lời bằng tiếng Việt, thân thiện và chuyên nghiệp
- Sử dụng emoji phù hợp để làm cho câu trả lời sinh động
- Cung cấp thông tin cụ thể về VeloBike khi có thể
- Nếu không chắc chắn, gợi ý liên hệ hotline hoặc sử dụng tính năng trong app
- Luôn tập trung vào việc giúp khách hàng mua/bán xe đạp an toàn và hiệu quả
- Đưa ra lời khuyên thực tế và hữu ích
- Khi có sản phẩm phù hợp từ VeloBike, hãy gợi ý chúng với định dạng đặc biệt bên dưới

`;

    if (listings.length > 0) {
      const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
      prompt += `SẢN PHẨM CÓ SẴN TRÊN VELOBIKE (liên quan đến câu hỏi):\n`;
      listings.forEach((l, i) => {
        prompt += `${i + 1}. ${l.title} | Hãng: ${l.brand} | Giá: ${fmt(l.price)}đ\n`;
      });
      prompt += `\nHãy đề cập rằng VeloBike đang có những sản phẩm này và khuyến khích người dùng xem trên marketplace.\n\n`;
    } else {
      prompt += `LƯU Ý: Không tìm thấy sản phẩm phù hợp trên VeloBike. Hãy gợi ý người dùng tìm kiếm trên marketplace hoặc đề xuất các loại xe tương tự.\n\n`;
    }
    
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