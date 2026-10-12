import db from "../../config/database.js";

export const createTicket = async (
    connection,
    data
) => {
    const [result] = await connection.query(
        `
        INSERT INTO tickets (
            order_detail_id,
            ticket_code,
            status
        )
        VALUES (?, ?, ?)
        `,
        [
            data.order_detail_id,
            data.ticket_code,
            data.status
        ]
    );

    return result.insertId;
};

export const getTickets = async () => {
    const [rows] = await db.query(
        `
        SELECT
            t.id,
            t.ticket_code,
            t.created_at,

            e.title AS event_title,

            tc.category_name,

            u.username,

            CASE
                WHEN t.status = 'used' THEN 'used'
                WHEN e.status = 'cancelled' THEN 'cancelled'
                WHEN TIMESTAMP(e.event_date, e.start_time) < NOW() THEN 'expired'
                ELSE 'active'
            END AS status

        FROM tickets t

        JOIN order_details od
            ON t.order_detail_id = od.id

        JOIN orders o
            ON od.order_id = o.id

        JOIN events e
            ON o.event_id = e.id

        JOIN event_ticket_categories etc
            ON od.event_ticket_category_id = etc.id

        JOIN ticket_categories tc
            ON etc.ticket_category_id = tc.id

        JOIN users u
            ON o.customer_id = u.id

        ORDER BY t.created_at DESC
        `
    );

    return rows;
};

export const getMyTickets = async (
    userId
) => {
    const [rows] = await db.query(
        `
        SELECT
            t.id,
            t.ticket_code,

            e.title AS event_title,
            e.event_date,
            e.start_time,
            e.location,
            e.status AS event_status,

            tc.category_name,

            CASE
                WHEN t.status = 'used' THEN 'used'
                WHEN e.status = 'cancelled' THEN 'cancelled'
                WHEN TIMESTAMP(e.event_date, e.start_time) < NOW() THEN 'expired'
                ELSE 'active'
            END AS status

        FROM tickets t

        JOIN order_details od
            ON t.order_detail_id = od.id

        JOIN orders o
            ON od.order_id = o.id

        JOIN events e
            ON o.event_id = e.id

        JOIN event_ticket_categories etc
            ON od.event_ticket_category_id = etc.id

        JOIN ticket_categories tc
            ON etc.ticket_category_id = tc.id

        WHERE o.customer_id = ?

        ORDER BY t.created_at DESC
        `,
        [userId]
    );

    return rows;
};

// lib/repositories/ticketRepository.js
export const getTicketById = async (id) => {
    const [rows] = await db.query(
        `
        SELECT
            t.*,

            o.id AS order_id,
            o.customer_id,
            o.invoice_number,
            o.total_price,
            o.discount_amount,
            o.final_price,
            o.service_fee,
            o.grand_total,

            od.price AS ticket_price,

            etc.id AS event_ticket_category_id,

            e.title AS event_title,
            e.description AS event_description,
            e.location AS event_location,
            e.event_date,
            e.start_time,
            e.end_time,
            e.poster,
            e.status AS event_status,

            tc.category_name,

            p.payment_type,
            p.transaction_status,
            p.settlement_time,

            CASE
                WHEN t.status = 'used' THEN 'used'
                WHEN e.status = 'cancelled' THEN 'cancelled'
                WHEN TIMESTAMP(e.event_date, e.start_time) < NOW() THEN 'expired'
                ELSE 'active'
            END AS status

        FROM tickets t
        JOIN order_details od ON t.order_detail_id = od.id
        JOIN orders o ON od.order_id = o.id
        JOIN events e ON o.event_id = e.id
        JOIN event_ticket_categories etc ON od.event_ticket_category_id = etc.id
        JOIN ticket_categories tc ON etc.ticket_category_id = tc.id
        LEFT JOIN payments p ON p.order_id = o.id
        WHERE t.id = ?
        `,
        [id]
    );
    return rows[0];
};

export const getTicketByCode = async (
    connection,
    ticketCode
) => {
    const [rows] = await connection.query(
        `
        SELECT
            t.*,

            e.title AS event_title,
            e.location AS event_location,
            e.event_date,
            e.start_time,
            e.status AS event_status,

            tc.category_name,

            u.username AS customer_name

        FROM tickets t
        JOIN order_details od ON t.order_detail_id = od.id
        JOIN orders o ON od.order_id = o.id
        JOIN events e ON o.event_id = e.id
        JOIN event_ticket_categories etc ON od.event_ticket_category_id = etc.id
        JOIN ticket_categories tc ON etc.ticket_category_id = tc.id
        JOIN users u ON o.customer_id = u.id
        WHERE t.ticket_code = ?
        FOR UPDATE
        `,
        [ticketCode]
    );

    return rows[0];
};

export const updateTicketStatus = async (
    connection,
    id,
    status
) => {
    await connection.query(
        `
        UPDATE tickets
        SET status = ?
        WHERE id = ?
        `,
        [
            status,
            id
        ]
    );
};

export const countTicketsByOrder = async (
    orderId
) => {
    const [rows] = await db.query(
        `
        SELECT
            COUNT(*) AS total

        FROM tickets t

        JOIN order_details od
            ON t.order_detail_id = od.id

        WHERE od.order_id = ?
        `,
        [orderId]
    );

    return rows[0].total;
};