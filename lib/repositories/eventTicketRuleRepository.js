import db from "../../config/database.js";

export const findByEventTicketCategoryId = async (eventTicketCategoryId) => {
    const [rows] = await db.query(
        `
        SELECT id, event_ticket_category_id, title, description, display_order
        FROM event_ticket_rules
        WHERE event_ticket_category_id = ?
        ORDER BY display_order ASC, id ASC
        `,
        [eventTicketCategoryId]
    );
    return rows;
};

export const findById = async (id) => {
    const [rows] = await db.query(
        `SELECT * FROM event_ticket_rules WHERE id = ? LIMIT 1`,
        [id]
    );
    return rows[0];
};

export const create = async (data) => {
    const [result] = await db.query(
        `
        INSERT INTO event_ticket_rules
            (event_ticket_category_id, title, description, display_order)
        VALUES (?, ?, ?, ?)
        `,
        [
            data.event_ticket_category_id,
            data.title,
            data.description ?? null,
            data.display_order ?? 0,
        ]
    );
    return findById(result.insertId);
};

export const update = async (id, data) => {
    await db.query(
        `
        UPDATE event_ticket_rules
        SET title = ?, description = ?, display_order = ?
        WHERE id = ?
        `,
        [data.title, data.description ?? null, data.display_order ?? 0, id]
    );
    return findById(id);
};

export const remove = async (id) => {
    const [result] = await db.query(
        `DELETE FROM event_ticket_rules WHERE id = ?`,
        [id]
    );
    return result.affectedRows > 0;
};