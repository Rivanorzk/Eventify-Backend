import db from "../../config/database.js";

export const create = async ({
    actorId,
    actorUsername,
    actorRole,
    action,
    entityType,
    entityId,
    description,
    ipAddress = null,
    userAgent = null,
    httpMethod = null,
    requestPath = null,
    statusCode = null,
    metadata = null,
}) => {
    const [result] = await db.query(`
        INSERT INTO audit_logs (
            actor_id,
            actor_username,
            actor_role,
            action,
            entity_type,
            entity_id,
            description,
            ip_address,
            user_agent,
            http_method,
            request_path,
            status_code,
            metadata
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        actorId,
        actorUsername,
        actorRole,
        action,
        entityType ?? null,
        entityId ?? null,
        description ?? null,
        ipAddress,
        userAgent,
        httpMethod,
        requestPath,
        statusCode,
        metadata ? JSON.stringify(metadata) : null,
    ]);

    return result.insertId;
};

export const findAll = async ({
    action,
    entityType,
    actorId,
    actorRole,
    method,
    search,
    from,
    to,
    page = 1,
    limit = 20,
} = {}) => {
    const conditions = [];
    const params = [];

    if (action) {
        conditions.push("action = ?");
        params.push(action);
    }

    if (entityType) {
        conditions.push("entity_type = ?");
        params.push(entityType);
    }

    if (actorId) {
        conditions.push("actor_id = ?");
        params.push(Number(actorId));
    }

    if (actorRole) {
        conditions.push("actor_role = ?");
        params.push(actorRole);
    }

    if (method) {
        conditions.push("http_method = ?");
        params.push(String(method).toUpperCase());
    }

    if (search) {
        conditions.push("(description LIKE ? OR actor_username LIKE ?)");
        params.push(`%${search}%`, `%${search}%`);
    }

    if (from) {
        conditions.push("created_at >= ?");
        params.push(from);
    }

    if (to) {
        // Tanggal polos (YYYY-MM-DD) dianggap inklusif sampai akhir hari.
        conditions.push("created_at < DATE_ADD(?, INTERVAL 1 DAY)");
        params.push(to);
    }

    const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const [rows] = await db.query(`
        SELECT
            id,
            actor_id,
            actor_username,
            actor_role,
            action,
            entity_type,
            entity_id,
            description,
            ip_address,
            user_agent,
            http_method,
            request_path,
            status_code,
            metadata,
            created_at
        FROM audit_logs
        ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?
    `, [...params, safeLimit, offset]);

    const [countRows] = await db.query(`
        SELECT COUNT(*) AS total
        FROM audit_logs
        ${whereClause}
    `, params);

    return {
        rows,
        total: countRows[0].total,
        page: safePage,
        limit: safeLimit,
    };
};
