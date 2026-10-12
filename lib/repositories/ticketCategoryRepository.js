import db from "../../config/database.js";

export const findAll = async () => {
    const [rows] = await db.query(`
        SELECT
            id,
            category_name,
            created_at,
            updated_at
        FROM ticket_categories
        ORDER BY created_at DESC
    `);

    return rows;
};

export const findById = async (id) => {
    const [rows] = await db.query(`
        SELECT
            id,
            category_name,
            created_at,
            updated_at
        FROM ticket_categories
        WHERE id = ?
        LIMIT 1
    `, [id]);

    return rows[0];
};

export const findByName = async (categoryName) => {
    const [rows] = await db.query(`
        SELECT
            id,
            category_name,
            created_at,
            updated_at
        FROM ticket_categories
        WHERE category_name = ?
        LIMIT 1
    `, [categoryName]);

    return rows[0];
};

export const create = async (categoryName) => {
    const [result] = await db.query(`
        INSERT INTO ticket_categories (
            category_name
        )
        VALUES (?)
    `, [categoryName]);

    return findById(result.insertId);
};

export const update = async (id, categoryName) => {
    await db.query(`
        UPDATE ticket_categories
        SET category_name = ?
        WHERE id = ?
    `, [
        categoryName,
        id
    ]);

    return findById(id);
};

export const remove = async (id) => {
    const [result] = await db.query(`
        DELETE FROM ticket_categories
        WHERE id = ?
    `, [id]);

    return result.affectedRows > 0;
};