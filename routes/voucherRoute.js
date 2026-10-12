import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkRole from "../middleware/checkRole.js";
import validate from "../middleware/validateMiddleware.js";
import {
  createVoucherSchema,
  updateVoucherSchema,
  redeemVoucherSchema,
  validateVoucherSchema
} from "../middleware/validators/voucherValidator.js";

import {
  getVouchers,
  getVoucherById,
  getVoucherRedemptions,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  redeemVoucher,
  getMyVouchers,
  getAvailableVouchers,
  validateVoucher
} from "../controllers/voucherController.js";

const router = express.Router();

// ---- Customer ----
// Route statis harus di atas "/:id" supaya tidak dianggap sebagai id.

router.get("/my", authMiddleware, checkRole("customer"), getMyVouchers);

router.get("/available", authMiddleware, checkRole("customer"), getAvailableVouchers);

router.post(
  "/redeem",
  authMiddleware,
  checkRole("customer"),
  validate(redeemVoucherSchema),
  redeemVoucher
);

router.post(
  "/validate",
  authMiddleware,
  checkRole("customer"),
  validate(validateVoucherSchema),
  validateVoucher
);

// ---- Admin ----
// Kode voucher bersifat rahasia, jadi daftar & detailnya tidak lagi publik.

router.get("/", authMiddleware, checkRole("admin", "superadmin"), getVouchers);

router.get("/:id", authMiddleware, checkRole("admin", "superadmin"), getVoucherById);

router.get(
  "/:id/redemptions",
  authMiddleware,
  checkRole("admin", "superadmin"),
  getVoucherRedemptions
);

router.post(
  "/",
  authMiddleware,
  checkRole("admin", "superadmin"),
  validate(createVoucherSchema),
  createVoucher
);

router.put(
  "/:id",
  authMiddleware,
  checkRole("admin", "superadmin"),
  validate(updateVoucherSchema),
  updateVoucher
);

router.delete(
  "/:id",
  authMiddleware,
  checkRole("superadmin"),
  deleteVoucher
);

export default router;
