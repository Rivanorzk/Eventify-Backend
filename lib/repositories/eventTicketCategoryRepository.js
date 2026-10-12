import db from "../../config/database.js";

// CATATAN: "name" di response diambil dari ticket_categories.category_name
// (lihat migrations/2026_09_add_event_ticket_category_fields.sql untuk
// alasan kenapa tidak dibuat kolom "name" terpisah di tabel ini).
// "quota" = stock, "sold" = stock - remaining_stock — supaya response
// langsung cocok dengan field yang dipakai
// app/admin/events/[id]/tickets/page.js.

const BASE_SELECT = `
    SELECT
        etc.id,
        etc.event_id,
        etc.ticket_category_id,
        tc.category_name AS name,
        etc.price,
        etc.stock AS quota,
        etc.remaining_stock,
        (etc.stock - etc.remaining_stock) AS sold,
        etc.description,
        etc.is_active,
        etc.created_at,
        etc.updated_at
    FROM event_ticket_categories etc
    INNER JOIN ticket_categories tc
        ON etc.ticket_category_id = tc.id
`;

export const findAll = async () => {
    const [rows] = await db.query(`
        ${BASE_SELECT}
        ORDER BY etc.created_at DESC
    `);

    return rows;
};

export const findById = async (id) => {
    const [rows] = await db.query(`
        ${BASE_SELECT}
        WHERE etc.id = ?
        LIMIT 1
    `, [id]);

    return rows[0];
};

export const findByEvent = async (eventId) => {
    const [rows] = await db.query(`
        ${BASE_SELECT}
        WHERE etc.event_id = ?
        ORDER BY etc.created_at ASC
    `, [eventId]);

    return rows;
};

export const findByEventAndCategory = async (
    eventId,
    ticketCategoryId
) => {
    const [rows] = await db.query(`
        SELECT *
        FROM event_ticket_categories
        WHERE event_id = ?
        AND ticket_category_id = ?
        LIMIT 1
    `, [
        eventId,
        ticketCategoryId
    ]);

    return rows[0];
};

export const create = async (data) => {
    const [result] = await db.query(`
        INSERT INTO event_ticket_categories (
            event_id,
            ticket_category_id,
            price,
            stock,
            remaining_stock,
            description,
            is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
        data.event_id,
        data.ticket_category_id,
        data.price,
        data.stock,
        data.stock,
        data.description ?? null,
        data.is_active ?? true
    ]);

    return findById(result.insertId);
};

export const update = async (id, data) => {
    await db.query(`
        UPDATE event_ticket_categories
        SET
            ticket_category_id = ?,
            price = ?,
            stock = ?,
            remaining_stock = ?,
            description = ?,
            is_active = ?
        WHERE id = ?
    `, [
        data.ticket_category_id,
        data.price,
        data.stock,
        data.remaining_stock,
        data.description ?? null,
        data.is_active ?? true,
        id
    ]);

    return findById(id);
};

export const remove = async (id) => {
    const [result] = await db.query(`
        DELETE FROM event_ticket_categories
        WHERE id = ?
    `, [id]);

    return result.affectedRows > 0;
};

export const updateRemainingStock = async (
    connection,
    id,
    quantity
) => {
    await connection.query(`
        UPDATE event_ticket_categories
        SET remaining_stock = remaining_stock - ?
        WHERE id = ?
        AND remaining_stock >= ?
    `, [
        quantity,
        id,
        quantity
    ]);
};

export const increaseRemainingStock = async (
    connection,
    id,
    quantity
) => {
    await connection.query(`
        UPDATE event_ticket_categories
        SET remaining_stock = remaining_stock + ?
        WHERE id = ?
        AND remaining_stock + ? <= stock
    `, [
        quantity,
        id,
        quantity
    ]);
};

export const findByIdForUpdate = async (
    connection,
    id
) => {
    const [rows] = await connection.query(`
        SELECT
            id,
            event_id,
            ticket_category_id,
            price,
            stock,
            remaining_stock
        FROM event_ticket_categories
        WHERE id = ?
        FOR UPDATE
    `, [id]);

    return rows[0];
};