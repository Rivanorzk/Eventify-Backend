import db from "../../config/database.js";
import AppError from "../utils/AppError.js";
import * as voucherRepository from "../repositories/voucherRepository.js";
import * as userVoucherRepository from "../repositories/userVoucherRepository.js";

// =========================
// Helper
// =========================

const getState = (row, now = new Date()) => {

    if (row.used_at) return "used";
    if (row.voucher_status !== "active") return "inactive";
    if (now < new Date(row.start_date)) return "upcoming";
    if (now > new Date(row.end_date)) return "expired";

    return "available";

};

const withState = (row) => ({ ...row, state: getState(row) });

// Dipakai saat redeem (voucher belum jadi milik siapa pun).
const assertVoucherRedeemable = (voucher, now) => {

    if (voucher.status !== "active") {
        throw new AppError("Voucher tidak aktif", 400);
    }

    if (now < new Date(voucher.start_date)) {
        throw new AppError("Voucher belum berlaku", 400);
    }

    if (now > new Date(voucher.end_date)) {
        throw new AppError("Voucher sudah kedaluwarsa", 400);
    }

};

// Dipakai saat checkout & validate. Semua aturan voucher dicek di server,
// tidak bergantung pada apa yang ditampilkan frontend.
export const assertUserVoucherUsable = (
    userVoucher,
    { userId, eventId, totalTicket, now = new Date() }
) => {

    // Voucher milik orang lain diperlakukan seolah tidak ada.
    if (!userVoucher || Number(userVoucher.user_id) !== Number(userId)) {
        throw new AppError("Voucher tidak ditemukan", 404);
    }

    if (userVoucher.used_at) {
        throw new AppError("Voucher sudah digunakan", 400);
    }

    if (userVoucher.voucher_status !== "active") {
        throw new AppError("Voucher tidak aktif", 400);
    }

    if (
        now < new Date(userVoucher.start_date) ||
        now > new Date(userVoucher.end_date)
    ) {
        throw new AppError("Voucher sudah tidak berlaku", 400);
    }

    if (Number(userVoucher.event_id) !== Number(eventId)) {
        throw new AppError("Voucher tidak berlaku untuk event ini", 400);
    }

    if (totalTicket < userVoucher.minimum_quantity) {
        throw new AppError(
            `Minimal pembelian ${userVoucher.minimum_quantity} tiket`,
            400
        );
    }

};

export const calculateDiscount = (voucher, totalPrice) => {

    let discount;

    if (voucher.discount_type === "percentage") {

        discount = Math.floor(
            totalPrice * Number(voucher.discount_value) / 100
        );

        if (
            voucher.maximum_discount !== null &&
            voucher.maximum_discount !== undefined &&
            discount > Number(voucher.maximum_discount)
        ) {
            discount = Number(voucher.maximum_discount);
        }

    } else {

        discount = Number(voucher.discount_value);

    }

    // Diskon tidak boleh melebihi total harga (CHECK constraint di orders).
    return Math.min(discount, totalPrice);

};

// =========================
// Admin
// =========================

export const getVouchers = async () => {

    return await voucherRepository.getVouchers();

};

export const getVoucherById = async (id) => {

    const voucher =
        await voucherRepository.getVoucherById(id);

    if (!voucher) {
        throw new AppError(
            "Voucher tidak ditemukan",
            404
        );
    }

    return voucher;

};

export const getVoucherRedemptions = async (id) => {

    await getVoucherById(id);

    return await userVoucherRepository.getByVoucher(id);

};

export const createVoucher = async (body) => {

    const existingVoucher =
        await voucherRepository.getVoucherByCode(db, body.promo_code);

    if (existingVoucher) {
        throw new AppError(
            "Kode voucher sudah digunakan",
            409
        );
    }

    const id =
        await voucherRepository.createVoucher(body);

    return await voucherRepository.getVoucherById(id);

};

export const updateVoucher = async (id, body) => {

    const voucher =
        await voucherRepository.getVoucherById(id);

    if (!voucher) {
        throw new AppError(
            "Voucher tidak ditemukan",
            404
        );
    }

    // Repository meng-update semua kolom sekaligus, jadi gabungkan dulu
    // dengan data lama supaya update parsial tidak menimpa dengan undefined.
    const merged = { ...voucher, ...body };

    if (new Date(merged.end_date) <= new Date(merged.start_date)) {
        throw new AppError(
            "end_date harus setelah start_date",
            400
        );
    }

    if (merged.quota < voucher.used_quota) {
        throw new AppError(
            `Kuota tidak boleh lebih kecil dari jumlah yang sudah redeem (${voucher.used_quota})`,
            400
        );
    }

    if (body.promo_code && body.promo_code !== voucher.promo_code) {

        const duplicate =
            await voucherRepository.getVoucherByCode(db, body.promo_code);

        if (duplicate) {
            throw new AppError(
                "Kode voucher sudah digunakan",
                409
            );
        }

    }

    await voucherRepository.updateVoucher(id, merged);

    return await voucherRepository.getVoucherById(id);

};

export const deleteVoucher = async (id) => {

    const voucher =
        await voucherRepository.getVoucherById(id);

    if (!voucher) {
        throw new AppError(
            "Voucher tidak ditemukan",
            404
        );
    }

    if (voucher.used_quota > 0) {
        throw new AppError(
            "Voucher sudah pernah di-redeem dan tidak bisa dihapus. Ubah status menjadi inactive.",
            409
        );
    }

    await voucherRepository.deleteVoucher(id);

};

// =========================
// Customer
// =========================

export const redeemVoucher = async (userId, promoCode) => {

    const connection = await db.getConnection();

    try {

        await connection.beginTransaction();

        // Kunci baris voucher: dua customer yang redeem kode yang sama
        // bersamaan akan dieksekusi berurutan, jadi kuota tidak bisa jebol.
        const voucher =
            await voucherRepository.getVoucherByCode(
                connection,
                promoCode.trim(),
                true
            );

        if (!voucher) {
            throw new AppError("Kode voucher tidak valid", 404);
        }

        assertVoucherRedeemable(voucher, new Date());

        const alreadyOwned =
            await userVoucherRepository.findByVoucherAndUser(
                connection,
                voucher.id,
                userId
            );

        if (alreadyOwned) {
            throw new AppError(
                "Anda sudah meredeem voucher ini",
                409
            );
        }

        const incremented =
            await voucherRepository.incrementUsedQuota(
                connection,
                voucher.id
            );

        if (!incremented) {
            throw new AppError(
                "Kode voucher sudah digunakan",
                400
            );
        }

        let userVoucherId;

        try {

            userVoucherId =
                await userVoucherRepository.create(
                    connection,
                    {
                        voucher_id: voucher.id,
                        user_id: userId,
                        redeemed_at: new Date()
                    }
                );

        } catch (err) {

            // Pengaman terakhir dari UNIQUE (voucher_id, user_id).
            if (err.code === "ER_DUP_ENTRY") {
                throw new AppError(
                    "Anda sudah meredeem voucher ini",
                    409
                );
            }

            throw err;

        }

        await connection.commit();

        return withState(
            await userVoucherRepository.findById(db, userVoucherId)
        );

    } catch (err) {

        await connection.rollback();

        throw err;

    } finally {

        connection.release();

    }

};

export const getMyVouchers = async (userId) => {

    const rows =
        await userVoucherRepository.getByUser(userId);

    return rows.map(withState);

};

// Voucher yang boleh dipilih di checkout: milik user, belum terpakai,
// masih berlaku, dan untuk event yang sedang dibeli.
export const getAvailableVouchers = async (userId, eventId) => {

    const id = Number(eventId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError("event_id wajib diisi", 400);
    }

    const rows =
        await userVoucherRepository.getByUser(
            userId,
            { eventId: id, onlyAvailable: true, now: new Date() }
        );

    return rows.map(withState);

};

// Cek apakah voucher milik user bisa dipakai untuk event & jumlah tiket ini.
export const validateVoucher = async (
    userId,
    userVoucherId,
    eventId,
    totalTicket = 1
) => {

    const userVoucher =
        await userVoucherRepository.findById(db, userVoucherId);

    assertUserVoucherUsable(
        userVoucher,
        { userId, eventId, totalTicket }
    );

    return withState(userVoucher);

};
