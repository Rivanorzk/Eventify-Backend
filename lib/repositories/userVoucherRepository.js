import db from "../../config/database.js";

// Voucher milik customer (hasil redeem) beserta detail voucher & event-nya.
const SELECT_WITH_VOUCHER = `
    SELECT
        uv.id,
        uv.voucher_id,
        uv.user_id,
        uv.order_id,
        uv.redeemed_at,
        uv.used_at,
        v.event_id,
        v.title,
        v.promo_code,
        v.discount_type,
        v.discount_value,
        v.maximum_discount,
        v.minimum_quantity,
        v.start_date,
        v.end_date,
        v.status AS voucher_status,
        e.title AS event_title
    FROM user_vouchers uv
    JOIN vouchers v
        ON uv.voucher_id = v.id
    LEFT JOIN events e
        ON v.event_id = e.id
`;

export const findByVoucherAndUser = async (
    connection,
    voucherId,
    userId
) => {

    const [rows] = await connection.query(
        `
        SELECT id
        FROM user_vouchers
        WHERE voucher_id = ?
        AND user_id = ?
        `,
        [voucherId, userId]
    );

    return rows[0];

};

export const create = async (
    connection,
    { voucher_id, user_id, redeemed_at }
) => {

    const [result] = await connection.query(
        `
        INSERT INTO user_vouchers (
            voucher_id,
            user_id,
            redeemed_at
        )
        VALUES (?, ?, ?)
        `,
        [voucher_id, user_id, redeemed_at]
    );

    return result.insertId;

};

export const findById = async (connection, id) => {

    const [rows] = await connection.query(
        `${SELECT_WITH_VOUCHER} WHERE uv.id = ?`,
        [id]
    );

    return rows[0];

};

// Kunci baris user_vouchers saja (bukan tabel voucher/event) supaya
// checkout paralel untuk event yang sama tidak saling menunggu.
export const findByIdForUpdate = async (connection, id) => {

    const [locked] = await connection.query(
        `
        SELECT id
        FROM user_vouchers
        WHERE id = ?
        FOR UPDATE
        `,
        [id]
    );

    if (!locked[0]) {
        return undefined;
    }

    return await findById(connection, id);

};

export const getByUser = async (
    userId,
    { eventId = null, onlyAvailable = false, now = new Date() } = {}
) => {

    const conditions = ["uv.user_id = ?"];
    const params = [userId];

    if (eventId) {
        conditions.push("v.event_id = ?");
        params.push(eventId);
    }

    if (onlyAvailable) {
        conditions.push("uv.used_at IS NULL");
        conditions.push("v.status = 'active'");
        conditions.push("v.start_date <= ?");
        conditions.push("v.end_date >= ?");
        params.push(now, now);
    }

    const [rows] = await db.query(
        `
        ${SELECT_WITH_VOUCHER}
        WHERE ${conditions.join(" AND ")}
        ORDER BY uv.redeemed_at DESC
        `,
        params
    );

    return rows;

};

export const getByVoucher = async (voucherId) => {

    const [rows] = await db.query(
        `
        SELECT
            uv.id,
            uv.user_id,
            u.username,
            u.email,
            uv.redeemed_at,
            uv.used_at,
            uv.order_id
        FROM user_vouchers uv
        JOIN users u
            ON uv.user_id = u.id
        WHERE uv.voucher_id = ?
        ORDER BY uv.redeemed_at DESC
        `,
        [voucherId]
    );

    return rows;

};

// Tandai voucher terpakai oleh order. Return true jika berhasil
// (false berarti sudah keduluan dipakai order lain).
export const markUsed = async (
    connection,
    id,
    orderId,
    usedAt
) => {

    const [result] = await connection.query(
        `
        UPDATE user_vouchers
        SET
            used_at = ?,
            order_id = ?
        WHERE id = ?
        AND used_at IS NULL
        `,
        [usedAt, orderId, id]
    );

    return result.affectedRows === 1;

};

// Kembalikan voucher ke customer saat order dibatalkan / expired.
// Aman dipanggil berulang (idempotent).
export const releaseByOrderId = async (connection, orderId) => {

    await connection.query(
        `
        UPDATE user_vouchers
        SET
            used_at = NULL,
            order_id = NULL
        WHERE order_id = ?
        `,
        [orderId]
    );

};
