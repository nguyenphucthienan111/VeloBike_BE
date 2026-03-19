import mongoose, {
  Schema,
  Document as MongooseDocument,
  Types,
} from "mongoose";

export enum OrderStatus {
  CREATED = "CREATED",
  ESCROW_LOCKED = "ESCROW_LOCKED", // Buyer paid, money held
  IN_INSPECTION = "IN_INSPECTION",
  INSPECTION_PASSED = "INSPECTION_PASSED",
  INSPECTION_FAILED = "INSPECTION_FAILED",
  SHIPPING = "SHIPPING",
  DELIVERED = "DELIVERED",
  COMPLETED = "COMPLETED", // Money released to seller
  DISPUTED = "DISPUTED",
  REFUNDED = "REFUNDED",
  CANCELLED = "CANCELLED", // Cancelled before payment/shipping
}

export interface IShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  province: string;
  zipCode?: string;
}

export interface IOrder extends MongooseDocument {
  listingId: Types.ObjectId;
  buyerId: Types.ObjectId;
  sellerId: Types.ObjectId;
  inspectorId?: Types.ObjectId;

  status: OrderStatus;

  inspectionRequired: boolean;

  shippingAddress?: IShippingAddress;

  shippingInfo?: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    shippedAt?: Date;
  };

  financials: {
    totalAmount: number;
    itemPrice: number;
    inspectionFee: number;
    shippingFee: number;
    platformFee: number; // Calculated at creation
  };

  timeline: Array<{
    status: OrderStatus;
    timestamp: Date;
    actorId: Types.ObjectId; // Who triggered this?
    note?: string;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    inspectorId: { type: Schema.Types.ObjectId, ref: "User" }, // Null initially

    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.CREATED,
    },

    inspectionRequired: { type: Boolean, default: true },

    shippingAddress: {
      fullName: String,
      phone: String,
      street: String,
      district: String,
      city: String,
      province: String,
      zipCode: String,
    },

    shippingInfo: {
      carrier: String,
      trackingNumber: String,
      trackingUrl: String,
      shippedAt: Date,
    },

    financials: {
      totalAmount: { type: Number, required: true },
      itemPrice: { type: Number, required: true },
      inspectionFee: { type: Number, default: 0 },
      shippingFee: { type: Number, default: 0 },
      platformFee: { type: Number, default: 0 },
    },

    timeline: [
      {
        status: { type: String, enum: Object.values(OrderStatus) },
        timestamp: { type: Date, default: Date.now },
        actorId: { type: Schema.Types.ObjectId, ref: "User" },
        note: String,
      },
    ],
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>("Order", OrderSchema);
