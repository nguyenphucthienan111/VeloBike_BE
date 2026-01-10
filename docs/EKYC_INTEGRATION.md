# eKYC Integration Guide

## Overview
VeloBike uses eKYC (electronic Know Your Customer) verification to verify seller identities. Currently configured as mock for development.

## Current Configuration (Mock)
```env
EKYC_WEBHOOK_SECRET=mock_ekyc_secret_for_development
```

## Vietnamese eKYC Providers

### 1. VNPT eKYC
- **Website**: https://ekyc.vnpt.vn/
- **Features**: ID card verification, face matching, liveness detection
- **Pricing**: Contact for pricing
- **Integration**: REST API + Webhook

### 2. FPT eKYC
- **Website**: https://ekyc.fpt.ai/
- **Features**: OCR, face recognition, document verification
- **Pricing**: Pay per transaction
- **Integration**: REST API + Webhook

### 3. Viettel eKYC
- **Website**: https://ekyc.viettel.vn/
- **Features**: Government-grade verification
- **Pricing**: Enterprise pricing
- **Integration**: REST API + Webhook

## Mock Implementation

### Current Behavior
- All webhook signatures are accepted with mock secret
- Manual verification available through admin panel
- No real document processing

### Testing eKYC Webhook
```bash
curl -X POST http://localhost:5000/api/kyc/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_HERE",
    "status": "VERIFIED",
    "confidence": 0.95,
    "documentData": {
      "idNumber": "123456789",
      "fullName": "Nguyen Van A",
      "dateOfBirth": "1990-01-01"
    },
    "faceMatch": true,
    "signature": "mock_signature"
  }'
```

## Production Setup

### Step 1: Choose Provider
Select one of the Vietnamese eKYC providers based on:
- Pricing model
- Accuracy requirements
- Integration complexity
- Support quality

### Step 2: Update Environment Variables
```env
# Example for VNPT eKYC
EKYC_API_URL=https://api.ekyc.vnpt.vn/v1/
EKYC_API_KEY=your_vnpt_api_key
EKYC_WEBHOOK_SECRET=your_real_webhook_secret
```

### Step 3: Update KYC Controller
The current controller supports webhook verification and will work with real providers.

### Step 4: Frontend Integration
Add eKYC document upload and camera capture features to the frontend.

## Security Considerations

### Webhook Security
- Always verify webhook signatures
- Use HTTPS for webhook endpoints
- Implement rate limiting
- Log all verification attempts

### Data Protection
- Encrypt stored KYC data
- Implement data retention policies
- Comply with Vietnamese data protection laws
- Regular security audits

## API Endpoints

### Webhook Endpoint
```
POST /api/kyc/webhook
```
Receives verification results from eKYC provider.

### Manual Verification (Admin)
```
POST /api/kyc/manual-verify/:userId
```
Allows admin to manually verify users.

### Get Pending Verifications
```
GET /api/kyc/pending
```
Returns list of users pending verification.

### KYC Statistics
```
GET /api/kyc/stats
```
Returns verification statistics for admin dashboard.

## Testing

### Mock Webhook Test
```javascript
// Test successful verification
const mockWebhook = {
  userId: "user123",
  status: "VERIFIED",
  confidence: 0.95,
  documentData: { /* document info */ },
  faceMatch: true,
  signature: "calculated_signature"
};
```

### Manual Verification Test
```javascript
// Admin manually verifies user
const manualVerify = {
  status: "VERIFIED",
  note: "Documents verified manually"
};
```

## Troubleshooting

### Common Issues
1. **Invalid Signature**: Check webhook secret configuration
2. **User Not Found**: Verify userId in webhook payload
3. **Low Confidence**: Adjust confidence threshold in controller
4. **Webhook Timeout**: Implement retry mechanism

### Logs
Check application logs for eKYC webhook processing:
```bash
grep "KYC WEBHOOK" logs/app.log
```

## Future Enhancements
- Real-time verification status updates
- Document quality scoring
- Fraud detection integration
- Multi-language support for documents
- Batch verification processing