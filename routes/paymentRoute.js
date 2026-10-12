import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkRole from "../middleware/checkRole.js";
import validate from "../middleware/validateMiddleware.js";
import { createPaymentSchema } from "../middleware/validators/paymentValidator.js";

import {
  createPayment,
  paymentCallback,
  getPayment,
  checkPaymentStatus
} from "../controllers/paymentController.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  checkRole("customer"),
  validate(createPaymentSchema),
  createPayment
);

// Ini URL yang didaftarkan sebagai "Payment Notification URL" di
// Midtrans Dashboard > Settings > Configuration, contoh:
//   https://domain-kalian.com/payments/callback
router.post("/callback", paymentCallback);

router.get(
  "/order/:orderId",
  authMiddleware,
  getPayment
);

// Fallback manual "Cek Status Pembayaran" kalau webhook belum/tidak sampai
// (mis. saat testing lokal dan ngrok belum tersambung dengan benar)
router.get(
  "/order/:orderId/check-status",
  authMiddleware,
  checkPaymentStatus
);

export default router;