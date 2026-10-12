import db from "../../config/database.js";

export const getEventTicketCategories = async (eventId) => {
    const [rows] = await db.query(`
        SELECT
            etc.id,
            etc.event_id,
            etc.ticket_category_id,
            tc.category_name,
            etc.price,
            etc.stock,
            etc.remaining_stock
        FROM event_ticket_categories etc
        JOIN ticket_categories tc
            ON etc.ticket_category_id = tc.id
        WHERE etc.event_id = ?
        ORDER BY tc.category_name ASC
    `, [eventId]);

    return rows;
};

export const getEventTicketCategoryById = async (id) => {
    const [rows] = await db.query(`
        SELECT
            etc.id,
            etc.event_id,
            etc.ticket_category_id,
            tc.category_name,
            etc.price,
            etc.stock,
            etc.remaining_stock
        FROM event_ticket_categories etc
        JOIN ticket_categories tc
            ON etc.ticket_category_id = tc.id
        WHERE etc.id = ?
        LIMIT 1
    `, [id]);

    return rows[0];
};

export const createEventTicketCategory = async (data) => {
    const [result] = await db.query(`
        INSERT INTO event_ticket_categories (
            event_id,
            ticket_category_id,
            price,
            stock,
            remaining_stock
        )
        VALUES (?, ?, ?, ?, ?)
    `, [
        data.event_id,
        data.ticket_category_id,
        data.price,
        data.stock,
        data.stock,
    ]);

    return getEventTicketCategoryById(result.insertId);
};

export const updateEventTicketCategory = async (id, data) => {
    await db.query(`
        UPDATE event_ticket_categories
        SET
            price = ?,
            stock = ?,
            remaining_stock = ?
        WHERE id = ?
    `, [
        data.price,
        data.stock,
        data.remaining_stock,
        id,
    ]);

    return getEventTicketCategoryById(id);
};

export const deleteEventTicketCategory = async (id) => {
    const [result] = await db.query(`
        DELETE FROM event_ticket_categories
        WHERE id = ?
    `, [id]);

    return result.affectedRows > 0;
};
