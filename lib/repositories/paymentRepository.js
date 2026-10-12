import db from "../../config/database.js";

export const getPaymentByOrderId = async (orderId) => {

    const [rows] = await db.query(
        `
        SELECT
            id,
            order_id,
            midtrans_order_id,
            transaction_id,
            payment_type,
            transaction_status,
            fraud_status,
            gross_amount,
            transaction_time,
            settlement_time,
            expiry_time,
            snap_token,
            redirect_url
        FROM payments
        WHERE order_id = ?
        `,
        [orderId]
    );

    return rows[0];

};

export const getPaymentByExternalId = async (midtransOrderId) => {

    const [rows] = await db.query(
        `
        SELECT *
        FROM payments
        WHERE midtrans_order_id = ?
        `,
        [midtransOrderId]
    );

    return rows[0];

};

export const getPaymentWithOrder = async (orderId) => {

    const [rows] = await db.query(
        `
        SELECT
            p.*,
            o.invoice_number,
            o.final_price,
            o.service_fee,
            o.grand_total,
            o.status AS order_status,
            o.customer_id
        FROM payments p
        JOIN orders o
            ON p.order_id = o.id
        WHERE p.order_id = ?
        `,
        [orderId]
    );

    return rows[0];

};

export const createPayment = async (
    connection,
    data
) => {

    const [result] = await connection.query(
        `
        INSERT INTO payments (
            order_id,
            midtrans_order_id,
            snap_token,
            gross_amount,
            expiry_time,
            redirect_url,
            transaction_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            data.order_id,
            data.midtrans_order_id,
            data.snap_token,
            data.gross_amount,
            data.expiry_time,
            data.redirect_url,
            "pending"
        ]
    );

    return result.insertId;

};

export const updatePayment = async (
    connection,
    orderId,
    data
) => {

    await connection.query(
        `
        UPDATE payments
        SET
            transaction_id = ?,
            payment_type = ?,
            transaction_status = ?,
            fraud_status = ?,
            transaction_time = ?,
            settlement_time = ?
        WHERE order_id = ?
        `,
        [
            data.transaction_id,
            data.payment_type,
            data.transaction_status,
            data.fraud_status,
            data.transaction_time,
            data.settlement_time,
            orderId
        ]
    );

};
