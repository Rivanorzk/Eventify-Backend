import db from "../../config/database.js";

// Tanggal dari frontend berupa ISO (mis. 2026-09-30T03:00:00.000Z). Ubah ke
// Date supaya driver mysql2 yang menulis ke DB dengan zona waktu yang sama
// dengan saat membacanya, bukan menyimpan string mentah apa adanya.
const toDate = (value) => (value ? new Date(value) : value);

export const getVouchers = async () => {

    const [rows] = await db.query(`
        SELECT
            v.*,
            e.title AS event_title
        FROM vouchers v
        LEFT JOIN events e
            ON v.event_id = e.id
        ORDER BY v.created_at DESC
    `);

    return rows;

};

export const getVoucherById = async (id) => {

    const [rows] = await db.query(
        `
        SELECT
            v.*,
            e.title AS event_title
        FROM vouchers v
        LEFT JOIN events e
            ON v.event_id = e.id
        WHERE v.id = ?
        `,
        [id]
    );

    return rows[0];

};

// connection boleh `db` (pool) atau koneksi transaksi.
// Pakai forUpdate = true hanya di dalam transaksi.
export const getVoucherByCode = async (
    connection,
    promoCode,
    forUpdate = false
) => {

    const [rows] = await connection.query(
        `
        SELECT
            id,
            event_id,
            title,
            minimum_quantity,
            promo_code,
            discount_type,
            discount_value,
            maximum_discount,
            quota,
            used_quota,
            start_date,
            end_date,
            status
        FROM vouchers
        WHERE promo_code = ?
        ${forUpdate ? "FOR UPDATE" : ""}
        `,
        [promoCode]
    );

    return rows[0];

};

export const createVoucher = async (data) => {

    const [result] = await db.query(
        `
        INSERT INTO vouchers (
            event_id,
            title,
            minimum_quantity,
            promo_code,
            discount_type,
            discount_value,
            maximum_discount,
            quota,
            used_quota,
            start_date,
            end_date,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            data.event_id,
            data.title,
            data.minimum_quantity ?? 1,
            data.promo_code,
            data.discount_type,
            data.discount_value,
            data.maximum_discount ?? null,
            data.quota ?? 1,
            0,
            toDate(data.start_date),
            toDate(data.end_date),
            data.status || "active"
        ]
    );

    return result.insertId;

};

export const updateVoucher = async (id, data) => {

    await db.query(
        `
        UPDATE vouchers
        SET
            title = ?,
            minimum_quantity = ?,
            promo_code = ?,
            discount_type = ?,
            discount_value = ?,
            maximum_discount = ?,
            quota = ?,
            start_date = ?,
            end_date = ?,
            status = ?
        WHERE id = ?
        `,
        [
            data.title,
            data.minimum_quantity,
            data.promo_code,
            data.discount_type,
            data.discount_value,
            data.maximum_discount ?? null,
            data.quota,
            toDate(data.start_date),
            toDate(data.end_date),
            data.status,
            id
        ]
    );

};

// Voucher aktif yang end_date-nya sudah lewat -> inactive.
// Return jumlah voucher yang diubah.
export const deactivateEndedVouchers = async () => {

    const [result] = await db.query(`
        UPDATE vouchers
        SET status = 'inactive'
        WHERE status = 'active'
          AND end_date < NOW()
    `);

    return result.affectedRows;

};

// Jumlah order yang pernah memakai voucher ini (termasuk yang sudah
// dibatalkan / expired). Dipakai untuk menjaga riwayat transaksi.
export const countOrdersByVoucher = async (id) => {

    const [rows] = await db.query(
        `SELECT COUNT(*) AS total FROM orders WHERE voucher_id = ?`,
        [id]
    );

    return Number(rows[0].total);

};

// Hapus voucher beserta baris redeem-nya (user_vouchers) dalam satu
// transaksi. Hanya boleh dipanggil setelah service memastikan tidak ada
// order yang memakai voucher ini.
export const deleteVoucherWithRedemptions = async (id) => {

    const connection = await db.getConnection();

    try {

        await connection.beginTransaction();

        await connection.query(
            `DELETE FROM user_vouchers WHERE voucher_id = ?`,
            [id]
        );

        await connection.query(
            `DELETE FROM vouchers WHERE id = ?`,
            [id]
        );

        await connection.commit();

    } catch (err) {

        await connection.rollback();

        throw err;

    } finally {

        connection.release();

    }

};

export const deleteVoucher = async (id) => {

    await db.query(
        `
        DELETE FROM vouchers
        WHERE id = ?
        `,
        [id]
    );

};

// used_quota = jumlah redeem. Return false jika kuota sudah penuh.
export const incrementUsedQuota = async (
    connection,
    id
) => {

    const [result] = await connection.query(
        `
        UPDATE vouchers
        SET used_quota = used_quota + 1
        WHERE id = ?
        AND used_quota < quota
        `,
        [id]
    );

    return result.affectedRows === 1;

};

// Voucher aktif yang sudah berlaku tapi notifikasinya belum pernah dikirim.
export const findDueForNotification = async () => {

    const [rows] = await db.query(`
        SELECT
            v.*,
            e.title AS event_title
        FROM vouchers v
        LEFT JOIN events e
            ON v.event_id = e.id
        WHERE v.status = 'active'
          AND v.notified_at IS NULL
          AND v.start_date <= NOW()
          AND v.end_date > NOW()
    `);

    return rows;

};

// Klaim atomik: hanya satu proses yang bisa "memenangkan" voucher ini,
// jadi notifikasi tidak mungkin terkirim dua kali.
export const claimNotification = async (id) => {

    const [result] = await db.query(
        `UPDATE vouchers SET notified_at = NOW() WHERE id = ? AND notified_at IS NULL`,
        [id]
    );

    return result.affectedRows > 0;

};

export const releaseNotification = async (id) => {

    await db.query(
        `UPDATE vouchers SET notified_at = NULL WHERE id = ?`,
        [id]
    );

};