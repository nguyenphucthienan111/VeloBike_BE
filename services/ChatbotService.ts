// import { GoogleGenerativeAI } from "@google/generative-ai"; // TODO: Install this package to use Gemini
import axios from "axios";

export class ChatbotService {
  // private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  // private static model = this.genAI.getGenerativeModel({ model: "gemini-pro" });

  static async processMessage(userId: string, message: string): Promise<string> {
    try {
      // 1. Check for basic keywords first (Rule-based layer)
      const lowerMsg = message.toLowerCase();
      
      if (lowerMsg.includes("giá") || lowerMsg.includes("price") || lowerMsg.includes("bao nhiêu")) {
        return "Để định giá xe chính xác, bạn vui lòng cung cấp: Thương hiệu, Model, Năm sản xuất và Tình trạng xe (hoặc hình ảnh).";
      }
      
      if (lowerMsg.includes("kiểm định") || lowerMsg.includes("inspection")) {
        return "Dịch vụ kiểm định của VeloBike bao gồm 50 điểm kiểm tra kỹ thuật. Phí dịch vụ là 500.000 VNĐ. Bạn có muốn đặt lịch ngay không?";
      }

       if (lowerMsg.includes("thanh toán") || lowerMsg.includes("payos")) {
        return "Hệ thống hỗ trợ thanh toán an toàn qua PayOS. Tiền của bạn sẽ được giữ đảm bảo (Escrow) cho đến khi bạn nhận và kiểm tra xe.";
      }

      // 2. Fallback to AI (Simulated via Axios if needed, or just placeholder)
      if (process.env.GEMINI_API_KEY) {
         // Example of how to call it if package was installed:
         // const result = await this.model.generateContent(message);
         // return result.response.text();
         
         // For now, return a generic smart response stub
         return "Cảm ơn câu hỏi của bạn. Hệ thống AI đang được bảo trì. Vui lòng liên hệ hotline 1900-xxxx để được hỗ trợ nhanh nhất.";
      }

      // 3. Default stub response
      return "Cảm ơn bạn đã liên hệ VeloBike. Tôi chưa hiểu rõ câu hỏi của bạn. Bạn có thể thử hỏi về 'giá xe', 'quy trình kiểm định' hoặc 'thanh toán' được không?";

    } catch (error) {
      console.error("Chatbot Service Error:", error);
      throw new Error("Unable to process message");
    }
  }
}