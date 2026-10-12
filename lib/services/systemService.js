import os from "os";
import db from "../../config/database.js";
import { getRequestMetrics } from "../utils/requestMetrics.js";
import { getSchedulerStatus } from "../utils/scheduler.js";

const TABLES = [
    "users",
    "events",
    "orders",
    "payments",
    "tickets",
    "notifications",
    "event_reminders",
    "audit_logs",
];

const toNumber = (v) => Number(v) || 0;

export const getSystemStatus = async () => {
    const issues = [];

    // ---- Database: ping dulu (terpisah) supaya latensi tidak terinflasi antrean pool ----
    const pingStart = Date.now();
    let dbConnected = true;
    try {
        await db.query("SELECT 1");
    } catch {
        dbConnected = false;
    }
    const dbLatencyMs = Date.now() - pingStart;

    let dbVersion = null;
    let tableCounts = [];
    let paymentStatus7d = [];
    let paymentTypes = [];
    let lastSettlement = null;
    let stuckPending = 0;

    if (dbConnected) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
        const countsSql = `SELECT ${TABLES.map(
            (t) => `(SELECT COUNT(*) FROM ${t}) AS ${t}`
        ).join(", ")}`;

        const [
            [[versionRow]],
            [[countsRow]],
            [statusRows],
            [typeRows],
            [[settlementRow]],
            [[stuckRow]],
        ] = await Promise.all([
            db.query("SELECT VERSION() AS version"),
            db.query(countsSql),
            db.query(
                `
                SELECT p.transaction_status AS status, COUNT(*) AS total
                FROM payments p
                JOIN orders o ON p.order_id = o.id
                WHERE o.created_at >= ?
                GROUP BY p.transaction_status
                ORDER BY total DESC
                `,
                [sevenDaysAgo]
            ),
            db.query(
                `
                SELECT p.payment_type AS type, COUNT(*) AS total
                FROM payments p
                WHERE p.transaction_status IN ('settlement', 'capture')
                    AND p.payment_type IS NOT NULL
                GROUP BY p.payment_type
                ORDER BY total DESC
                LIMIT 6
                `
            ),
            db.query("SELECT MAX(settlement_time) AS last_settlement FROM payments"),
            db.query(
                `
                SELECT COUNT(*) AS total
                FROM payments p
                JOIN orders o ON p.order_id = o.id
                WHERE o.status = 'pending' AND p.expiry_time < ?
                `,
                [new Date()]
            ),
        ]);

        dbVersion = versionRow?.version || null;
        tableCounts = TABLES.map((t) => ({ table: t, rows: toNumber(countsRow?.[t]) }));
        paymentStatus7d = statusRows.map((r) => ({
            status: r.status || "unknown",
            total: toNumber(r.total),
        }));
        paymentTypes = typeRows.map((r) => ({ type: r.type, total: toNumber(r.total) }));
        lastSettlement = settlementRow?.last_settlement || null;
        stuckPending = toNumber(stuckRow?.total);
    }

    // ---- Server ----
    const mem = process.memoryUsage();
    const [load1, load5, load15] = os.loadavg();

    const server = {
        node_version: process.version,
        platform: `${os.platform()} ${os.arch()}`,
        environment: process.env.NODE_ENV || "development",
        pid: process.pid,
        uptime_seconds: Math.round(process.uptime()),
        started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
        cpu_cores: os.cpus().length,
        load_average: {
            m1: Number(load1.toFixed(2)),
            m5: Number(load5.toFixed(2)),
            m15: Number(load15.toFixed(2)),
        },
        memory: {
            rss: mem.rss,
            heap_used: mem.heapUsed,
            heap_total: mem.heapTotal,
            system_total: os.totalmem(),
            system_free: os.freemem(),
        },
    };

    // ---- Traffic, scheduler, integrasi ----
    const traffic = getRequestMetrics();
    const scheduler = getSchedulerStatus();

    const midtransProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const integrations = [
        {
            name: "Midtrans",
            configured: Boolean(process.env.MIDTRANS_SERVER_KEY && process.env.MIDTRANS_CLIENT_KEY),
            detail: midtransProduction ? "Mode production" : "Mode sandbox",
        },
        {
            name: "Cloudinary",
            configured: Boolean(
                process.env.CLOUDINARY_CLOUD_NAME &&
                process.env.CLOUDINARY_API_KEY &&
                process.env.CLOUDINARY_API_SECRET
            ),
            detail: "Penyimpanan gambar",
        },
        {
            name: "JWT Secret",
            configured: Boolean(process.env.JWT_SECRET),
            detail: "Autentikasi token",
        },
        {
            name: "Frontend URL",
            configured: Boolean(process.env.FRONTEND_URL),
            detail: "Redirect setelah pembayaran",
        },
    ];

    // ---- Ringkasan masalah (semua diturunkan dari data di atas) ----
    if (!dbConnected) issues.push("Database tidak dapat dihubungi.");
    else if (dbLatencyMs > 1000) issues.push(`Latensi database tinggi (${dbLatencyMs} ms).`);

    scheduler.forEach((job) => {
        if (job.last_error) issues.push(`Job "${job.name}" gagal pada eksekusi terakhir: ${job.last_error}`);
    });

    if (stuckPending > 0) {
        issues.push(`${stuckPending} pesanan masih pending padahal batas bayarnya sudah lewat.`);
    }
    if (traffic.recent_error_rate_percent >= 5) {
        issues.push(`${traffic.recent_error_rate_percent}% dari 100 request terakhir berstatus 5xx.`);
    }
    integrations
        .filter((i) => !i.configured)
        .forEach((i) => issues.push(`Konfigurasi ${i.name} belum lengkap.`));

    const status = !dbConnected ? "down" : issues.length > 0 ? "degraded" : "operational";

    return {
        generated_at: new Date().toISOString(),
        status,
        issues,
        server,
        database: {
            connected: dbConnected,
            latency_ms: dbLatencyMs,
            version: dbVersion,
            tables: tableCounts,
        },
        traffic,
        payments: {
            mode: midtransProduction ? "production" : "sandbox",
            status_7d: paymentStatus7d,
            methods: paymentTypes,
            last_settlement_at: lastSettlement,
            stuck_pending: stuckPending,
        },
        scheduler,
        integrations,
    };
};