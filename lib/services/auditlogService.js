import * as auditLogRepository from "../repositories/auditlogRepository.js";

export const getClientIp = (req) => {
    const forwarded = req?.headers?.["x-forwarded-for"];
    const first = typeof forwarded === "string"
        ? forwarded.split(",")[0].trim()
        : null;

    return (first || req?.ip || req?.socket?.remoteAddress || null)?.slice(0, 64) ?? null;
};

/**
 * Mencatat satu aktivitas. `actor` adalah req.user dari authMiddleware
 * (atau objek { id, username, role } untuk aktor lain / sistem).
 *
 * Jika `req` diberikan, IP, user-agent, method, path ikut tercatat dan
 * request ditandai sudah tercatat (req.auditLogged) sehingga middleware
 * auditTrail otomatis tidak membuat entri ganda.
 */
export const logActivity = async ({
    actor,
    action,
    entityType,
    entityId,
    description,
    req,
    statusCode,
    metadata,
}) => {
    try {
        if (req) req.auditLogged = true;

        await auditLogRepository.create({
            actorId: actor?.id ?? null,
            actorUsername: actor?.username ?? "unknown",
            actorRole: actor?.role ?? "unknown",
            action,
            entityType,
            // Kolom entity_id bertipe INT: nilai non-numerik disimpan sebagai NULL.
            entityId: Number.isInteger(Number(entityId)) && entityId !== null && entityId !== "" ? Number(entityId) : null,
            description: description ?? "",
            ipAddress: req ? getClientIp(req) : null,
            userAgent: req?.headers?.["user-agent"]?.slice(0, 255) ?? null,
            httpMethod: req?.method ?? null,
            requestPath: req?.originalUrl?.split("?")[0]?.slice(0, 255) ?? null,
            statusCode: statusCode ?? null,
            metadata: metadata ?? null,
        });
    } catch (error) {
        // Audit log tidak boleh sampai menggagalkan aksi utama,
        // jadi error di sini cukup dicatat ke console saja.
        console.error("Failed to write audit log:", error);
    }
};

export const getAuditLogs = async (queryParams) => {
    const {
        action,
        entity_type,
        actor_id,
        actor_role,
        method,
        search,
        from,
        to,
        page,
        limit,
    } = queryParams;

    return await auditLogRepository.findAll({
        action,
        entityType: entity_type,
        actorId: actor_id,
        actorRole: actor_role,
        method,
        search,
        from,
        to,
        page,
        limit,
    });
};
