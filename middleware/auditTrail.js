import { logActivity } from "../lib/services/auditlogService.js";

/**
 * Audit trail otomatis untuk SEMUA aktivitas customer & admin.
 *
 * Dipasang global di app.js. Setelah response selesai, middleware ini mencatat:
 *  - setiap request yang mengubah data (POST/PUT/PATCH/DELETE) yang sukses,
 *  - login (berhasil maupun gagal), register,
 *  - percobaan akses terlarang (403) oleh user yang sudah login,
 *  - callback pembayaran dari Midtrans (aktor "system"),
 *  - opsional: akses baca (GET) oleh admin bila AUDIT_LOG_READS=true.
 *
 * Request yang sudah dicatat manual lewat logActivity({ req, ... }) dilewati
 * (req.auditLogged) agar tidak ada entri ganda.
 */

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ADMIN_ROLES = new Set(["admin", "superadmin"]);
const LOG_READS = process.env.AUDIT_LOG_READS === "true";
const READ_EXCLUDED = ["/audit-logs", "/dashboard", "/notifications"];

const SENSITIVE_KEYS = [
    "password",
    "token",
    "secret",
    "authorization",
    "signature",
    "server_key",
    "otp",
    "pin",
    "cvv",
    "card",
];

const ENTITY_BY_BASE = {
    "/auth": "user",
    "/users": "user",
    "/categories": "category",
    "/events": "event",
    "/ticket-categories": "ticket_category",
    "/event-ticket-categories": "event_ticket_category",
    "/event-ticket-areas": "event_ticket_area",
    "/event-ticket-benefits": "event_ticket_benefit",
    "/event-ticket-rules": "event_ticket_rule",
    "/vouchers": "voucher",
    "/orders": "order",
    "/payments": "payment",
    "/tickets": "ticket",
    "/redemptions": "redemption",
    "/notifications": "notification",
    "/reminders": "event_reminder",
    "/settings": "settings",
};

const ENTITY_LABEL = {
    user: "user",
    category: "kategori",
    event: "event",
    ticket_category: "kategori tiket",
    event_ticket_category: "kategori tiket event",
    event_ticket_area: "area tiket event",
    event_ticket_benefit: "benefit tiket event",
    event_ticket_rule: "aturan tiket event",
    voucher: "voucher",
    order: "order",
    payment: "pembayaran",
    ticket: "tiket",
    redemption: "penukaran tiket",
    notification: "notifikasi",
    event_reminder: "pengingat event",
    settings: "pengaturan",
};

// Aksi khusus: "METHOD /base/route" -> { action, description }
const SPECIAL = {
    "POST /auth/login": { action: "LOGIN", description: "Login" },
    "POST /auth/register": { action: "REGISTER", description: "Registrasi akun baru" },
    "PUT /users/me": { action: "UPDATE_PROFILE", description: "Memperbarui profil" },
    "PUT /users/me/password": { action: "CHANGE_PASSWORD", description: "Mengubah password" },
    "POST /users/me/avatar": { action: "UPLOAD_AVATAR", description: "Mengunggah foto profil" },
    "POST /users/me/cover": { action: "UPLOAD_COVER", description: "Mengunggah foto sampul" },
    "PUT /users/:id/role": { action: "UPDATE_USER_ROLE", description: "Mengubah role user" },
    "PUT /users/:id/status": { action: "UPDATE_USER_STATUS", description: "Mengubah status aktif user" },
    "POST /vouchers/redeem": { action: "REDEEM_VOUCHER", description: "Menukar voucher" },
    "POST /vouchers/validate": { action: "VALIDATE_VOUCHER", description: "Memvalidasi voucher" },
    "POST /payments": { action: "CREATE_PAYMENT", description: "Membuat pembayaran" },
    "POST /payments/callback": { action: "PAYMENT_CALLBACK", description: "Callback pembayaran dari Midtrans" },
    "PUT /orders/cancel/:id": { action: "CANCEL_ORDER", description: "Membatalkan order" },
    "POST /redemptions": { action: "REDEEM_TICKET", description: "Menukar/memindai tiket" },
    "POST /reminders/:eventId": { action: "TOGGLE_EVENT_REMINDER", description: "Mengubah pengingat event" },
    "PUT /notifications/read-all": { action: "READ_ALL_NOTIFICATIONS", description: "Menandai semua notifikasi dibaca" },
};

const VERB = {
    POST: { code: "CREATE", label: "Membuat" },
    PUT: { code: "UPDATE", label: "Memperbarui" },
    PATCH: { code: "UPDATE", label: "Memperbarui" },
    DELETE: { code: "DELETE", label: "Menghapus" },
    GET: { code: "VIEW", label: "Melihat" },
};

const redact = (value, depth = 0) => {
    if (value == null || depth > 4) return value;

    if (Array.isArray(value)) {
        return value.slice(0, 50).map((v) => redact(v, depth + 1));
    }

    if (typeof value === "object") {
        const out = {};
        for (const [key, val] of Object.entries(value)) {
            const lower = key.toLowerCase();
            out[key] = SENSITIVE_KEYS.some((s) => lower.includes(s))
                ? "[REDACTED]"
                : redact(val, depth + 1);
        }
        return out;
    }

    if (typeof value === "string" && value.length > 500) {
        return `${value.slice(0, 500)}…`;
    }

    return value;
};

const buildMetadata = (req, res) => {
    const metadata = {};

    if (req.body && typeof req.body === "object" && Object.keys(req.body).length) {
        const body = redact(req.body);
        const json = JSON.stringify(body);
        if (json.length > 4000) {
            metadata.body = "[TRUNCATED]";
        } else {
            metadata.body = body;
        }
    }

    if (req.query && Object.keys(req.query).length) {
        metadata.query = redact(req.query);
    }

    if (req.params && Object.keys(req.params).length) {
        metadata.params = req.params;
    }

    if (req.file) {
        metadata.file = {
            name: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
        };
    }

    if (res.statusCode >= 400 && res.locals.errorMessage) {
        metadata.error = res.locals.errorMessage;
    }

    return Object.keys(metadata).length ? metadata : null;
};

const resolveRoute = (req) => {
    const base = req.baseUrl || "";
    const routePath = req.route?.path && req.route.path !== "/" ? req.route.path : "";
    const pattern = `${base}${routePath}` || req.path;
    return { base, pattern };
};

const resolveActor = (req, res, responseBody) => {
    if (req.user) return req.user;

    // Login/register: user belum lewat authMiddleware, ambil dari response.
    const data = responseBody?.data;
    const candidate = data?.user ?? data;
    if (candidate?.id && candidate?.username) {
        return {
            id: candidate.id,
            username: candidate.username,
            role: candidate.role ?? "customer",
        };
    }

    return null;
};

export const auditTrail = (req, res, next) => {
    // Tangkap body response (untuk id entitas baru & aktor login).
    let responseBody = null;
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        responseBody = body;
        return originalJson(body);
    };

    res.on("finish", () => {
        try {
            if (req.auditLogged) return;

            const method = req.method;
            const status = res.statusCode;
            const { base, pattern } = resolveRoute(req);
            const key = `${method} ${pattern}`;
            const isSystemCallback = key === "POST /payments/callback";
            const isLogin = key === "POST /auth/login";

            const isMutating = MUTATING.has(method);
            const isRead =
                LOG_READS &&
                method === "GET" &&
                ADMIN_ROLES.has(req.user?.role) &&
                !READ_EXCLUDED.some((p) => req.originalUrl.startsWith(p));

            if (!isMutating && !isRead) return;

            const success = status < 400;
            const forbidden = status === 403 && req.user;

            // Yang dicatat: sukses, login gagal, callback sistem, atau akses terlarang.
            if (!success && !isLogin && !isSystemCallback && !forbidden) return;
            // Request tanpa route yang cocok (404) tidak dicatat.
            if (!req.route && !isLogin) return;

            const special = SPECIAL[key];
            const entityType = ENTITY_BY_BASE[base] ?? (base.replace(/^\//, "") || "unknown");
            const entityLabel = ENTITY_LABEL[entityType] ?? entityType;
            const verb = VERB[method] ?? VERB.POST;

            let action = special?.action ?? `${verb.code}_${entityType.toUpperCase()}`;
            let description = special?.description ?? `${verb.label} ${entityLabel}`;

            let actor = resolveActor(req, res, responseBody);

            if (isSystemCallback) {
                actor = { id: null, username: "midtrans", role: "system" };
            }

            if (isLogin && !success) {
                action = "LOGIN_FAILED";
                description = `Login gagal${req.body?.email ? ` untuk email "${req.body.email}"` : ""}`;
            } else if (forbidden) {
                action = `FORBIDDEN_${action}`;
                description = `Akses ditolak: ${description.toLowerCase()}`;
            } else if (!success) {
                action = `FAILED_${action}`;
            }

            // Id entitas: dari params, atau dari response (data baru dibuat).
            const params = req.params ?? {};
            const entityId =
                params.id ??
                params.orderId ??
                params.eventId ??
                responseBody?.data?.id ??
                (entityType === "user" && !special?.action?.startsWith("UPDATE_USER") ? actor?.id : null) ??
                null;

            if (entityId != null && base !== "/auth" && !description.includes("#")) {
                description = `${description} #${entityId}`;
            }

            logActivity({
                actor,
                action,
                entityType,
                entityId,
                description,
                req,
                statusCode: status,
                metadata: buildMetadata(req, res),
            });
        } catch (error) {
            console.error("auditTrail error:", error);
        }
    });

    next();
};

export default auditTrail;
