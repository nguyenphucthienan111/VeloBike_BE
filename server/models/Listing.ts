import mongoose, { Schema, Document } from 'mongoose';

// 1. Base Interfaces & Enums
export enum BikeType {
  ROAD = 'ROAD',
  MTB = 'MTB',
  GRAVEL = 'GRAVEL',
  TRIATHLON = 'TRIATHLON'
}

export enum ListingStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  IN_INSPECTION = 'IN_INSPECTION',
  SOLD = 'SOLD'
}

// Common Interface for all bikes
export interface IListing extends Document {
  sellerId: mongoose.Types.ObjectId;
  title: string;
  type: BikeType;
  status: ListingStatus;
  generalInfo: {
    brand: string;
    model: string;
    year: number;
    size: string;
  };
  pricing: {
    amount: number;
    currency: string;
    originalPrice?: number;
  };
  media: {
    thumbnails: string[];
    spin360Urls?: string[];
  };
  location: {
    type: string;
    coordinates: number[]; // [Longitude, Latitude]
  };
  createdAt: Date;
}

// 2. Base Schema
const ListingSchema: Schema = new Schema({
  sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, index: 'text' }, // Text index for search
  type: { type: String, enum: Object.values(BikeType), required: true },
  status: { type: String, enum: Object.values(ListingStatus), default: ListingStatus.DRAFT },
  
  generalInfo: {
    brand: { type: String, required: true, index: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    size: { type: String, required: true }
  },
  
  pricing: {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'VND' },
    originalPrice: Number
  },
  
  media: {
    thumbnails: [String],
    spin360Urls: [String]
  },
  
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], index: '2dsphere' } // Geospatial Index
  }
}, { 
  timestamps: true, 
  discriminatorKey: 'type' // KEY for Polymorphism
});

// 3. Create Base Model
export const Listing = mongoose.model<IListing>('Listing', ListingSchema);

// 4. Define Discriminator Schemas (Specific Specs)

// --- ROAD BIKE ---
const RoadBikeSchema = new Schema({
  specs: {
    frameMaterial: { type: String, required: true }, // e.g., Carbon FACT 12r
    groupset: { type: String, required: true }, // e.g., Dura-Ace Di2
    wheelset: String,
    brakeType: { type: String, enum: ['Disc', 'Rim'], required: true }
  },
  geometry: {
    stack: Number,
    reach: Number
  }
});

// --- MTB ---
const MtbSchema = new Schema({
  specs: {
    frameMaterial: String,
    suspensionType: { type: String, enum: ['Hardtail', 'Full-Suspension'] },
    travelFront: { type: String }, // e.g., "160mm"
    travelRear: { type: String },
    wheelSize: { type: String, enum: ['27.5', '29', 'Mullet'] }
  }
});

// 5. Apply Discriminators
export const RoadListing = Listing.discriminator(BikeType.ROAD, RoadBikeSchema);
export const MtbListing = Listing.discriminator(BikeType.MTB, MtbSchema);
export const TriathlonListing = Listing.discriminator(BikeType.TRIATHLON, RoadBikeSchema); // Shares structure with Road for now