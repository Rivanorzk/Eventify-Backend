import db from "../../config/database.js";

export async function findAll({
    search = "",
    category = "", // Ini akan berisi ID kategori
    sort = "latest",
    status = "published", // default: perilaku publik/customer tetap sama persis
} = {}) {
    let sql = `
        SELECT
            e.id,
            e.admin_id,
            e.category_id,
            c.category_name,
            e.title,
            e.description,
            e.location,
            e.poster,
            e.event_date,
            e.start_time,
            e.sales_start_at,
            e.status,
            e.latitude,
            e.longitude,
            e.created_at,
            e.updated_at,

            MIN(etc.price) AS price

        FROM events e

        LEFT JOIN categories c
            ON c.id = e.category_id

        LEFT JOIN event_ticket_categories etc
            ON etc.event_id = e.id

        WHERE 1 = 1
    `;

    const values = [];

    // status = "all" dipakai oleh panel admin/superadmin untuk melihat
    // semua status (draft/published/finished/cancelled). Selain itu,
    // filter ke status tertentu (default "published" untuk halaman publik).
    if (status && status !== "all") {
        sql += ` AND e.status = ? `;
        values.push(status);
    }

    if (search) {
        sql += `
            AND (
                e.title LIKE ?
                OR e.location LIKE ?
                OR c.category_name LIKE ?
            )
        `;

        const keyword = `%${search}%`;

        values.push(keyword, keyword, keyword);
    }

    // ✅ PERBAIKAN: Filter berdasarkan ID, bukan nama
    if (category && category !== "All") {
        sql += ` AND e.category_id = ? `; // ← Perbaikan di sini
        values.push(category); // Kirim ID kategori
    }

    sql += `
        GROUP BY
            e.id,
            e.admin_id,
            e.category_id,
            c.category_name,
            e.title,
            e.description,
            e.location,
            e.poster,
            e.event_date,
            e.start_time,
            e.sales_start_at,
            e.status,
            e.latitude,
            e.longitude,
            e.created_at,
            e.updated_at
    `;

    switch (sort) {
        case "latest":
            sql += ` ORDER BY e.created_at DESC `;
            break;
        case "oldest":
            sql += ` ORDER BY e.created_at ASC `;
            break;
        case "date":
            sql += ` ORDER BY e.event_date ASC `;
            break;
        default:
            sql += ` ORDER BY e.created_at DESC `;
    }

    console.log('SQL Query:', sql); // Debug
    console.log('Values:', values); // Debug

    const [rows] = await db.query(sql, values);
    
    console.log('Found events:', rows.length); // Debug

    return rows;
}

// repositories/eventRepository.js

export const findById = async (id) => {
    // 1. Ambil data event
    const [eventRows] = await db.query(`
        SELECT
            e.*,
            c.category_name,
            u.id AS admin_user_id,
            u.username AS admin_username,
            u.email AS admin_email
        FROM events e
        LEFT JOIN categories c ON c.id = e.category_id
        LEFT JOIN users u ON e.admin_id = u.id
        WHERE e.id = ?
    `, [id]);

    if (!eventRows[0]) return null;

    const event = eventRows[0];

    // 2. Ambil ticket categories untuk event ini
    const [ticketRows] = await db.query(`
        SELECT
            etc.id,
            etc.event_id,
            etc.ticket_category_id,
            etc.price,
            etc.stock,
            etc.remaining_stock,
            tc.category_name
        FROM event_ticket_categories etc
        INNER JOIN ticket_categories tc 
            ON etc.ticket_category_id = tc.id
        WHERE etc.event_id = ?
        ORDER BY tc.category_name ASC
    `, [id]);

    // 3. Gabungkan
    return {
        ...event,
        ticket_categories: ticketRows || []
    };
};

export const create = async (data) => {
    const [result] = await db.query(
        `
        INSERT INTO events (
            admin_id,
            category_id,
            title,
            description,
            location,
            latitude,
            longitude,
            poster,
            event_date,
            start_time,
            sales_start_at,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            data.admin_id,
            data.category_id,
            data.title,
            data.description,
            data.location,
            data.latitude,
            data.longitude,
            data.poster,
            data.event_date,
            data.start_time,
            data.sales_start_at ?? null,
            data.status,
        ]
    );

    return result.insertId;
};

export const update = async (id, data) => {
    await db.query(
        `
        UPDATE events
        SET
            category_id = ?,
            title = ?,
            description = ?,
            location = ?,
            latitude = ?,
            longitude = ?,
            poster = ?,
            event_date = ?,
            start_time = ?,
            sales_start_at = ?,
            status = ?,
            updated_at = NOW()
        WHERE id = ?
        `,
        [
            data.category_id,
            data.title,
            data.description,
            data.location,
            data.latitude,
            data.longitude,
            data.poster,
            data.event_date,
            data.start_time,
            data.sales_start_at ?? null,
            data.status,
            id,
        ]
    );
};

export const remove = async (id) => {
    await db.query(
        `
        DELETE FROM events
        WHERE id = ?
        `,
        [id]
    );
};

// Ambil event draft yang sales_start_at-nya sudah lewat/sekarang
export async function findDraftsReadyToPublish() {
    const [rows] = await db.query(
        `
        SELECT id, title
        FROM events
        WHERE status = 'draft'
          AND sales_start_at IS NOT NULL
          AND sales_start_at <= NOW()
        `
    );
    return rows;
}

export async function publishById(id) {
    await db.query(
        `UPDATE events SET status = 'published' WHERE id = ?`,
        [id]
    );
}

export async function finishPastEvents() {
    const [result] = await db.query(
        `
        UPDATE events
        SET status = 'finished', updated_at = NOW()
        WHERE status = 'published'
          AND DATE(event_date) < DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))
        `
    );
    return result.affectedRows;
}