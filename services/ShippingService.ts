/**
 * ShippingService — tính phí vận chuyển dựa trên khoảng cách thực tế (Haversine)
 * Geocoding: OpenStreetMap Nominatim (miễn phí, không cần API key)
 */

import https from "https";

export interface ShippingBreakdown {
  distanceKm: number;
  baseFee: number;
  weightFee: number;
  bulkySurcharge: number;
  total: number;
  weightKg: number;
  sellerCity: string;
  buyerCity: string;
  note: string;
}

// Phí theo khoảng cách
function getBaseFee(km: number): { fee: number; note: string } {
  if (km <= 50)   return { fee: 25000,  note: "Nội thành / gần (<50km)" };
  if (km <= 200)  return { fee: 45000,  note: "Liên tỉnh gần (50–200km)" };
  if (km <= 500)  return { fee: 70000,  note: "Liên tỉnh trung (200–500km)" };
  if (km <= 1000) return { fee: 95000,  note: "Liên tỉnh xa (500–1000km)" };
  return           { fee: 120000, note: "Xuyên quốc gia (>1000km)" };
}

const FREE_WEIGHT_KG = 5;
const EXTRA_FEE_PER_KG = 5000;
const BULKY_THRESHOLD_KG = 15;
const BULKY_SURCHARGE = 20000;

// Simple in-memory cache để tránh gọi Nominatim nhiều lần cho cùng địa chỉ
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

/**
 * Geocode địa chỉ → tọa độ qua Nominatim (OpenStreetMap)
 */
async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const key = address.toLowerCase().trim();
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;

  const query = encodeURIComponent(`${address}, Vietnam`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=vn`;

  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { "User-Agent": "VeloBike/1.0 (velobike-app)" },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const results = JSON.parse(data);
          if (results.length > 0) {
            const result = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
            geocodeCache.set(key, result);
            resolve(result);
          } else {
            geocodeCache.set(key, null);
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
  });
}

/**
 * Haversine formula — khoảng cách đường chim bay giữa 2 tọa độ (km)
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class ShippingService {
  /**
   * Tính phí vận chuyển dựa trên khoảng cách thực tế
   * Fallback về ước tính theo vùng nếu geocode thất bại
   */
  static async calculate(
    sellerCity: string,
    buyerCity: string,
    weightKg: number = 10
  ): Promise<ShippingBreakdown> {
    let distanceKm = 0;
    let note = "";

    // Geocode cả 2 địa chỉ song song
    const [sellerCoords, buyerCoords] = await Promise.all([
      geocode(sellerCity),
      geocode(buyerCity),
    ]);

    if (sellerCoords && buyerCoords) {
      distanceKm = Math.round(haversineKm(
        sellerCoords.lat, sellerCoords.lng,
        buyerCoords.lat, buyerCoords.lng
      ));
      // Đường bộ thường dài hơn đường chim bay ~30%
      distanceKm = Math.round(distanceKm * 1.3);
    } else {
      // Fallback: ước tính 500km nếu không geocode được
      distanceKm = 500;
      note = " (ước tính)";
    }

    const { fee: baseFee, note: distNote } = getBaseFee(distanceKm);

    const extraWeight = Math.max(0, weightKg - FREE_WEIGHT_KG);
    const weightFee = Math.ceil(extraWeight) * EXTRA_FEE_PER_KG;
    const bulkySurcharge = weightKg > BULKY_THRESHOLD_KG ? BULKY_SURCHARGE : 0;
    const total = baseFee + weightFee + bulkySurcharge;

    return {
      distanceKm,
      baseFee,
      weightFee,
      bulkySurcharge,
      total,
      weightKg,
      sellerCity,
      buyerCity,
      note: distNote + note,
    };
  }
}
