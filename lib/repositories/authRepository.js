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

export const setStatus = async (id, status) => {

    await db.query(
        "UPDATE users SET status = ?, last_seen = NOW() WHERE id = ?",
        [status, id]
    );

};

// Dipanggil tiap request terautentikasi. Hanya menulis ke DB bila perlu
// (status belum online, atau last_seen sudah lebih dari 1 menit lalu).
export const markOnline = async (id) => {

    await db.query(
        `
        UPDATE users
        SET status = 'online', last_seen = NOW()
        WHERE id = ?
          AND (
              status <> 'online'
              OR last_seen IS NULL
              OR last_seen < NOW() - INTERVAL 1 MINUTE
          )
        `,
        [id]
    );

};

// Dipanggil scheduler: user yang tidak aktif lebih dari N menit -> offline.
export const markInactiveOffline = async (minutes) => {

    const [result] = await db.query(
        `
        UPDATE users
        SET status = 'offline'
        WHERE status = 'online'
          AND (
              last_seen IS NULL
              OR last_seen < NOW() - INTERVAL ? MINUTE
          )
        `,
        [minutes]
    );

    return result.affectedRows;

};