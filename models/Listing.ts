import mongoose, {
  Schema,
  Document as MongooseDocument,
  Types,
} from "mongoose";

// 1. Base Interfaces & Enums
export enum BikeType {
  ROAD = "ROAD",
  MTB = "MTB",
  GRAVEL = "GRAVEL",
  TRIATHLON = "TRIATHLON",
  E_BIKE = "E_BIKE",
}

export enum ListingStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL", // SRS requirement: Admin approval needed
  PUBLISHED = "PUBLISHED",
  REJECTED = "REJECTED", // Admin rejected listing
  IN_INSPECTION = "IN_INSPECTION",
  SOLD = "SOLD",
}

// Common Interface for all bikes
export interface IListing extends MongooseDocument {
  sellerId: Types.ObjectId;
  title: string;
  description: string;
  type: BikeType;
  status: ListingStatus;
  generalInfo: {
    brand: string;
    model: string;
    year: number;
    size: string;
    condition?: string; // NEW, LIKE_NEW, GOOD, FAIR, PARTS
  };
  specs?: {
    frameMaterial?: string;
    groupset?: string;
    wheelset?: string;
    brakeType?: string;
    suspensionType?: string;
    travelFront?: string;
    travelRear?: string;
    wheelSize?: string;
    weight?: number;
  };
  geometry?: {
    stack?: number;
    reach?: number;
  };
  pricing: {
    amount: number;
    currency: string;
    originalPrice?: number;
  };
  media: {
    thumbnails: string[];
    spin360Urls?: string[];
    videoUrl?: string;
  };
  location: {
    type: string;
    coordinates: number[];
    address?: string;
  };
  inspectionRequired: boolean;
  inspectionScore?: number;
  inspectionReport?: Types.ObjectId;
  views: number;
  createdAt: Date;
}

// 2. Base Schema
const ListingSchema = new Schema<IListing>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, index: "text" },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(BikeType),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ListingStatus),
      default: ListingStatus.DRAFT,
      index: true,
    },

    generalInfo: {
      brand: { type: String, required: true, index: true },
      model: { type: String, required: true, index: true },
      year: { type: Number, required: true, index: true },
      size: { type: String, required: true },
      condition: {
        type: String,
        enum: ["NEW", "LIKE_NEW", "GOOD", "FAIR", "PARTS"],
        default: "GOOD",
      },
    },

    specs: {
      frameMaterial: String,
      groupset: String,
      wheelset: String,
      brakeType: String,
      suspensionType: String,
      travelFront: String,
      travelRear: String,
      wheelSize: String,
      weight: Number,
    },

    geometry: {
      stack: Number,
      reach: Number,
    },

    pricing: {
      amount: { type: Number, required: true, min: 0, index: true },
      currency: { type: String, default: "VND" },
      originalPrice: Number,
    },

    media: {
      thumbnails: [String],
      spin360Urls: [String],
      videoUrl: String,
    },

    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], index: "2dsphere" },
      address: String,
    },

    inspectionRequired: { type: Boolean, default: false },
    inspectionScore: { type: Number, min: 1, max: 10 },
    inspectionReport: { type: Schema.Types.ObjectId, ref: "Inspection" },
    views: { type: Number, default: 0, index: true },
  },
  {
    timestamps: true,
    discriminatorKey: "type",
  }
);

// 3. Create Base Model
export const Listing = mongoose.model<IListing>("Listing", ListingSchema);

// 4. Define Discriminator Schemas (Specific Specs)

// --- ROAD BIKE ---
const RoadBikeSchema = new Schema({
  specs: {
    frameMaterial: { type: String, required: true }, // e.g., Carbon FACT 12r
    groupset: { type: String, required: true }, // e.g., Dura-Ace Di2
    wheelset: String,
    brakeType: { type: String, enum: ["Disc", "Rim"], required: true },
  },
  geometry: {
    stack: Number,
    reach: Number,
  },
});

// --- MTB ---
const MtbSchema = new Schema({
  specs: {
    frameMaterial: String,
    suspensionType: { type: String, enum: ["Hardtail", "Full-Suspension"] },
    travelFront: { type: String }, // e.g., "160mm"
    travelRear: { type: String },
    wheelSize: { type: String, enum: ["27.5", "29", "Mullet"] },
  },
});

// --- E-BIKE ---
const EBikeSchema = new Schema({
  specs: {
    frameMaterial: String,
    motor: String, // e.g., Bosch Performance Line CX
    battery: String, // e.g., 625Wh
    range: String, // e.g., 80km
    maxSpeed: String, // e.g., 25km/h
    odometer: Number, // Total km ridden
  },
});

// 5. Apply Discriminators
export const RoadListing = Listing.discriminator(BikeType.ROAD, RoadBikeSchema);
export const MtbListing = Listing.discriminator(BikeType.MTB, MtbSchema);
export const EBikeListing = Listing.discriminator(BikeType.E_BIKE, EBikeSchema);
export const TriathlonListing = Listing.discriminator(
  BikeType.TRIATHLON,
  RoadBikeSchema
); // Shares structure with Road for now
