import db from "../../config/database.js";

export const createRedemption = async (
    connection,
    data
) => {

    const [result] = await connection.query(
        `
        INSERT INTO redemption_logs (
            ticket_id,
            admin_id,
            redeemed_at,
            notes
        )
        VALUES (?, ?, NOW(), ?)
        `,
        [
            data.ticket_id,
            data.admin_id,
            data.notes
        ]
    );

    return result.insertId;

};

export const getRedemptions = async () => {

    const [rows] = await db.query(
        `
        SELECT
            rl.id,
            rl.redeemed_at,
            rl.notes,
            t.ticket_code,
            u.username AS admin_name,
            e.title AS event_title,
            tc.category_name,
            cust.username AS customer_name
        FROM redemption_logs rl
        JOIN tickets t
            ON rl.ticket_id = t.id
        JOIN users u
            ON rl.admin_id = u.id
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
        JOIN users cust
            ON o.customer_id = cust.id
        ORDER BY rl.redeemed_at DESC
        LIMIT 20
        `
    );

    return rows;

};

export const getRedemptionById = async (id) => {

    const [rows] = await db.query(
        `
        SELECT
            rl.*,
            t.ticket_code,
            u.username AS admin_name
        FROM redemption_logs rl
        JOIN tickets t
            ON rl.ticket_id = t.id
        JOIN users u
            ON rl.admin_id = u.id
        WHERE rl.id = ?
        `,
        [id]
    );

    return rows[0];

};