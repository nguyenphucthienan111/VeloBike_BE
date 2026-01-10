# 📱 SMS INTEGRATION GUIDE - VIETNAM

## 🇻🇳 VIETNAMESE SMS PROVIDERS

### **Recommended Providers:**

#### 1. **ESMS.vn** ⭐ (Recommended)
- **Website**: https://esms.vn/
- **Pricing**: ~500-800 VND/SMS
- **Features**: Brandname SMS, OTP, API
- **Docs**: https://esms.vn/blog/api-gui-sms

#### 2. **VIETGUYS**
- **Website**: https://vietguys.biz/
- **Pricing**: ~600-900 VND/SMS
- **Features**: Bulk SMS, API integration

#### 3. **SPEEDSMS**
- **Website**: https://speedsms.vn/
- **Pricing**: ~400-700 VND/SMS
- **Features**: Fast delivery, API

#### 4. **STRINGEE**
- **Website**: https://stringee.com/
- **Pricing**: ~500-800 VND/SMS
- **Features**: Voice + SMS platform

---

## 🔧 INTEGRATION STEPS

### **Step 1: Choose Provider & Register**
1. Visit provider website
2. Register business account
3. Submit business documents
4. Get API credentials

### **Step 2: Update Environment Variables**
```bash
# Example for ESMS.vn
SMS_API_URL=https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/
SMS_API_KEY=your_esms_api_key
SMS_SECRET_KEY=your_esms_secret_key
SMS_SENDER=VeloBike
```

### **Step 3: Update SMSService.ts**
Uncomment the real SMS integration code in `services/SMSService.ts`

### **Step 4: Test Integration**
```bash
# Test SMS sending
npm run dev
# Call API: POST /api/auth/forgot-password
```

---

## 📋 ESMS.vn INTEGRATION EXAMPLE

### **API Endpoint:**
```
POST https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/
```

### **Request Body:**
```json
{
  "ApiKey": "your_api_key",
  "SecretKey": "your_secret_key",
  "Phone": "0901234567",
  "Content": "Ma xac thuc VeloBike cua ban la: 123456",
  "SmsType": 2,
  "Brandname": "VeloBike"
}
```

### **Response:**
```json
{
  "CodeResult": "100",
  "CountRegenerate": 0,
  "SMSID": "d8e8fca2dc0f896fd7cb4cb0031ba249"
}
```

---

## 🚀 CURRENT MOCK IMPLEMENTATION

**Current Status**: ✅ **MOCK SMS** (Development Ready)

**Features:**
- ✅ Phone number validation
- ✅ Vietnamese format support
- ✅ OTP generation
- ✅ Bulk SMS simulation
- ✅ Console logging
- ✅ Error handling

**Mock Output:**
```
[SMS MOCK] Sending to 0901234567: Ma xac thuc VeloBike: 123456
✅ SMS sent successfully to 0901234567 (MOCK)
```

---

## 💰 COST ESTIMATION

### **Monthly SMS Volume:**
- **OTP SMS**: ~1,000 SMS/month
- **Notifications**: ~500 SMS/month
- **Marketing**: ~2,000 SMS/month
- **Total**: ~3,500 SMS/month

### **Cost Calculation:**
- **ESMS**: 3,500 × 600 VND = **2,100,000 VND/month**
- **SPEEDSMS**: 3,500 × 500 VND = **1,750,000 VND/month**

---

## 🔒 SECURITY CONSIDERATIONS

1. **API Key Protection**: Store in environment variables
2. **Rate Limiting**: Implement SMS rate limiting
3. **Phone Validation**: Validate Vietnamese phone numbers
4. **OTP Expiry**: Set appropriate expiry times
5. **Spam Prevention**: Limit SMS per phone/day

---

## 🧪 TESTING

### **Mock Testing (Current):**
```bash
npm test
# All SMS tests pass with mock
```

### **Real Provider Testing:**
```bash
# 1. Update .env with real credentials
# 2. Uncomment real SMS code
# 3. Test with your phone number
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'
```

---

## 📞 SUPPORT

**Need Help?**
- ESMS Support: support@esms.vn
- VIETGUYS Support: support@vietguys.biz
- SPEEDSMS Support: support@speedsms.vn

**Integration Issues?**
Check the console logs for detailed error messages and API responses.

---

**Status**: 🟢 **Ready for Production** (with provider setup)