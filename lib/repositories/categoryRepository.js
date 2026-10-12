import db from "../../config/database.js";

export const findAll = async () => {
    const [rows] = await db.query(`
        SELECT
            id,
            category_name,
            icon,
            created_at
        FROM categories
        ORDER BY created_at DESC
    `);

    return rows;
};

export const findById = async (id) => {
    const [rows] = await db.query(`
        SELECT
            id,
            category_name,
            icon,
            created_at
        FROM categories
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
            icon,
            created_at
        FROM categories
        WHERE category_name = ?
        LIMIT 1
    `, [categoryName]);

    return rows[0];
};

export const create = async ({
    categoryName,
    description,
    icon,
}) => {
    const [result] = await db.query(`
        INSERT INTO categories (
            category_name,
            icon
        )
        VALUES (?, ?)
    `, [
        categoryName,
        icon,
    ]);

    return findById(result.insertId);
};

export const update = async (
    id,
    {
        categoryName,
        icon,
    }
) => {
    await db.query(`
        UPDATE categories
        SET
            category_name = ?,
            icon = ?
        WHERE id = ?
    `, [
        categoryName,
        icon,
        id,
    ]);

    return findById(id);
};

export const remove = async (id) => {
    const [result] = await db.query(`
        DELETE FROM categories
        WHERE id = ?
    `, [id]);

    return result.affectedRows > 0;
};