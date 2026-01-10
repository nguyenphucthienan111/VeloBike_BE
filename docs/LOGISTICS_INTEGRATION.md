# Logistics Integration Guide

## Overview
VeloBike integrates with Vietnamese logistics providers for shipping bicycles. Currently configured as mock for development.

## Current Configuration (Mock)
```env
GHN_API_KEY=mock_ghn_key_for_development
GHTK_API_KEY=mock_ghtk_key_for_development
```

## Vietnamese Logistics Providers

### 1. GHN (Giao Hàng Nhanh)
- **Website**: https://ghn.vn/
- **Pricing**: No free tier, pay per shipment
- **Coverage**: Nationwide, strong in urban areas
- **Features**: Real-time tracking, COD support, API integration
- **Registration**: Business license required

### 2. GHTK (Giao Hàng Tiết Kiệm)
- **Website**: https://ghtk.vn/
- **Pricing**: No free tier, competitive rates
- **Coverage**: Nationwide, good rural coverage
- **Features**: Bulk shipping, warehouse services
- **Registration**: Business license required

### 3. VNPost (Vietnam Post)
- **Website**: https://vnpost.vn/
- **Pricing**: Government rates, affordable
- **Coverage**: Best rural coverage
- **Features**: Traditional postal service, EMS express
- **Registration**: Easier registration process

### 4. J&T Express
- **Website**: https://jtexpress.vn/
- **Pricing**: Competitive rates
- **Coverage**: Growing network
- **Features**: Fast delivery, modern tracking

## Mock Implementation

### Current Features
- Shipping fee calculation (mock rates)
- Shipment creation (mock tracking numbers)
- Tracking information (mock status updates)
- Support for multiple carriers

### Mock Shipping Rates
```javascript
// Standard delivery (5 days)
{
  serviceId: "GHN_STD",
  serviceName: "Giao Hàng Nhanh - Chuẩn",
  fee: 50000 + (weight * 5000), // Base + weight surcharge
  estimatedDeliveryDate: "5 days from now"
}

// Express delivery (2 days)
{
  serviceId: "VTP_FAST", 
  serviceName: "Viettel Post - Hỏa Tốc",
  fee: (50000 + (weight * 5000)) * 1.5, // 50% premium
  estimatedDeliveryDate: "2 days from now"
}
```

## API Endpoints

### Calculate Shipping Fee
```
POST /api/logistics/calculate-fee
```

**Request:**
```json
{
  "origin": {
    "city": "Hanoi",
    "district": "Ba Dinh"
  },
  "destination": {
    "city": "Ho Chi Minh City", 
    "district": "District 1"
  },
  "weight": 15.5
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "serviceId": "GHN_STD",
      "serviceName": "Giao Hàng Nhanh - Chuẩn",
      "fee": 127500,
      "estimatedDeliveryDate": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

### Create Shipment
```
POST /api/logistics/create-shipment
```

**Request:**
```json
{
  "orderId": "order123",
  "serviceId": "GHN_STD"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trackingNumber": "TRK-123456",
    "carrier": "Giao Hàng Nhanh"
  }
}
```

### Track Shipment
```
GET /api/logistics/tracking/:trackingNumber
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trackingNumber": "TRK-123456",
    "status": "IN_TRANSIT",
    "location": "Kho trung chuyển Hà Nội",
    "timestamp": "2024-01-10T10:30:00.000Z"
  }
}
```

## Production Setup

### Step 1: Choose Primary Provider
Consider factors:
- **Coverage area**: Urban vs rural delivery needs
- **Pricing**: Compare rates for typical bicycle shipments
- **API quality**: Documentation and reliability
- **Business requirements**: License and registration needs

### Step 2: Register with Provider
Most providers require:
- Business license (Giấy phép kinh doanh)
- Tax code (Mã số thuế)
- Bank account information
- Address verification

### Step 3: Update Environment Variables
```env
# GHN Configuration
GHN_API_KEY=your_real_ghn_api_key
GHN_SHOP_ID=your_ghn_shop_id
GHN_API_URL=https://dev-online-gateway.ghn.vn/shiip/public-api/

# GHTK Configuration  
GHTK_API_KEY=your_real_ghtk_api_key
GHTK_API_URL=https://services.ghtk.vn/services/
```

### Step 4: Update LogisticsService
Replace mock implementations with real API calls:

```typescript
// Example GHN integration
static async calculateShippingFee(origin, destination, weight) {
  const response = await fetch('https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee', {
    method: 'POST',
    headers: {
      'Token': process.env.GHN_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      service_id: 53320,
      insurance_value: 0,
      coupon: null,
      from_district_id: origin.districtId,
      to_district_id: destination.districtId,
      weight: weight * 1000, // Convert to grams
      length: 150, // Typical bike box dimensions
      width: 20,
      height: 80
    })
  });
  
  const data = await response.json();
  return data.data;
}
```

## Bicycle Shipping Considerations

### Packaging Requirements
- **Dimensions**: Typical bike box 150cm x 80cm x 20cm
- **Weight**: 10-25kg depending on bike type
- **Protection**: Bubble wrap, cardboard protection
- **Disassembly**: Remove pedals, turn handlebars

### Special Handling
- **Fragile item**: Mark as fragile
- **Insurance**: Consider insurance for high-value bikes
- **Pickup scheduling**: Coordinate with seller availability
- **Delivery confirmation**: Require signature on delivery

### Cost Factors
- **Base shipping fee**: Distance-based
- **Weight surcharge**: Per kg over base weight
- **Size surcharge**: Oversized item fee
- **Insurance**: Optional coverage
- **COD fee**: If cash on delivery

## Testing

### Mock API Testing
```bash
# Calculate shipping fee
curl -X POST http://localhost:5000/api/logistics/calculate-fee \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"city": "Hanoi", "district": "Ba Dinh"},
    "destination": {"city": "Ho Chi Minh City", "district": "District 1"},
    "weight": 15.5
  }'

# Create shipment (requires auth)
curl -X POST http://localhost:5000/api/logistics/create-shipment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER_ID",
    "serviceId": "GHN_STD"
  }'

# Track shipment
curl http://localhost:5000/api/logistics/tracking/TRK-123456
```

## Error Handling

### Common Issues
1. **Invalid addresses**: Validate city/district codes
2. **Weight limits**: Check provider weight restrictions
3. **Service unavailable**: Handle API downtime gracefully
4. **Rate limiting**: Implement retry logic with backoff

### Error Responses
```json
{
  "success": false,
  "message": "Destination not supported by carrier",
  "code": "UNSUPPORTED_DESTINATION"
}
```

## Future Enhancements
- **Multi-carrier comparison**: Show rates from multiple providers
- **Delivery scheduling**: Let buyers choose delivery time slots
- **Pickup coordination**: Automated pickup scheduling
- **Real-time tracking**: WebSocket updates for tracking status
- **Delivery photos**: Proof of delivery images
- **Return logistics**: Handle return shipments