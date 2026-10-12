// repositories/notificationRepository.js
import db from "../../config/database.js";

export const findAllByUserId = async (userId, { limit = 20, offset = 0 } = {}) => {
    const [rows] = await db.query(
        `
        SELECT 
            id,
            user_id,
            title,
            message,
            type,
            is_read,
            link,
            icon,
            created_at,
            updated_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        `,
        [userId, limit, offset]
    );

    return rows;
};

export const countUnreadByUserId = async (userId) => {
    const [rows] = await db.query(
        `
        SELECT COUNT(*) as unread_count
        FROM notifications
        WHERE user_id = ? AND is_read = FALSE
        `,
        [userId]
    );

    return rows[0].unread_count;
};

export const countAllByUserId = async (userId) => {
    const [rows] = await db.query(
        `
        SELECT COUNT(*) as total
        FROM notifications
        WHERE user_id = ?
        `,
        [userId]
    );

    return rows[0].total;
};

export const findById = async (id, userId) => {
    const [rows] = await db.query(
        `
        SELECT 
            id,
            user_id,
            title,
            message,
            type,
            is_read,
            link,
            icon,
            created_at,
            updated_at
        FROM notifications
        WHERE id = ? AND user_id = ?
        LIMIT 1
        `,
        [id, userId]
    );

    return rows[0];
};

export const create = async (data) => {
    const [result] = await db.query(
        `
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            link,
            icon
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            data.user_id,
            data.title,
            data.message,
            data.type || 'system',
            data.link || null,
            data.icon || null
        ]
    );

    return findById(result.insertId, data.user_id);
};

export const markAsRead = async (id, userId) => {
    await db.query(
        `
        UPDATE notifications
        SET is_read = TRUE, updated_at = NOW()
        WHERE id = ? AND user_id = ?
        `,
        [id, userId]
    );

    return findById(id, userId);
};

export const markAllAsRead = async (userId) => {
    await db.query(
        `
        UPDATE notifications
        SET is_read = TRUE, updated_at = NOW()
        WHERE user_id = ? AND is_read = FALSE
        `,
        [userId]
    );
};

export const remove = async (id, userId) => {
    const [result] = await db.query(
        `
        DELETE FROM notifications
        WHERE id = ? AND user_id = ?
        `,
        [id, userId]
    );

    return result.affectedRows > 0;
};

export const removeAll = async (userId) => {
    const [result] = await db.query(
        `
        DELETE FROM notifications
        WHERE user_id = ?
        `,
        [userId]
    );

    return result.affectedRows > 0;
};

export const createBulk = async (notifications) => {
    if (!notifications.length) return [];

    const values = notifications.map(n => [
        n.user_id,
        n.title,
        n.message,
        n.type || 'system',
        n.link || null,
        n.icon || null
    ]);

    const [result] = await db.query(
        `
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            link,
            icon
        )
        VALUES ?
        `,
        [values]
    );

    return result;
};