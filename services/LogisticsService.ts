import { Order } from "../models/Order";

interface ShippingRate {
  serviceId: string;
  serviceName: string; // e.g., "Giao Hàng Nhanh - Chuẩn", "Viettel Post - Hỏa Tốc"
  fee: number;
  estimatedDeliveryDate: Date;
}

export class LogisticsService {
  /**
   * Calculate shipping fees (Mock API)
   * In production, this would call GHN/Viettel Post API
   */
  static async calculateShippingFee(
    origin: { city: string; district: string },
    destination: { city: string; district: string },
    weightKg: number
  ): Promise<ShippingRate[]> {
    // Mock logic: Base fee + distance factor + weight factor
    const baseFee = 50000;
    const weightSurcharge = weightKg * 5000;
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const today = new Date();
    const deliveryStandard = new Date(today);
    deliveryStandard.setDate(today.getDate() + 5);

    const deliveryExpress = new Date(today);
    deliveryExpress.setDate(today.getDate() + 2);

    return [
      {
        serviceId: "GHN_STD",
        serviceName: "Giao Hàng Nhanh - Chuẩn",
        fee: baseFee + weightSurcharge,
        estimatedDeliveryDate: deliveryStandard,
      },
      {
        serviceId: "VTP_FAST",
        serviceName: "Viettel Post - Hỏa Tốc",
        fee: (baseFee + weightSurcharge) * 1.5,
        estimatedDeliveryDate: deliveryExpress,
      },
    ];
  }

  /**
   * Create shipment (Mock API)
   */
  static async createShipment(
    orderId: string,
    serviceId: string,
    pickupAddress: any,
    deliveryAddress: any
  ): Promise<{ trackingNumber: string; carrier: string }> {
    const trackingNumber = `TRK-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    
    const carrierMap: Record<string, string> = {
      GHN_STD: "Giao Hàng Nhanh",
      GHTK_STD: "Giao Hàng Tiết Kiệm",
      VTP_FAST: "Viettel Post",
      GRAB_EXPRESS: "GrabExpress",
    };
    const carrier = carrierMap[serviceId] || serviceId;

    console.log(`Shipment created for Order ${orderId} via ${carrier}: ${trackingNumber}`);
    
    return { trackingNumber, carrier };
  }

  /**
   * Get tracking info (Mock API)
   */
  static async getTrackingInfo(trackingNumber: string) {
    return {
      trackingNumber,
      status: "IN_TRANSIT",
      location: "Kho trung chuyển Hà Nội",
      timestamp: new Date(),
    };
  }
}
