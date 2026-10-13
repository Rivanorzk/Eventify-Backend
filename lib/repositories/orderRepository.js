import db from "../../config/database.js";

export const getOrders = async () => {

    const [rows] = await db.query(`
        SELECT
            o.*,
            u.username,
            e.title AS event_title
        FROM orders o
        JOIN users u
            ON o.customer_id = u.id
        JOIN events e
            ON o.event_id = e.id
        ORDER BY o.created_at DESC
    `);

    return rows;

};

export const getMyOrders = async (customerId) => {

    const [rows] = await db.query(
        `
        SELECT
            o.*,
            e.title AS event_title,
            e.event_date,
            e.start_time,
            e.location AS event_location,
            e.poster,
            o.expired_at AS payment_deadline,
            (SELECT COALESCE(SUM(od.quantity), 0)
                FROM order_details od
                WHERE od.order_id = o.id) AS ticket_count
        FROM orders o
        JOIN events e
            ON o.event_id = e.id
        WHERE o.customer_id = ?
        ORDER BY o.created_at DESC
        `,
        [customerId]
    );

    return rows;

};

export const getOrderById = async (id) => {

    const [rows] = await db.query(
        `
        SELECT *
        FROM orders
        WHERE id = ?
        `,
        [id]
    );

    return rows[0];

};

export const getOrderWithCustomer = async (id) => {

    const [rows] = await db.query(
        `
        SELECT
            o.*,
            u.username,
            u.email,
            u.phone
        FROM orders o
        JOIN users u
            ON o.customer_id = u.id
        WHERE o.id = ?
        `,
        [id]
    );

    return rows[0];

};

export const getOrderDetails = async (orderId) => {

    const [rows] = await db.query(
        `
        SELECT
            od.*,
            tc.category_name
        FROM order_details od
        JOIN event_ticket_categories etc
            ON od.event_ticket_category_id = etc.id
        JOIN ticket_categories tc
            ON etc.ticket_category_id = tc.id
        WHERE od.order_id = ?
        `,
        [orderId]
    );

    return rows;

};

export const createOrder = async (
    connection,
    data
) => {

    const [result] = await connection.query(
        `
        INSERT INTO orders (
            event_id,
            customer_id,
            voucher_id,
            invoice_number,
            total_price,
            discount_amount,
            final_price,
            service_fee_percent,
            service_fee,
            grand_total,
            status,
            expired_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            data.event_id,
            data.customer_id,
            data.voucher_id,
            data.invoice_number,
            data.total_price,
            data.discount_amount,
            data.final_price,
            data.service_fee_percent,
            data.service_fee,
            data.grand_total,
            data.status,
            data.expired_at
        ]
    );

    return result.insertId;

};

export const createOrderDetail = async (
    connection,
    data
) => {

    await connection.query(
        `
        INSERT INTO order_details (
            order_id,
            event_ticket_category_id,
            quantity,
            price,
            subtotal
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            data.order_id,
            data.ticket_category_id,
            data.quantity,
            data.price,
            data.subtotal
        ]
    );

};

export const updateOrderStatus = async (
    connection,
    id,
    status
) => {

    await connection.query(
        `
        UPDATE orders
        SET status = ?
        WHERE id = ?
        `,
        [
            status,
            id
        ]
    );

};

export const deleteOrder = async (
    connection,
    id
) => {

    await connection.query(
        `
        DELETE FROM orders
        WHERE id = ?
        `,
        [id]
    );

};

// Ganti getOrderById yang lama dengan ini (atau tambahkan method baru)

/**
 * Ambil order lengkap dengan data event + customer + voucher.
 * Ini yang dipakai untuk halaman detail order.
 */
export const getOrderFullById = async (id) => {
  const [rows] = await db.query(
    `
    SELECT
      o.*,
      e.title        AS event_title,
      e.description  AS event_description,
      e.event_date,
      e.start_time,
      e.end_time,
      e.location     AS event_location,
      e.poster       AS event_poster,
      e.latitude     AS event_latitude,
      e.longitude    AS event_longitude,
      u.username     AS customer_username,
      u.email        AS customer_email,
      u.phone        AS customer_phone,
      v.promo_code   AS voucher_promo_code,
      v.title        AS voucher_title,
      v.discount_type,
      v.discount_value
    FROM orders o
    JOIN events e ON o.event_id = e.id
    JOIN users  u ON o.customer_id = u.id
    LEFT JOIN vouchers v ON o.voucher_id = v.id
    WHERE o.id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0];
};

/**
 * Ambil semua tiket dari order (flat), sekaligus info kategori & area.
 */
export const getTicketsByOrderId = async (orderId) => {
  const [rows] = await db.query(
    `
    SELECT
      t.id,
      t.ticket_code,
      t.status,
      t.order_detail_id,
      od.quantity,
      od.price,
      od.subtotal,
      tc.category_name,
      etc.id AS event_ticket_category_id,
      etc.description AS category_description
    FROM tickets t
    JOIN order_details od ON t.order_detail_id = od.id
    JOIN event_ticket_categories etc ON od.event_ticket_category_id = etc.id
    JOIN ticket_categories tc ON etc.ticket_category_id = tc.id
    WHERE od.order_id = ?
    ORDER BY t.id ASC
    `,
    [orderId]
  );

  return rows;
};

/**
 * Ambil payment aktif untuk order.
 */
export const getPaymentByOrderId = async (orderId) => {
  const [rows] = await db.query(
    `
    SELECT
      id,
      order_id,
      midtrans_order_id,
      transaction_id,
      snap_token,
      redirect_url,
      payment_type,
      transaction_status,
      fraud_status,
      gross_amount,
      transaction_time,
      settlement_time,
      expiry_time,
      created_at,
      updated_at
    FROM payments
    WHERE order_id = ?
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orderId]
  );

  return rows[0] || null;
};