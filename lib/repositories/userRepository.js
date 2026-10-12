import db from "../../config/database.js";

export const findAll = async () => {

    const [rows] = await db.query(`
        SELECT
            id,
            username,
            email,
            phone,
            profile_image,
            role,
            status,
            is_active,
            created_at
        FROM users
        ORDER BY created_at DESC
    `);

    return rows;

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

export const findByIdWithPassword = async (id) => {
    const [rows] = await db.query(
        `
        SELECT
            id,
            username,
            email,
            phone,
            profile_image,
            role,
            status,
            is_active,
            password, 
            created_at
        FROM users
        WHERE id = ?
        `,
        [id]
    );
    return rows[0];
};

export const updateProfile = async (id, data) => {
    // Bangun query secara dinamis
    const fields = [];
    const values = [];

    if (data.username !== undefined) {
        fields.push("username = ?");
        values.push(data.username);
    }
    if (data.email !== undefined) {
        fields.push("email = ?");
        values.push(data.email);
    }
    if (data.phone !== undefined) {
        fields.push("phone = ?");
        values.push(data.phone);
    }
    if (data.profile_image !== undefined) {
        fields.push("profile_image = ?");
        values.push(data.profile_image);
    }
    if (data.cover_image !== undefined) {
        fields.push("cover_image = ?");
        values.push(data.cover_image);
    }
    if (fields.length === 0) {
        return findById(id); // tidak ada perubahan
    }

    values.push(id);

    const sql = `
        UPDATE users
        SET ${fields.join(", ")}
        WHERE id = ?
    `;

    await db.query(sql, values);
    return findById(id);
};

export const updatePassword = async (id, password) => {

    await db.query(
        `
        UPDATE users
        SET password = ?
        WHERE id = ?
        `,
        [password, id]
    );

};

export const updateRole = async (id, role) => {

    await db.query(
        `
        UPDATE users
        SET role = ?
        WHERE id = ?
        `,
        [role, id]
    );

    return findById(id);

};

export const updateStatus = async (id, status, isActive) => {

    await db.query(
        `
        UPDATE users
        SET
            status = ?,
            is_active = ?
        WHERE id = ?
        `,
        [
            status,
            isActive,
            id
        ]
    );

    return findById(id);

};

export const remove = async (id) => {

    await db.query(
        "DELETE FROM users WHERE id = ?",
        [id]
    );

};