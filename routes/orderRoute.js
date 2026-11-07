// routes/orders.js
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkRole from "../middleware/checkRole.js";
import validate from "../middleware/validateMiddleware.js";
import {
    createOrderSchema,
} from "../middleware/validators/orderValidator.js";
import {
    cancelOrder,
    createOrder,
    getMyOrders,
    getOrderById,
    getOrders,
} from "../controllers/orderController.js";

const router = express.Router();

// ─── Admin / Superadmin ────────────────────────────────────────
router.get("/", authMiddleware, checkRole("admin", "superadmin"), getOrders);

// ─── Customer ──────────────────────────────────────────────────
router.get("/my-orders", authMiddleware, checkRole("customer"), getMyOrders);

router.post(
    "/",
    authMiddleware,
    checkRole("customer"),
    validate(createOrderSchema),
    createOrder
);

router.put("/cancel/:id", authMiddleware, checkRole("customer"), cancelOrder);

// ─── Shared (auth only, ownership check di controller) ─────────
router.get("/:id", authMiddleware, getOrderById);

export default router;