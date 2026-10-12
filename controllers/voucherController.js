import asyncHandler from "../lib/utils/asyncHandler.js";
import { success } from "../lib/utils/response.js";

import * as voucherService from "../lib/services/voucherService.js";
import * as auditLogService from "../lib/services/auditlogService.js";

// =========================
// Admin
// =========================

export const getVouchers = asyncHandler(async (req, res) => {

    const vouchers =
        await voucherService.getVouchers();

    return success(res, vouchers);

});

export const getVoucherById = asyncHandler(async (req, res) => {

    const voucher =
        await voucherService.getVoucherById(req.params.id);

    return success(res, voucher);

});

export const getVoucherRedemptions = asyncHandler(async (req, res) => {

    const redemptions =
        await voucherService.getVoucherRedemptions(req.params.id);

    return success(res, redemptions);

});

export const createVoucher = asyncHandler(async (req, res) => {

    const voucher =
        await voucherService.createVoucher(req.body);

    return success(
        res,
        voucher,
        "Voucher berhasil dibuat",
        201
    );

});

export const updateVoucher = asyncHandler(async (req, res) => {

    const voucher =
        await voucherService.updateVoucher(
            req.params.id,
            req.body
        );

    return success(
        res,
        voucher,
        "Voucher berhasil diperbarui"
    );

});

export const deleteVoucher = asyncHandler(async (req, res) => {

    const voucher =
        await voucherService.getVoucherById(req.params.id);

    await voucherService.deleteVoucher(req.params.id);

    await auditLogService.logActivity({
        actor: req.user,
        req,
        action: "DELETE_VOUCHER",
        entityType: "voucher",
        entityId: req.params.id,
        description: `Menghapus voucher "${voucher.promo_code}"`,
    });

    return success(
        res,
        null,
        "Voucher berhasil dihapus"
    );

});

// =========================
// Customer
// =========================

export const redeemVoucher = asyncHandler(async (req, res) => {

    const userVoucher =
        await voucherService.redeemVoucher(
            req.user.id,
            req.body.promo_code
        );

    return success(
        res,
        userVoucher,
        "Voucher berhasil di-redeem",
        201
    );

});

export const getMyVouchers = asyncHandler(async (req, res) => {

    const vouchers =
        await voucherService.getMyVouchers(req.user.id);

    return success(res, vouchers);

});

export const getAvailableVouchers = asyncHandler(async (req, res) => {

    const vouchers =
        await voucherService.getAvailableVouchers(
            req.user.id,
            req.query.event_id
        );

    return success(res, vouchers);

});

export const validateVoucher = asyncHandler(async (req, res) => {

    const voucher =
        await voucherService.validateVoucher(
            req.user.id,
            req.body.user_voucher_id,
            req.body.event_id,
            req.body.total_ticket
        );

    return success(
        res,
        voucher,
        "Voucher valid"
    );

});
