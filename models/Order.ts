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
}

export interface IOrder extends MongooseDocument {
  listingId: Types.ObjectId;
  buyerId: Types.ObjectId;
  sellerId: Types.ObjectId;
  inspectorId?: Types.ObjectId;

  status: OrderStatus;

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
