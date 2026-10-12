import asyncHandler from "../lib/utils/asyncHandler.js";
import { success } from "../lib/utils/response.js";

import * as paymentService from "../lib/services/paymentService.js";

export const createPayment = asyncHandler(async (req, res) => {

    const { order_id } = req.body;

    const payment =
        await paymentService.createPayment(req.user.id, order_id);

    return success(
        res,
        payment,
        "Payment berhasil dibuat",
        201
    );

});

export const paymentCallback = asyncHandler(async (req, res) => {

    // Midtrans mengirim signature_key di body notifikasi (dihitung dari
    // order_id + status_code + gross_amount + server_key), jadi verifikasi
    // cukup berdasarkan body — tidak perlu header khusus.
    await paymentService.paymentCallback(req.body);

    return success(
        res,
        null,
        "Notifikasi berhasil diproses"
    );

});

export const getPayment = asyncHandler(async (req, res) => {

    const { orderId } = req.params;

    const payment =
        await paymentService.getPayment(
            req.user.id,
            req.user.role,
            orderId
        );

    return success(res, payment);

});

export const checkPaymentStatus = asyncHandler(async (req, res) => {

    const { orderId } = req.params;

    const invoice =
        await paymentService.checkPaymentStatus(
            req.user.id,
            req.user.role,
            orderId
        );

    return success(res, invoice);

});
