import { Request, Response } from "express";
import { Order, OrderStatus } from "../models/Order";
import { Listing } from "../models/Listing";
import { OrderService } from "../services/OrderService";
import { UserRole } from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";

export class OrderController {
  // POST /api/orders
  // Create a new order (Buyer)
  static async create(req: any, res: any) {
    try {
      const buyerId = req.user?.id;
      if (!buyerId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const { listingId, inspectionRequired = true, buyerCity = "" } = req.body;

      if (!listingId) {
        return res
          .status(400)
          .json({ success: false, message: "listingId is required" });
      }

      // Check if listing exists and is available
      const listing = await Listing.findById(listingId);
      if (!listing) {
        return res
          .status(404)
          .json({ success: false, message: "Listing not found" });
      }

      if (listing.status === "SOLD") {
        return res
          .status(400)
          .json({ success: false, message: "This item is already sold" });
      }

      if (listing.sellerId.toString() === buyerId) {
        return res
          .status(400)
          .json({ success: false, message: "Cannot buy your own listing" });
      }

      // Validate inspection requirement
      // If listing doesn't require inspection, buyer cannot request it
      if (!listing.inspectionRequired && inspectionRequired) {
        return res.status(400).json({
          success: false,
          message: "Seller không yêu cầu kiểm định cho xe này. Bạn không thể chọn kiểm định.",
        });
      }

      // Final inspection decision: listing requires AND buyer agrees
      const finalInspectionRequired = listing.inspectionRequired && inspectionRequired;

      // Check if there's already an active order for this listing
      const existingOrder = await Order.findOne({
        listingId,
        status: {
          $nin: [
            OrderStatus.COMPLETED,
            OrderStatus.CANCELLED,
            OrderStatus.REFUNDED,
          ],
        },
      });

      if (existingOrder) {
        // If order is CREATED and older than 15 minutes, auto-cancel it
        const ORDER_TIMEOUT_MINUTES = 15;
        const orderAge = Date.now() - existingOrder.createdAt.getTime();
        const timeoutMs = ORDER_TIMEOUT_MINUTES * 60 * 1000;

        if (
          existingOrder.status === OrderStatus.CREATED &&
          orderAge > timeoutMs
        ) {
          // Auto-cancel expired order
          existingOrder.status = OrderStatus.CANCELLED;
          existingOrder.timeline.push({
            status: OrderStatus.CANCELLED,
            timestamp: new Date(),
            actorId: existingOrder.buyerId,
            note: "Tự động hủy do không thanh toán trong 15 phút",
          } as any);
          await existingOrder.save();
          
          console.log(`Auto-cancelled expired order ${existingOrder._id}`);
        } else {
          // Order is still active
          return res.status(400).json({
            success: false,
            message: "Listing đã có người đặt mua. Vui lòng chọn xe khác.",
          });
        }
      }

      // Create order using OrderService
      const order = await OrderService.createOrder(
        listingId,
        buyerId,
        finalInspectionRequired,
        500000,
        buyerCity
      );

      res.status(201).json({
        success: true,
        data: order,
        message: "Order created successfully",
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // GET /api/orders/:id
  // Get order details
  static async getById(req: any, res: any) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      const order = await Order.findById(id)
        .populate("listingId")
        .populate("buyerId", "fullName email phone")
        .populate("sellerId", "fullName email phone")
        .populate("inspectorId", "fullName");

      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      // Check authorization: Buyer, Seller, Inspector, or Admin can view
      // Handle both populated and non-populated cases
      const buyerId = (order.buyerId as any)?._id?.toString() || order.buyerId?.toString();
      const sellerId = (order.sellerId as any)?._id?.toString() || order.sellerId?.toString();
      const inspectorId = order.inspectorId 
        ? ((order.inspectorId as any)?._id?.toString() || order.inspectorId?.toString())
        : null;

      const isAuthorized =
        userRole === UserRole.ADMIN ||
        buyerId === userId ||
        sellerId === userId ||
        (inspectorId && inspectorId === userId);

      if (!isAuthorized) {
        return res
          .status(403)
          .json({
            success: false,
            message: "Not authorized to view this order",
          });
      }

      res.json({ success: true, data: order });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/orders
  // Get user's orders (Buyer or Seller)
  static async getMyOrders(req: any, res: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const { status, role, page = 1, limit = 20 } = req.query;

      // Build query based on role
      let query: any = {};
      if (role === "buyer") {
        query.buyerId = userId;
      } else if (role === "seller") {
        query.sellerId = userId;
      } else {
        // Default: show orders where user is buyer or seller
        query.$or = [{ buyerId: userId }, { sellerId: userId }];
      }

      if (status) {
        query.status = status;
      }

      const orders = await Order.find(query)
        .populate("listingId", "title generalInfo pricing media")
        .populate("buyerId", "fullName email phone")
        .populate("sellerId", "fullName")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Order.countDocuments(query);

      res.json({
        success: true,
        data: orders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/orders/:id/timeline
  // Get order timeline
  static async getTimeline(req: any, res: any) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const order = await Order.findById(id);
      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      // Check authorization
      const isAuthorized =
        order.buyerId.toString() === userId ||
        order.sellerId.toString() === userId ||
        req.user?.role === UserRole.ADMIN;

      if (!isAuthorized) {
        return res
          .status(403)
          .json({ success: false, message: "Not authorized" });
      }

      const timeline = await OrderService.getOrderTimeline(id);

      res.json({ success: true, data: timeline });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // PUT /api/orders/:id/status
  // Update order status (for Seller/Buyer specific actions)
  static async updateStatus(req: any, res: any) {
    try {
      const { id } = req.params;
      const { status, note } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      const order = await Order.findById(id);
      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      // Check authorization and validate status transitions
      let allowedStatuses: OrderStatus[] = [];

      if (
        userRole === UserRole.SELLER &&
        order.sellerId.toString() === userId
      ) {
        // Seller can mark as SHIPPING
        if (
          status === OrderStatus.SHIPPING &&
          order.status === OrderStatus.INSPECTION_PASSED
        ) {
          allowedStatuses = [OrderStatus.SHIPPING];
        }
        // Seller can CANCEL (Reject) if created
        if (
          status === OrderStatus.CANCELLED &&
          order.status === OrderStatus.CREATED
        ) {
          allowedStatuses = [OrderStatus.CANCELLED];
        }
      } else if (
        (userRole === UserRole.BUYER || userRole === UserRole.SELLER) &&
        order.buyerId.toString() === userId
      ) {
        // Buyer (or Seller acting as buyer) can mark as DELIVERED
        if (
          status === OrderStatus.DELIVERED &&
          order.status === OrderStatus.SHIPPING
        ) {
          allowedStatuses = [OrderStatus.DELIVERED];
        }
        // Buyer (or Seller acting as buyer) can CANCEL if created
        if (
          status === OrderStatus.CANCELLED &&
          order.status === OrderStatus.CREATED
        ) {
          allowedStatuses = [OrderStatus.CANCELLED];
        }
      } else if (userRole === UserRole.ADMIN) {
        // Admin can do more
        allowedStatuses = [OrderStatus.COMPLETED, OrderStatus.REFUNDED];
      }

      if (!allowedStatuses.includes(status as OrderStatus)) {
        return res.status(403).json({
          success: false,
          message: `Not authorized to change status to ${status}`,
        });
      }

      const orderService = new OrderService();
      const updatedOrder = await orderService.transitionState(
        id,
        status as OrderStatus,
        userId,
        userRole,
        note
      );

      res.json({ success: true, data: updatedOrder });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // PUT /api/orders/:id/shipping-address
  // Update shipping address (Buyer only, before payment)
  static async updateShippingAddress(req: any, res: any) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { shippingAddress } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ success: false, message: "Đơn hàng không tồn tại" });
      }

      // Only buyer can update shipping address
      if (order.buyerId.toString() !== userId) {
        return res.status(403).json({ success: false, message: "Chỉ người mua mới có thể cập nhật địa chỉ" });
      }

      // Can only update before payment (CREATED status)
      if (order.status !== OrderStatus.CREATED) {
        return res.status(400).json({ 
          success: false, 
          message: "Không thể thay đổi địa chỉ sau khi đã thanh toán" 
        });
      }

      // Validate required fields
      if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || 
          !shippingAddress.street || !shippingAddress.district || !shippingAddress.city) {
        return res.status(400).json({ 
          success: false, 
          message: "Vui lòng nhập đầy đủ thông tin địa chỉ (fullName, phone, street, district, city)" 
        });
      }

      order.shippingAddress = shippingAddress;

      // Recalculate shipping fee based on actual buyer city
      try {
        const { ShippingService } = await import("../services/ShippingService");
        const { Listing } = await import("../models/Listing");
        const { User } = await import("../models/User");

        const listing = await Listing.findById(order.listingId).select("specs sellerId").lean();
        const seller = await User.findById(order.sellerId).select("address").lean();
        const sellerCity = (seller as any)?.address?.city || (seller as any)?.address?.province || "Hà Nội";
        const buyerCity = shippingAddress.province || shippingAddress.city;
        const weightKg = (listing as any)?.specs?.weight ?? 10;

        const breakdown = await ShippingService.calculate(sellerCity, buyerCity, weightKg);
        order.financials.shippingFee = breakdown.total;
        order.financials.totalAmount =
          order.financials.itemPrice +
          order.financials.inspectionFee +
          breakdown.total;
      } catch (e) {
        console.warn("Could not recalculate shipping fee:", e);
      }

      await order.save();

      res.json({ 
        success: true, 
        data: order,
        message: "Cập nhật địa chỉ giao hàng thành công" 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // PUT /api/orders/:id/seller-decision
  // Seller responds to SUGGEST_ADJUSTMENT verdict: PROCEED or CANCEL
  static async sellerDecision(req: any, res: any) {
    try {
      const { id } = req.params;
      const { decision } = req.body; // 'PROCEED' | 'CANCEL'
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!['PROCEED', 'CANCEL'].includes(decision)) {
        return res.status(400).json({ success: false, message: "decision must be PROCEED or CANCEL" });
      }

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      // Only seller of this order
      if (userRole !== UserRole.SELLER || order.sellerId.toString() !== userId) {
        return res.status(403).json({ success: false, message: "Only the seller can make this decision" });
      }

      // Order must be IN_INSPECTION
      if (order.status !== OrderStatus.IN_INSPECTION) {
        return res.status(400).json({ success: false, message: "Order is not awaiting seller decision" });
      }

      // Verify there's a SUGGEST_ADJUSTMENT inspection report
      const { Inspection } = await import("../models/Inspection");
      const inspection = await Inspection.findOne({ orderId: id, overallVerdict: "SUGGEST_ADJUSTMENT" });
      if (!inspection) {
        return res.status(400).json({ success: false, message: "No SUGGEST_ADJUSTMENT inspection found for this order" });
      }

      const orderService = new OrderService();

      if (decision === 'PROCEED') {
        // Seller accepts — move to INSPECTION_PASSED
        await orderService.transitionState(id, OrderStatus.INSPECTION_PASSED, userId, UserRole.SELLER, "Seller chấp nhận điều chỉnh và tiếp tục giao dịch");
        return res.json({ success: true, message: "Order moved to INSPECTION_PASSED", data: await Order.findById(id) });
      }

      // CANCEL — refund buyer + pay inspector
      const { User } = await import("../models/User");
      const { Transaction } = await import("../models/Transaction");

      const { itemPrice, inspectionFee, shippingFee } = order.financials;
      // inspectionFee đã trả công cho inspector → buyer chỉ được hoàn itemPrice + shippingFee
      const refundAmount = itemPrice + shippingFee;

      await Transaction.create({
        userId: order.buyerId,
        type: "REFUND",
        amount: refundAmount,
        status: "COMPLETED",
        relatedOrderId: order._id,
        description: `Hoàn tiền đơn hàng #${order._id} — seller huỷ sau SUGGEST_ADJUSTMENT`,
      });
      await User.findByIdAndUpdate(order.buyerId, { $inc: { "wallet.balance": refundAmount } });

      if (order.inspectorId) {
        const INSPECTOR_BASE_FEE = 500000;
        const inspectorPayout = inspectionFee > 0 ? inspectionFee : INSPECTOR_BASE_FEE;
        await Transaction.create({
          userId: order.inspectorId,
          type: "INSPECTION_FEE",
          amount: inspectorPayout,
          status: "COMPLETED",
          relatedOrderId: order._id,
          description: `Phí kiểm định đơn hàng #${order._id} (seller huỷ sau SUGGEST_ADJUSTMENT)`,
        });
        await User.findByIdAndUpdate(order.inspectorId, { $inc: { "wallet.balance": inspectorPayout } });
      }

      await orderService.transitionState(id, OrderStatus.REFUNDED, userId, UserRole.SELLER, "Seller huỷ đơn sau SUGGEST_ADJUSTMENT — đã hoàn tiền buyer");

      return res.json({ success: true, message: "Order cancelled and buyer refunded", data: await Order.findById(id) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/orders/:id/start-inspection
  // Manually start inspection (Admin only - for debugging)
  static async startInspection(req: any, res: any) {
    try {
      const { id } = req.params;
      const { inspectorId } = req.body;
      const userRole = req.user?.role;

      // Only admin can manually trigger inspection
      if (userRole !== UserRole.ADMIN) {
        return res.status(403).json({ 
          success: false, 
          message: "Only admin can manually start inspection" 
        });
      }

      const order = await Order.findById(id).populate("listingId");
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      // Check if order is in correct status
      if (order.status !== OrderStatus.ESCROW_LOCKED) {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot start inspection from status ${order.status}. Order must be ESCROW_LOCKED.` 
        });
      }

      // Check if listing requires inspection
      const listing = order.listingId as any;
      if (!listing || !listing.inspectionRequired) {
        return res.status(400).json({ 
          success: false, 
          message: "Listing does not require inspection" 
        });
      }

      // If inspectorId provided, use it. Otherwise find one
      let finalInspectorId = inspectorId;
      if (!finalInspectorId) {
        const { User } = await import("../models/User");
        const inspector = await User.findOne({
          role: UserRole.INSPECTOR,
          isActive: true,
        });
        
        if (!inspector) {
          return res.status(404).json({ 
            success: false, 
            message: "No available inspector found. Please create an inspector user first." 
          });
        }
        
        finalInspectorId = inspector._id.toString();
      }

      // Assign inspector and start inspection
      order.inspectorId = finalInspectorId as any;
      await order.save();

      await OrderService.startInspection(id, finalInspectorId);

      const updatedOrder = await Order.findById(id)
        .populate("listingId")
        .populate("buyerId", "fullName")
        .populate("sellerId", "fullName")
        .populate("inspectorId", "fullName");

      res.json({ 
        success: true, 
        data: updatedOrder,
        message: `Inspection started with inspector ${finalInspectorId}` 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}


// Import Transaction model for escrow status
import { Transaction } from "../models/Transaction";

export class OrderEscrowController {
  /**
   * GET /api/orders/:id/escrow-status
   * Get escrow status and transaction history for an order
   */
  static async getEscrowStatus(req: any, res: any) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      const order = await Order.findById(id)
        .populate("buyerId", "fullName")
        .populate("sellerId", "fullName");

      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      // Check authorization - handle populated objects
      const buyerId = (order.buyerId as any)?._id?.toString() || order.buyerId?.toString();
      const sellerId = (order.sellerId as any)?._id?.toString() || order.sellerId?.toString();

      const isAuthorized =
        userRole === UserRole.ADMIN ||
        buyerId === userId ||
        sellerId === userId;

      if (!isAuthorized) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }

      // Get all transactions related to this order
      const transactions = await Transaction.find({ relatedOrderId: id })
        .sort({ createdAt: 1 });

      // Determine escrow status
      const holdTransaction = transactions.find(t => t.type === "PAYMENT_HOLD");
      const releaseTransaction = transactions.find(t => t.type === "PAYMENT_RELEASE");
      const refundTransaction = transactions.find(t => t.type === "REFUND");

      let escrowStatus: "NOT_PAID" | "LOCKED" | "RELEASED" | "REFUNDED" = "NOT_PAID";
      if (refundTransaction) {
        escrowStatus = "REFUNDED";
      } else if (releaseTransaction) {
        escrowStatus = "RELEASED";
      } else if (holdTransaction) {
        escrowStatus = "LOCKED";
      }

      // Calculate amounts
      const { itemPrice, platformFee, inspectionFee, shippingFee, totalAmount } = order.financials;
      const sellerWillReceive = itemPrice - platformFee;

      res.json({
        success: true,
        data: {
          orderId: id,
          orderStatus: order.status,
          escrowStatus,
          financials: {
            totalAmount,
            itemPrice,
            platformFee,
            inspectionFee,
            shippingFee,
            sellerWillReceive,
            platformWillReceive: platformFee + shippingFee,
            inspectorWillReceive: inspectionFee,
          },
          timeline: {
            paidAt: holdTransaction?.createdAt || null,
            releasedAt: releaseTransaction?.createdAt || null,
            refundedAt: refundTransaction?.createdAt || null,
          },
          transactions: transactions.map(t => ({
            id: t._id,
            type: t.type,
            amount: t.amount,
            status: t.status,
            description: t.description,
            createdAt: t.createdAt,
            paymentGatewayRef: t.paymentGatewayRef,
          })),
          message: OrderEscrowController.getEscrowMessage(escrowStatus, order.status),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Helper: Get human-readable escrow message
   */
  private static getEscrowMessage(escrowStatus: string, orderStatus: string): string {
    switch (escrowStatus) {
      case "NOT_PAID":
        return "Đơn hàng chưa được thanh toán. Tiền chưa vào hệ thống.";
      case "LOCKED":
        return "Tiền đang được giữ an toàn trên PayOS. Seller sẽ nhận tiền sau khi đơn hàng hoàn tất.";
      case "RELEASED":
        return "Tiền đã được chuyển cho Seller. Giao dịch hoàn tất.";
      case "REFUNDED":
        return "Tiền đã được hoàn lại cho Buyer.";
      default:
        return "";
    }
  }
}
