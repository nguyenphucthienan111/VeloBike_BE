"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InspectionController = void 0;
const Inspection_1 = require("../models/Inspection");
const Order_1 = require("../models/Order");
const Listing_1 = require("../models/Listing");
const OrderService_1 = require("../services/OrderService");
const User_1 = require("../models/User");
/**
 * Condition Scoring Algorithm
 * Tính điểm tổng thể (1-10) dựa trên checkpoints
 */
function calculateConditionScore(checkpoints) {
    if (!checkpoints || checkpoints.length === 0)
        return 5.0;
    let totalScore = 0;
    let totalWeight = 0;
    checkpoints.forEach((checkpoint) => {
        let pointScore = 0;
        let weight = 1; // Default weight
        // Tính điểm dựa trên status
        switch (checkpoint.status) {
            case "PASS":
                pointScore = 10;
                break;
            case "WARN":
                pointScore = 6;
                weight = 1.5; // Warnings có trọng số cao hơn
                break;
            case "FAIL":
                // Điểm dựa trên severity
                switch (checkpoint.severity) {
                    case "LOW":
                        pointScore = 4;
                        weight = 1.5;
                        break;
                    case "MEDIUM":
                        pointScore = 2;
                        weight = 2;
                        break;
                    case "CRITICAL":
                        pointScore = 0;
                        weight = 3; // Critical issues có trọng số cao nhất
                        break;
                    default:
                        pointScore = 3;
                        weight = 2;
                }
                break;
            default:
                pointScore = 5;
        }
        totalScore += pointScore * weight;
        totalWeight += weight;
    });
    // Normalize về thang điểm 1-10
    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 5.0;
    return Math.max(1, Math.min(10, Math.round(finalScore * 10) / 10));
}
/**
 * Get dynamic checklist based on bike type
 */
function getChecklistByBikeType(bikeType) {
    const baseChecklist = [
        {
            component: "Frame - Overall Condition",
            category: "FRAME",
            required: true,
            description: "Kiểm tra tổng thể khung xe",
        },
        {
            component: "Frame - Top Tube",
            category: "FRAME",
            required: true,
            description: "Kiểm tra ống trên",
        },
        {
            component: "Frame - Down Tube",
            category: "FRAME",
            required: true,
            description: "Kiểm tra ống dưới",
        },
        {
            component: "Frame - Seat Tube",
            category: "FRAME",
            required: true,
            description: "Kiểm tra ống yên",
        },
        {
            component: "Frame - Chainstays",
            category: "FRAME",
            required: true,
            description: "Kiểm tra ống xích",
        },
        {
            component: "Frame - Seatstays",
            category: "FRAME",
            required: true,
            description: "Kiểm tra ống yên sau",
        },
        {
            component: "Frame - Bottom Bracket",
            category: "FRAME",
            required: true,
            description: "Kiểm tra ổ trục giữa",
        },
        {
            component: "Headset",
            category: "STEERING",
            required: true,
            description: "Kiểm tra ổ trục đầu",
        },
        {
            component: "Fork",
            category: "STEERING",
            required: true,
            description: "Kiểm tra phuộc trước",
        },
        {
            component: "Handlebars",
            category: "STEERING",
            required: true,
            description: "Kiểm tra tay lái",
        },
        {
            component: "Stem",
            category: "STEERING",
            required: true,
            description: "Kiểm tra cột lái",
        },
        {
            component: "Front Wheel - Rim",
            category: "WHEELS",
            required: true,
            description: "Kiểm tra vành bánh trước",
        },
        {
            component: "Front Wheel - Spokes",
            category: "WHEELS",
            required: true,
            description: "Kiểm tra nan hoa bánh trước",
        },
        {
            component: "Front Wheel - Hub",
            category: "WHEELS",
            required: true,
            description: "Kiểm tra ổ bánh trước",
        },
        {
            component: "Rear Wheel - Rim",
            category: "WHEELS",
            required: true,
            description: "Kiểm tra vành bánh sau",
        },
        {
            component: "Rear Wheel - Spokes",
            category: "WHEELS",
            required: true,
            description: "Kiểm tra nan hoa bánh sau",
        },
        {
            component: "Rear Wheel - Hub",
            category: "WHEELS",
            required: true,
            description: "Kiểm tra ổ bánh sau",
        },
        {
            component: "Front Brake",
            category: "BRAKES",
            required: true,
            description: "Kiểm tra phanh trước",
        },
        {
            component: "Rear Brake",
            category: "BRAKES",
            required: true,
            description: "Kiểm tra phanh sau",
        },
        {
            component: "Brake Levers",
            category: "BRAKES",
            required: true,
            description: "Kiểm tra cần phanh",
        },
        {
            component: "Front Derailleur",
            category: "DRIVETRAIN",
            required: true,
            description: "Kiểm tra đề trước",
        },
        {
            component: "Rear Derailleur",
            category: "DRIVETRAIN",
            required: true,
            description: "Kiểm tra đề sau",
        },
        {
            component: "Chain",
            category: "DRIVETRAIN",
            required: true,
            description: "Kiểm tra xích",
        },
        {
            component: "Cassette/Cogset",
            category: "DRIVETRAIN",
            required: true,
            description: "Kiểm tra líp",
        },
        {
            component: "Crankset",
            category: "DRIVETRAIN",
            required: true,
            description: "Kiểm tra bộ đùi",
        },
        {
            component: "Pedals",
            category: "DRIVETRAIN",
            required: false,
            description: "Kiểm tra bàn đạp",
        },
        {
            component: "Saddle",
            category: "COMFORT",
            required: false,
            description: "Kiểm tra yên xe",
        },
        {
            component: "Seatpost",
            category: "COMFORT",
            required: true,
            description: "Kiểm tra cột yên",
        },
    ];
    // Add type-specific checkpoints
    switch (bikeType) {
        case Listing_1.BikeType.ROAD:
            return [
                ...baseChecklist,
                {
                    component: "Groupset - Shifters",
                    category: "DRIVETRAIN",
                    required: true,
                    description: "Kiểm tra bộ đề (Road specific)",
                },
                {
                    component: "Aerodynamics - Aero Bars",
                    category: "SPECIAL",
                    required: false,
                    description: "Kiểm tra tay lái aero (nếu có)",
                },
            ];
        case Listing_1.BikeType.MTB:
            return [
                ...baseChecklist,
                {
                    component: "Front Suspension - Fork",
                    category: "SUSPENSION",
                    required: true,
                    description: "Kiểm tra phuộc trước (MTB specific)",
                },
                {
                    component: "Front Suspension - Travel",
                    category: "SUSPENSION",
                    required: true,
                    description: "Kiểm tra hành trình phuộc",
                },
                {
                    component: "Rear Suspension - Shock",
                    category: "SUSPENSION",
                    required: false,
                    description: "Kiểm tra giảm xóc sau (Full-suspension)",
                },
                {
                    component: "Rear Suspension - Travel",
                    category: "SUSPENSION",
                    required: false,
                    description: "Kiểm tra hành trình giảm xóc sau",
                },
                {
                    component: "Dropper Post",
                    category: "SPECIAL",
                    required: false,
                    description: "Kiểm tra cột yên thả nhanh",
                },
            ];
        case Listing_1.BikeType.GRAVEL:
            return [
                ...baseChecklist,
                {
                    component: "Tire Clearance",
                    category: "SPECIAL",
                    required: true,
                    description: "Kiểm tra khe hở lốp (Gravel specific)",
                },
                {
                    component: "Mounting Points",
                    category: "SPECIAL",
                    required: false,
                    description: "Kiểm tra điểm gắn phụ kiện",
                },
            ];
        case Listing_1.BikeType.TRIATHLON:
            return [
                ...baseChecklist,
                {
                    component: "Aerobars",
                    category: "SPECIAL",
                    required: true,
                    description: "Kiểm tra tay lái aero (Triathlon specific)",
                },
                {
                    component: "Aero Position",
                    category: "SPECIAL",
                    required: true,
                    description: "Kiểm tra tư thế aero",
                },
            ];
        case Listing_1.BikeType.E_BIKE:
            return [
                ...baseChecklist,
                {
                    component: "Motor Function",
                    category: "ELECTRONICS",
                    required: true,
                    description: "Kiểm tra hoạt động của motor",
                },
                {
                    component: "Battery Health",
                    category: "ELECTRONICS",
                    required: true,
                    description: "Kiểm tra tình trạng pin và số chu kỳ sạc",
                },
                {
                    component: "Display/Controller",
                    category: "ELECTRONICS",
                    required: true,
                    description: "Kiểm tra màn hình và bộ điều khiển",
                },
                {
                    component: "Charger",
                    category: "ACCESSORIES",
                    required: true,
                    description: "Kiểm tra sạc pin",
                },
            ];
        default:
            return baseChecklist;
    }
}
class InspectionController {
    // POST /api/inspections
    // Submit a 50-point inspection report
    static submitReport(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { orderId, checkpoints, overallVerdict, overallScore, inspectorNote, } = req.body;
                // SECURITY FIX: Get Inspector ID from Token
                const inspectorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!inspectorId) {
                    return res
                        .status(401)
                        .json({ success: false, message: "Unauthorized" });
                }
                // 1. Verify Order exists and is in correct state
                const order = yield Order_1.Order.findById(orderId);
                if (!order) {
                    res.status(404).json({ success: false, message: "Order not found" });
                    return;
                }
                if (order.status !== Order_1.OrderStatus.IN_INSPECTION) {
                    res.status(400).json({
                        success: false,
                        message: "Order is not in inspection phase",
                    });
                    return;
                }
                // 2. Calculate overall score automatically if not provided
                let finalScore = overallScore;
                if (!finalScore || finalScore < 1 || finalScore > 10) {
                    finalScore = calculateConditionScore(checkpoints);
                }
                // 3. Auto-determine verdict if not provided or if score suggests different verdict
                let finalVerdict = overallVerdict;
                // LOGIC FIX: Check for CRITICAL failures
                // Nếu có bất kỳ lỗi CRITICAL nào, verdict bắt buộc phải là FAILED
                const hasCriticalFail = checkpoints.some((cp) => cp.status === "FAIL" && cp.severity === "CRITICAL");
                if (hasCriticalFail) {
                    finalVerdict = "FAILED";
                }
                if (!finalVerdict) {
                    if (finalScore >= 7) {
                        finalVerdict = "PASSED";
                    }
                    else if (finalScore >= 5) {
                        finalVerdict = "SUGGEST_ADJUSTMENT";
                    }
                    else {
                        finalVerdict = "FAILED";
                    }
                }
                // 4. Save Inspection Report
                const newInspection = new Inspection_1.Inspection({
                    orderId,
                    inspectorId,
                    checkpoints,
                    overallVerdict: finalVerdict,
                    overallScore: finalScore,
                    inspectorNote,
                });
                yield newInspection.save();
                // UPDATE LISTING: Sync inspection result to the Listing
                // This fulfills the requirement: "Gắn nhãn Xe đã kiểm định"
                if (finalVerdict === "PASSED" || finalVerdict === "SUGGEST_ADJUSTMENT") {
                    yield Listing_1.Listing.findByIdAndUpdate(order.listingId, {
                        inspectionScore: finalScore,
                        inspectionReport: newInspection._id,
                        // Note: We don't change Listing status here, OrderService handles that flow
                    });
                }
                // 5. Trigger Order State Machine
                const orderService = new OrderService_1.OrderService();
                let nextStatus = Order_1.OrderStatus.IN_INSPECTION; // fallback
                if (finalVerdict === "PASSED") {
                    nextStatus = Order_1.OrderStatus.INSPECTION_PASSED;
                }
                else if (finalVerdict === "FAILED") {
                    nextStatus = Order_1.OrderStatus.INSPECTION_FAILED;
                }
                else if (finalVerdict === "SUGGEST_ADJUSTMENT") {
                    // For adjustment, we keep in inspection but notify seller
                    nextStatus = Order_1.OrderStatus.IN_INSPECTION;
                }
                if (nextStatus !== Order_1.OrderStatus.IN_INSPECTION) {
                    yield orderService.transitionState(orderId, nextStatus, inspectorId, User_1.UserRole.INSPECTOR, `Inspection submitted with verdict: ${finalVerdict} (Score: ${finalScore}/10)`);
                }
                res.status(201).json({
                    success: true,
                    data: Object.assign(Object.assign({}, newInspection.toObject()), { calculatedScore: finalScore, calculatedVerdict: finalVerdict }),
                    orderStatus: nextStatus,
                    message: `Inspection completed. Score: ${finalScore}/10, Verdict: ${finalVerdict}`,
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // GET /api/inspections/:orderId
    static getByOrder(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const inspection = yield Inspection_1.Inspection.findOne({
                    orderId: req.params.orderId,
                }).populate("inspectorId", "fullName");
                if (!inspection) {
                    res
                        .status(404)
                        .json({ success: false, message: "Inspection report not found" });
                    return;
                }
                res.json({ success: true, data: inspection });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // GET /api/inspections/checklist/:bikeType
    // Get dynamic checklist based on bike type
    static getChecklist(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { bikeType } = req.params;
                if (!Object.values(Listing_1.BikeType).includes(bikeType)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid bike type. Must be one of: ${Object.values(Listing_1.BikeType).join(", ")}`,
                    });
                }
                const checklist = getChecklistByBikeType(bikeType);
                res.json({
                    success: true,
                    data: {
                        bikeType,
                        checklist,
                        totalItems: checklist.length,
                        requiredItems: checklist.filter((item) => item.required).length,
                    },
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // GET /api/inspections/checklist/order/:orderId
    // Get checklist based on order's listing bike type
    static getChecklistByOrder(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderId } = req.params;
                const order = yield Order_1.Order.findById(orderId).populate("listingId");
                if (!order) {
                    return res.status(404).json({
                        success: false,
                        message: "Order not found",
                    });
                }
                const listing = order.listingId;
                if (!listing || !listing.type) {
                    return res.status(400).json({
                        success: false,
                        message: "Listing not found or missing bike type",
                    });
                }
                const checklist = getChecklistByBikeType(listing.type);
                res.json({
                    success: true,
                    data: {
                        orderId,
                        bikeType: listing.type,
                        checklist,
                        totalItems: checklist.length,
                        requiredItems: checklist.filter((item) => item.required).length,
                    },
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // GET /api/inspections/pending
    // Get pending inspections for inspector
    static getPending(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const inspectorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!inspectorId) {
                    return res
                        .status(401)
                        .json({ success: false, message: "Unauthorized" });
                }
                const { page = 1, limit = 20 } = req.query;
                // Find orders in IN_INSPECTION status
                const orders = yield Order_1.Order.find({
                    status: Order_1.OrderStatus.IN_INSPECTION,
                    inspectorId: inspectorId,
                })
                    .populate("listingId", "title generalInfo media")
                    .populate("buyerId", "fullName")
                    .populate("sellerId", "fullName")
                    .sort({ createdAt: -1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield Order_1.Order.countDocuments({
                    status: Order_1.OrderStatus.IN_INSPECTION,
                    inspectorId: inspectorId,
                });
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
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // GET /api/inspections/my-inspections
    // Get inspector's completed inspections
    static getMyInspections(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const inspectorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!inspectorId) {
                    return res
                        .status(401)
                        .json({ success: false, message: "Unauthorized" });
                }
                const { page = 1, limit = 20 } = req.query;
                const inspections = yield Inspection_1.Inspection.find({ inspectorId })
                    .populate("orderId")
                    .sort({ createdAt: -1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield Inspection_1.Inspection.countDocuments({ inspectorId });
                res.json({
                    success: true,
                    data: inspections,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        pages: Math.ceil(total / Number(limit)),
                    },
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
}
exports.InspectionController = InspectionController;
//# sourceMappingURL=InspectionController.js.map