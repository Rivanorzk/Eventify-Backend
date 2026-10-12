// repositories/eventReminderRepository.js
import db from "../../config/database.js";

export const exists = async (userId, eventId) => {
    const [rows] = await db.query(
        `
        SELECT id
        FROM event_reminders
        WHERE user_id = ? AND event_id = ?
        LIMIT 1
        `,
        [userId, eventId]
    );

    return !!rows[0];
};

export const create = async (userId, eventId) => {
    // INSERT IGNORE: aman dari race condition double-klik, karena sudah
    // ada UNIQUE (user_id, event_id) di tabel event_reminders.
    await db.query(
        `
        INSERT IGNORE INTO event_reminders (user_id, event_id)
        VALUES (?, ?)
        `,
        [userId, eventId]
    );
};

export const remove = async (userId, eventId) => {
    const [result] = await db.query(
        `
        DELETE FROM event_reminders
        WHERE user_id = ? AND event_id = ?
        `,
        [userId, eventId]
    );

    return result.affectedRows > 0;
};

// Dipakai eventService.getEvents untuk menandai event mana saja yang
// sudah di-reminder oleh user yang sedang login (untuk state ikon lonceng).
export const findEventIdsByUserId = async (userId) => {
    const [rows] = await db.query(
        `
        SELECT event_id
        FROM event_reminders
        WHERE user_id = ?
        `,
        [userId]
    );

    return rows.map((row) => row.event_id);
};

// Dipakai untuk halaman "Reminder Saya" (list lengkap event yang diikuti).
export const findAllByUserId = async (userId) => {
    const [rows] = await db.query(
        `
        SELECT
            er.id AS reminder_id,
            er.created_at AS reminded_at,
            e.id,
            e.title,
            e.description,
            e.location,
            e.poster,
            e.event_date,
            e.start_time,
            e.sales_start_at,
            e.status,
            c.category_name
        FROM event_reminders er
        INNER JOIN events e ON e.id = er.event_id
        LEFT JOIN categories c ON c.id = e.category_id
        WHERE er.user_id = ?
        ORDER BY e.event_date ASC
        `,
        [userId]
    );

    return rows;
};

export const countByEventId = async (eventId) => {
    const [rows] = await db.query(
        `
        SELECT COUNT(*) AS total
        FROM event_reminders
        WHERE event_id = ?
        `,
        [eventId]
    );

    return rows[0].total;
};

export const findUserIdsByEventId = async (eventId) => {
    const [rows] = await db.query(
        `SELECT user_id FROM event_reminders WHERE event_id = ?`,
        [eventId]
    );
    return rows.map((r) => r.user_id);
};