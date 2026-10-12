import db from "../../config/database.js";

export const findByEmail = async (email) => {

    const [rows] = await db.query(
        "SELECT * FROM users WHERE email = ?",
        [email]
    );

    return rows[0];

};

export const findById = async (id) => {

    const [rows] = await db.query(
        `
        SELECT
            id,
            username,
            email,
            phone,
            profile_image,
            cover_image,
            role,
            status,
            is_active,
            created_at
        FROM users
        WHERE id = ?
        `,
        [id]
    );

    return rows[0];

};

export const createUser = async (user) => {

    const [result] = await db.query(
        `
        INSERT INTO users
        (
            username,
            email,
            password,
            phone
        )
        VALUES (?, ?, ?, ?)
        `,
        [
            user.username,
            user.email,
            user.password,
            user.phone
        ]
    );

    return result.insertId;

};