// Wrapper tipis untuk Midtrans Snap + Core API.
// Snap dipakai saat checkout untuk membuat transaksi & mendapatkan halaman
// pembayaran (redirect_url), sedangkan Core API dipakai untuk verifikasi
// signature notifikasi dan fallback cek status manual ("Cek Status
// Pembayaran") kalau notifikasi belum/tidak sampai ke server (misal saat
// development dan tunnel ngrok belum di-setup dengan benar).

import midtransClient from "midtrans-client";
import crypto from "crypto";

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

const snap = new midtransClient.Snap({
    isProduction,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

const core = new midtransClient.CoreApi({
    isProduction,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

/**
 * Membuat transaksi Snap untuk satu order.
 * @param {Object} params
 * @param {string} params.orderId - dipetakan ke invoice_number order kita, dipakai Midtrans sebagai id transaksi unik
 * @param {number} params.grossAmount - total yang harus dibayar customer (orders.grand_total = harga tiket setelah diskon + biaya layanan)
 * @param {Array} [params.itemDetails] - rincian item (tiket, diskon, biaya layanan). Midtrans mewajibkan jumlah price*quantity SAMA dengan grossAmount, jadi hanya dikirim kalau sudah dipastikan cocok
 * @param {Object} [params.customerDetails]
 * @param {number} [params.expiryMinutes] - batas waktu bayar di Midtrans (menit). Harus selaras dengan orders.expired_at supaya notifikasi "expire" masuk tepat waktu
 * @param {string} params.finishRedirectUrl - halaman yang dituju setelah customer selesai/batal/pending di halaman Midtrans
 */
export async function createTransaction({
    orderId,
    grossAmount,
    itemDetails,
    customerDetails,
    finishRedirectUrl,
    expiryMinutes,
}) {
    if (!process.env.MIDTRANS_SERVER_KEY) {
        throw new Error("MIDTRANS_SERVER_KEY belum diatur di .env");
    }

    const transaction = await snap.createTransaction({
        transaction_details: {
            order_id: orderId,
            // Kolom DECIMAL dari mysql2 berupa string ("150000.00"); Midtrans
            // mengharapkan angka.
            gross_amount: Math.round(Number(grossAmount)),
        },
        item_details:
            Array.isArray(itemDetails) && itemDetails.length > 0
                ? itemDetails
                : undefined,
        customer_details: customerDetails || undefined,
        expiry: expiryMinutes
            ? { unit: "minutes", duration: expiryMinutes }
            : undefined,
        callbacks: {
            finish: finishRedirectUrl,
            error: finishRedirectUrl,
            pending: finishRedirectUrl,
        },
    });

    return transaction; // { token, redirect_url }
}

/**
 * Verifikasi signature notifikasi Midtrans.
 * signature_key = SHA512(order_id + status_code + gross_amount + server_key)
 * Wajib divalidasi supaya endpoint callback tidak bisa dipalsukan orang lain.
 */
export function verifySignature(body) {
    const { order_id, status_code, gross_amount, signature_key } = body || {};

    if (!order_id || !status_code || !gross_amount || !signature_key) {
        return false;
    }

    const expected = crypto
        .createHash("sha512")
        .update(`${order_id}${status_code}${gross_amount}${process.env.MIDTRANS_SERVER_KEY}`)
        .digest("hex");

    return expected === signature_key;
}

/**
 * Fallback manual: cek status transaksi langsung ke Midtrans (Core API).
 */
export async function getTransactionStatus(orderId) {
    return core.transaction.status(orderId);
}