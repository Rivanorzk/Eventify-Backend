import db from "../../config/database.js";

export const getValue = async (key, executor = db) => {

    const [rows] = await executor.query(
        `
        SELECT setting_value
        FROM settings
        WHERE setting_key = ?
        `,
        [key]
    );

    return rows[0]?.setting_value ?? null;

};

export const setValue = async (key, value, userId = null) => {

    await db.query(
        `
        INSERT INTO settings (setting_key, setting_value, updated_by)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            setting_value = VALUES(setting_value),
            updated_by = VALUES(updated_by)
        `,
        [key, String(value), userId]
    );

};

export const getRow = async (key) => {

    const [rows] = await db.query(
        `
        SELECT
            s.setting_key,
            s.setting_value,
            s.updated_at,
            s.updated_by,
            u.username AS updated_by_username
        FROM settings s
        LEFT JOIN users u
            ON u.id = s.updated_by
        WHERE s.setting_key = ?
        `,
        [key]
    );

    return rows[0];

};
