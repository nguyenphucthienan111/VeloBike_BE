# Chatbot Integration Guide

## Overview
VeloBike integrates with Google Gemini AI to provide intelligent customer support through a chatbot system.

## Current Configuration
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

## Features

### 1. Hybrid Response System
- **Rule-based responses**: Fast answers for common questions
- **AI-powered responses**: Gemini AI for complex queries
- **Conversation history**: Context-aware responses
- **Fallback system**: Graceful degradation when AI is unavailable

### 2. VeloBike-Specific Knowledge
The chatbot is trained with VeloBike context including:
- Bicycle marketplace information
- Inspection services (50-point check, 500,000 VNĐ fee)
- PayOS payment system with Escrow
- Shipping partners (GHN, GHTK, VNPost)
- KYC verification process

### 3. Quick Responses
Pre-programmed responses for common topics:
- **Pricing**: Bike valuation guidance
- **Inspection**: Service details and booking
- **Payment**: Escrow system explanation
- **Shipping**: Delivery options and tracking

## API Endpoints

### Send Message to Chatbot
```
POST /api/chatbot/webhook
```

**Request:**
```json
{
  "userId": "user123",
  "message": "Xe đạp Giant Defy giá bao nhiêu?"
}
```

**Response:**
```json
{
  "success": true,
  "reply": "💰 **Định giá xe đạp**\n\nĐể định giá chính xác, tôi cần thông tin:\n• Thương hiệu (Trek, Giant, Specialized...)\n• Model và năm sản xuất\n• Tình trạng xe (mới, như mới, tốt, cần sửa chữa)\n• Hình ảnh thực tế\n\nBạn cũng có thể sử dụng tính năng 'Định giá AI' trong app để có giá tham khảo ngay!"
}
```

## Setup Instructions

### Step 1: Get Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `.env` file

### Step 2: Install Dependencies
```bash
npm install @google/generative-ai
```

### Step 3: Update Environment
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### Step 4: Test the Integration
```bash
curl -X POST http://localhost:5000/api/chatbot/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "message": "Tôi muốn bán xe đạp"
  }'
```

## Conversation Flow

### 1. Message Processing
```
User Message → Rule-based Check → AI Processing → Response Generation → Save to DB
```

### 2. Context Building
- Recent conversation history (last 5 messages)
- VeloBike-specific context
- User preferences (if available)

### 3. Response Types
- **Quick Response**: Rule-based, instant
- **AI Response**: Gemini-generated, contextual
- **Fallback Response**: Default when AI fails

## Database Schema

### ChatbotConversation Model
```typescript
{
  userId: String,        // User identifier
  message: String,       // Message content
  sender: 'user' | 'bot', // Message sender
  timestamp: Date        // When message was sent
}
```

## Customization

### Adding New Quick Responses
Edit `getQuickResponse()` method in `ChatbotService.ts`:

```typescript
if (lowerMsg.includes("bảo hành") || lowerMsg.includes("warranty")) {
  return "🛡️ **Chính sách bảo hành**\n\n" +
    "• Xe mới: Bảo hành theo nhà sản xuất\n" +
    "• Xe cũ: Bảo hành 30 ngày với VeloBike\n" +
    "• Kiểm định: Bảo hành chất lượng báo cáo";
}
```

### Updating AI Context
Modify `VELOBIKE_CONTEXT` constant:

```typescript
private static readonly VELOBIKE_CONTEXT = `
Bạn là trợ lý AI của VeloBike...
[Add new context information here]
`;
```

## Testing

### Unit Tests
```javascript
describe('ChatbotService', () => {
  it('should return quick response for pricing questions', async () => {
    const response = await ChatbotService.processMessage('user1', 'xe này giá bao nhiêu?');
    expect(response).toContain('Định giá xe đạp');
  });
});
```

### Integration Tests
```bash
# Test rule-based responses
curl -X POST http://localhost:5000/api/chatbot/webhook \
  -d '{"userId":"test","message":"kiểm định xe"}'

# Test AI responses  
curl -X POST http://localhost:5000/api/chatbot/webhook \
  -d '{"userId":"test","message":"Tôi có một chiếc Trek Domane 2020, muốn bán thì làm thế nào?"}'
```

## Monitoring

### Conversation Statistics
```
GET /api/chatbot/stats
```

Returns:
```json
{
  "totalConversations": 1250,
  "uniqueUsers": 340,
  "todayConversations": 45
}
```

### Logs
Monitor chatbot performance:
```bash
grep "Chatbot Service" logs/app.log
grep "Gemini AI Error" logs/app.log
```

## Best Practices

### 1. Response Quality
- Keep responses concise and helpful
- Use emojis and formatting for better readability
- Provide actionable next steps
- Include contact information for complex issues

### 2. Error Handling
- Always provide fallback responses
- Log AI errors for debugging
- Don't expose technical errors to users
- Graceful degradation when services are down

### 3. Performance
- Use quick responses for common questions
- Cache frequent AI responses
- Implement rate limiting
- Monitor API usage and costs

### 4. Privacy
- Don't store sensitive information in conversations
- Implement data retention policies
- Allow users to delete conversation history
- Comply with privacy regulations

## Troubleshooting

### Common Issues

1. **Gemini API Key Invalid**
   ```
   Error: API key not valid
   ```
   Solution: Check API key in Google AI Studio

2. **Rate Limiting**
   ```
   Error: Quota exceeded
   ```
   Solution: Implement request throttling or upgrade plan

3. **Context Too Long**
   ```
   Error: Input too long
   ```
   Solution: Limit conversation history length

4. **Network Errors**
   ```
   Error: Failed to fetch
   ```
   Solution: Implement retry logic with exponential backoff

### Debug Mode
Enable detailed logging:
```env
NODE_ENV=development
CHATBOT_DEBUG=true
```

## Future Enhancements

### Planned Features
- **Voice support**: Speech-to-text integration
- **Image analysis**: Bike photo evaluation
- **Multi-language**: English and Vietnamese support
- **Sentiment analysis**: Detect user satisfaction
- **Integration**: Connect with order and listing systems
- **Analytics**: Detailed conversation insights

### Advanced AI Features
- **Fine-tuning**: Custom model training on VeloBike data
- **Embeddings**: Semantic search for better responses
- **Function calling**: Direct integration with VeloBike APIs
- **Personalization**: User-specific response customization

## Cost Management

### Gemini API Pricing
- Free tier: 15 requests per minute
- Paid tier: $0.00025 per 1K characters

### Optimization Tips
- Use rule-based responses for common questions
- Implement response caching
- Limit conversation history length
- Monitor usage with alerts

### Budget Alerts
Set up monitoring for API costs:
```javascript
// Example cost tracking
const estimatedCost = (inputTokens + outputTokens) * 0.00025 / 1000;
if (estimatedCost > dailyBudget) {
  // Switch to fallback responses
}
```