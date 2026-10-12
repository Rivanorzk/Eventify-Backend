import db from "../../config/database.js";

// =====================================================
// CUSTOMER (PRD 25)
//   Total Order, Order Pending, Order Berhasil, Total Tiket
// =====================================================
export const getCustomerStats = async (customerId) => {

    const [[orderStats]] = await db.query(
        `
        SELECT
            COUNT(*) AS total_order,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)
                AS order_pending,
            SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)
                AS order_berhasil
        FROM orders
        WHERE customer_id = ?
        `,
        [customerId]
    );

    const [[ticketStats]] = await db.query(
        `
        SELECT
            COUNT(*) AS total_tiket
        FROM tickets t
        JOIN order_details od
            ON t.order_detail_id = od.id
        JOIN orders o
            ON od.order_id = o.id
        JOIN events e
            ON o.event_id = e.id
        WHERE o.customer_id = ?
            AND t.status = 'active'
            AND e.status != 'cancelled'
            AND TIMESTAMP(e.event_date, e.start_time) >= NOW()
        `,
        [customerId]
    );

    return {
        total_order: Number(orderStats?.total_order || 0),
        order_pending: Number(orderStats?.order_pending || 0),
        order_berhasil: Number(orderStats?.order_berhasil || 0),
        total_tiket: Number(ticketStats?.total_tiket || 0),
    };

};

// =====================================================
// ADMIN (PRD 26)
//   Total Event, Total Tiket Terjual, Total Transaksi,
//   Transaksi Berhasil, Pendapatan
//   -> hanya untuk event milik admin ybs (events.admin_id)
// =====================================================
export const getAdminStats = async (adminId, period = "month") => {

    const [[eventStats]] = await db.query(
        `
        SELECT COUNT(*) AS total_event
        FROM events
        WHERE admin_id = ?
        `,
        [adminId]
    );

    const [[orderStats]] = await db.query(
        `
        SELECT
            COUNT(*) AS total_transaksi,
            SUM(CASE WHEN o.status = 'paid' THEN 1 ELSE 0 END)
                AS transaksi_berhasil,
            SUM(CASE WHEN o.status = 'paid' THEN o.final_price ELSE 0 END)
                AS pendapatan
        FROM orders o
        JOIN events e
            ON o.event_id = e.id
        WHERE e.admin_id = ?
        `,
        [adminId]
    );

    const [[ticketStats]] = await db.query(
        `
        SELECT
            COALESCE(SUM(od.quantity), 0) AS total_tiket_terjual
        FROM order_details od
        JOIN orders o
            ON od.order_id = o.id
        JOIN events e
            ON o.event_id = e.id
        WHERE e.admin_id = ?
            AND o.status = 'paid'
        `,
        [adminId]
    );

    const [[quotaStats]] = await db.query(
        `
        SELECT
            COALESCE(SUM(etc.stock), 0) AS tickets_quota
        FROM event_ticket_categories etc
        JOIN events e
            ON etc.event_id = e.id
        WHERE e.admin_id = ?
        `,
        [adminId]
    );

    const [[remainingStats]] = await db.query(
        `
        SELECT
            COALESCE(SUM(etc.remaining_stock), 0) AS remaining_quota
        FROM event_ticket_categories etc
        JOIN events e
            ON etc.event_id = e.id
        WHERE e.admin_id = ?
        `,
        [adminId]
    );

    const [[checkinStats]] = await db.query(
        `
        SELECT
            COUNT(*) AS checked_in
        FROM tickets t
        JOIN order_details od
            ON t.order_detail_id = od.id
        JOIN orders o
            ON od.order_id = o.id
        JOIN events e
            ON o.event_id = e.id
        WHERE e.admin_id = ?
            AND t.status = 'used'
        `,
        [adminId]
    );

    // --- Tren penjualan periode ini vs periode sebelumnya (untuk badge
    // persentase pertumbuhan di kartu "Total Penjualan Tiket") ---
    const now = new Date();
    let periodStart, periodEnd, prevStart, prevEnd;

    if (period === "30d") {
        periodEnd = now;
        periodStart = new Date(now.getTime() - 30 * 86400000);
        prevEnd = periodStart;
        prevStart = new Date(periodStart.getTime() - 30 * 86400000);
    } else {
        // default "month": bulan kalender berjalan vs bulan kalender lalu
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = now;
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEnd = periodStart;
    }

    const [[currentPeriod]] = await db.query(
        `
        SELECT COALESCE(SUM(o.final_price), 0) AS sales
        FROM orders o
        JOIN events e ON o.event_id = e.id
        WHERE e.admin_id = ?
            AND o.status = 'paid'
            AND o.created_at >= ? AND o.created_at < ?
        `,
        [adminId, periodStart, periodEnd]
    );

    const [[previousPeriod]] = await db.query(
        `
        SELECT COALESCE(SUM(o.final_price), 0) AS sales
        FROM orders o
        JOIN events e ON o.event_id = e.id
        WHERE e.admin_id = ?
            AND o.status = 'paid'
            AND o.created_at >= ? AND o.created_at < ?
        `,
        [adminId, prevStart, prevEnd]
    );

    const currentSales = Number(currentPeriod?.sales || 0);
    const previousSales = Number(previousPeriod?.sales || 0);
    const salesGrowthPercent =
        previousSales > 0
            ? Number((((currentSales - previousSales) / previousSales) * 100).toFixed(1))
            : (currentSales > 0 ? 100 : 0);

    const events = await getAdminEventsSummary(adminId);
    const salesTrend = await getAdminSalesTrend(adminId);
    const categoryBreakdown = await getAdminCategoryBreakdown(adminId);

    return {
        total_event: Number(eventStats?.total_event || 0),
        total_tiket_terjual: Number(ticketStats?.total_tiket_terjual || 0),
        total_transaksi: Number(orderStats?.total_transaksi || 0),
        transaksi_berhasil: Number(orderStats?.transaksi_berhasil || 0),
        pendapatan: Number(orderStats?.pendapatan || 0),

        // Alias & field tambahan, dibutuhkan oleh dashboard EO
        // (app/eo/dashboard/page.js).

        // total_sales & growth di-scope ke periode yang sedang dipilih
        // (toggle "Bulan Ini" / "30 Hari Terakhir"), bukan akumulasi
        // sepanjang masa — supaya badge pertumbuhannya bermakna.
        period,
        total_sales: currentSales,
        total_sales_growth_percent: salesGrowthPercent,

        // tickets_sold & tickets_quota tetap akumulasi sepanjang masa,
        // karena ini menggambarkan pemakaian kapasitas tiket (kuota
        // tidak "reset" tiap bulan).
        tickets_sold: Number(ticketStats?.total_tiket_terjual || 0),
        tickets_quota: Number(quotaStats?.tickets_quota || 0),
        remaining_quota: Number(remainingStats?.remaining_quota || 0),
        checked_in: Number(checkinStats?.checked_in || 0),

        // Daftar event milik admin ini sendiri, lengkap dengan kuota,
        // tiket terjual, dan omzet kotor per event — dipakai section
        // "Event Konser Aktif" di dashboard EO.
        events,

        // Tren penjualan 7 hari terakhir (tiket & omzet per hari),
        // dipakai untuk grafik "Kecepatan Penjualan Tiket".
        sales_trend: salesTrend,

        // Breakdown per kategori tiket (nama kategori asli, bukan
        // VVIP/VIP/Festival A/B/Tribune yang hardcode), dipakai untuk
        // menggantikan grid tier statis di dashboard.
        category_breakdown: categoryBreakdown,

        // Belum ada tabel refund/support-case atau gate-scanner di skema
        // database saat ini, jadi sementara distub kosong/0 supaya UI
        // tidak error. Kalau fitur ini mau benar-benar live, perlu tabel
        // baru (mis. support_cases, gates) + endpoint CRUD-nya.
        support_cases: 0,
        gates: [],
    };

};

// Tren penjualan harian 7 hari terakhir untuk event milik admin ini.
// Query tiket & omzet dipisah (bukan satu query JOIN) supaya omzet
// tidak fan-out ganda ketika satu order punya beberapa baris
// order_details (beberapa kategori tiket sekaligus).
export const getAdminSalesTrend = async (adminId) => {
    const since = new Date(Date.now() - 6 * 86400000);
    since.setHours(0, 0, 0, 0);

    const [ticketRows] = await db.query(
        `
        SELECT
            DATE(o.created_at) AS date,
            COALESCE(SUM(od.quantity), 0) AS tickets_sold
        FROM orders o
        JOIN order_details od ON od.order_id = o.id
        JOIN events e ON o.event_id = e.id
        WHERE e.admin_id = ?
            AND o.status = 'paid'
            AND o.created_at >= ?
        GROUP BY DATE(o.created_at)
        `,
        [adminId, since]
    );

    const [revenueRows] = await db.query(
        `
        SELECT
            DATE(o.created_at) AS date,
            COALESCE(SUM(o.final_price), 0) AS revenue
        FROM orders o
        JOIN events e ON o.event_id = e.id
        WHERE e.admin_id = ?
            AND o.status = 'paid'
            AND o.created_at >= ?
        GROUP BY DATE(o.created_at)
        `,
        [adminId, since]
    );

    const ticketsByDate = new Map(
        ticketRows.map((r) => [
            new Date(r.date).toISOString().slice(0, 10),
            Number(r.tickets_sold || 0),
        ])
    );
    const revenueByDate = new Map(
        revenueRows.map((r) => [
            new Date(r.date).toISOString().slice(0, 10),
            Number(r.revenue || 0),
        ])
    );

    // Isi 7 hari penuh (termasuk hari tanpa penjualan = 0), supaya
    // frontend tidak perlu menebak tanggal yang hilang.
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days.push({
            date: key,
            tickets_sold: ticketsByDate.get(key) || 0,
            revenue: revenueByDate.get(key) || 0,
        });
    }

    return days;
};

// Breakdown per kategori tiket (nama kategori riil dari ticket_categories),
// diagregasi lintas semua event milik admin ini.
export const getAdminCategoryBreakdown = async (adminId) => {
    const [rows] = await db.query(
        `
        SELECT
            tc.category_name,
            COALESCE(SUM(etc.stock), 0) AS quota,
            COALESCE(SUM(etc.stock - etc.remaining_stock), 0) AS sold
        FROM event_ticket_categories etc
        JOIN events e ON etc.event_id = e.id
        JOIN ticket_categories tc ON etc.ticket_category_id = tc.id
        WHERE e.admin_id = ?
        GROUP BY tc.category_name
        ORDER BY sold DESC
        `,
        [adminId]
    );

    return rows.map((row) => {
        const quota = Number(row.quota || 0);
        const sold = Number(row.sold || 0);
        return {
            category_name: row.category_name,
            quota,
            sold,
            percent: quota > 0 ? Math.round((sold / quota) * 100) : 0,
        };
    });
};

// Event milik admin tertentu + agregat kuota/terjual/omzet, dipakai
// untuk panel "Event Konser Aktif" di dashboard EO. Pakai correlated
// subquery (bukan JOIN + GROUP BY) supaya tidak fan-out saat sebuah
// event punya banyak kategori tiket / banyak order.
export const getAdminEventsSummary = async (adminId) => {
    const [rows] = await db.query(
        `
        SELECT
            e.id,
            e.admin_id,
            e.category_id,
            c.category_name,
            e.title,
            e.location,
            e.poster,
            e.event_date,
            e.start_time,
            e.status,

            (
                SELECT COALESCE(SUM(etc.stock), 0)
                FROM event_ticket_categories etc
                WHERE etc.event_id = e.id
            ) AS quota,

            (
                SELECT COALESCE(SUM(od.quantity), 0)
                FROM order_details od
                JOIN orders o ON od.order_id = o.id
                WHERE o.event_id = e.id
                    AND o.status = 'paid'
            ) AS tickets_sold,

            (
                SELECT COALESCE(SUM(o.final_price), 0)
                FROM orders o
                WHERE o.event_id = e.id
                    AND o.status = 'paid'
            ) AS gross_revenue

        FROM events e
        LEFT JOIN categories c
            ON c.id = e.category_id
        WHERE e.admin_id = ?
        ORDER BY e.created_at DESC
        `,
        [adminId]
    );

    return rows.map((row) => ({
        ...row,
        quota: Number(row.quota || 0),
        tickets_sold: Number(row.tickets_sold || 0),
        gross_revenue: Number(row.gross_revenue || 0),
    }));
};

// =====================================================
// SUPERADMIN (PRD 27)
//   Total Customer, Total Admin, Total Event,
//   Total Tiket Terjual, Total Transaksi, Total Pendapatan
//   -> seluruh sistem
// =====================================================
// -----------------------------------------------------
// Helper untuk dashboard superadmin
// -----------------------------------------------------
const growthPercent = (current, previous) =>
    previous > 0
        ? Number((((current - previous) / previous) * 100).toFixed(1))
        : (current > 0 ? 100 : 0);

// "month" = bulan kalender berjalan vs bulan lalu,
// "30d"   = 30 hari terakhir vs 30 hari sebelumnya.
const getPeriodRange = (period) => {
    const now = new Date();
    if (period === "30d") {
        const periodStart = new Date(now.getTime() - 30 * 86400000);
        return {
            periodStart,
            periodEnd: now,
            prevStart: new Date(periodStart.getTime() - 30 * 86400000),
            prevEnd: periodStart,
        };
    }
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
        periodStart,
        periodEnd: now,
        prevStart: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        prevEnd: periodStart,
    };
};

const startOfDayDaysAgo = (n) => {
    const d = new Date(Date.now() - n * 86400000);
    d.setHours(0, 0, 0, 0);
    return d;
};

const formatUptime = (seconds) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}h ${h}j`;
    if (h > 0) return `${h}j ${m}m`;
    return `${m}m`;
};

export const getSuperadminStats = async (period = "month") => {

    const { periodStart, periodEnd, prevStart, prevEnd } = getPeriodRange(period);
    const since30d = new Date(Date.now() - 30 * 86400000);

    // Ping DB dijalankan sendiri (bukan di dalam Promise.all) supaya
    // latensinya tidak terinflasi antrean pool koneksi.
    const dbStart = Date.now();
    await db.query("SELECT 1");
    const dbLatencyMs = Date.now() - dbStart;

    const [
        [[userStats]],
        [[eventStats]],
        [[orderStats]],
        [[ticketStats]],
        [[usedStats]],
        [gmvRows],
        [newUserRows],
        [topOrganizerRows],
        [draftEventRows],
        [auditRows],
        [categoryRows],
        [recentTransactionRows],
    ] = await Promise.all([
        // Pengguna: total, per role, organizer aktif, pendaftar baru
        db.query(
            `
            SELECT
                COUNT(*) AS total_users,
                SUM(CASE WHEN role = 'customer' THEN 1 ELSE 0 END) AS total_customer,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS total_admin,
                SUM(CASE WHEN role = 'admin' AND is_active = 1 THEN 1 ELSE 0 END) AS active_admin,
                SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) AS new_users,
                SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) AS prev_new_users
            FROM users
            `,
            [periodStart, periodEnd, prevStart, prevEnd]
        ),

        // Event per status
        db.query(
            `
            SELECT
                COUNT(*) AS total_event,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_events,
                SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published_events
            FROM events
            `
        ),

        // Order: total sepanjang masa, GMV periode ini vs sebelumnya,
        // dan rasio order berhasil 30 hari terakhir
        db.query(
            `
            SELECT
                COUNT(*) AS total_transaksi,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN grand_total ELSE 0 END), 0)
                    AS total_pendapatan,
                COALESCE(SUM(CASE WHEN status = 'paid'
                    AND created_at >= ? AND created_at < ? THEN grand_total ELSE 0 END), 0)
                    AS gmv,
                COALESCE(SUM(CASE WHEN status = 'paid'
                    AND created_at >= ? AND created_at < ? THEN grand_total ELSE 0 END), 0)
                    AS prev_gmv,
                COALESCE(SUM(CASE WHEN status = 'paid'
                    AND created_at >= ? AND created_at < ? THEN service_fee ELSE 0 END), 0)
                    AS service_fee_collected,
                SUM(CASE WHEN status = 'paid' AND created_at >= ? THEN 1 ELSE 0 END)
                    AS paid_30d,
                SUM(CASE WHEN status <> 'pending' AND created_at >= ? THEN 1 ELSE 0 END)
                    AS settled_30d
            FROM orders
            `,
            [periodStart, periodEnd, prevStart, prevEnd, periodStart, periodEnd, since30d, since30d]
        ),

        db.query(
            `
            SELECT COALESCE(SUM(od.quantity), 0) AS total_tiket_terjual
            FROM order_details od
            JOIN orders o ON od.order_id = o.id
            WHERE o.status = 'paid'
            `
        ),

        db.query(`SELECT COUNT(*) AS used FROM tickets WHERE status = 'used'`),

        // Tren 7 hari: GMV harian & user baru harian
        db.query(
            `
            SELECT
                DATE_FORMAT(created_at, '%Y-%m-%d') AS date,
                COALESCE(SUM(grand_total), 0) AS gmv
            FROM orders
            WHERE status = 'paid' AND created_at >= ?
            GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
            `,
            [startOfDayDaysAgo(6)]
        ),
        db.query(
            `
            SELECT
                DATE_FORMAT(created_at, '%Y-%m-%d') AS date,
                COUNT(*) AS new_users
            FROM users
            WHERE created_at >= ?
            GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
            `,
            [startOfDayDaysAgo(6)]
        ),

        // Top 5 organizer (akun role admin yang menginput event) berdasarkan
        // total penjualan tiket pada periode terpilih (harga tiket setelah
        // diskon, tanpa biaya layanan). Correlated subquery supaya tidak
        // fan-out saat JOIN banyak tabel.
        db.query(
            `
            SELECT
                u.id,
                u.username,
                u.is_active,
                (
                    SELECT COUNT(*) FROM events e WHERE e.admin_id = u.id
                ) AS event_count,
                (
                    SELECT COALESCE(SUM(od.quantity), 0)
                    FROM order_details od
                    JOIN orders o ON od.order_id = o.id
                    JOIN events e ON o.event_id = e.id
                    WHERE e.admin_id = u.id
                        AND o.status = 'paid'
                        AND o.created_at >= ? AND o.created_at < ?
                ) AS tickets_sold,
                (
                    SELECT COALESCE(SUM(o.final_price), 0)
                    FROM orders o
                    JOIN events e ON o.event_id = e.id
                    WHERE e.admin_id = u.id
                        AND o.status = 'paid'
                        AND o.created_at >= ? AND o.created_at < ?
                ) AS total_sales
            FROM users u
            WHERE u.role = 'admin'
            ORDER BY total_sales DESC, tickets_sold DESC
            LIMIT 5
            `,
            [periodStart, periodEnd, periodStart, periodEnd]
        ),

        // Event berstatus draft (belum dipublikasikan)
        db.query(
            `
            SELECT
                e.id,
                e.title,
                e.event_date,
                e.created_at AS submitted_at,
                u.username AS organizer_name
            FROM events e
            JOIN users u ON e.admin_id = u.id
            WHERE e.status = 'draft'
            ORDER BY e.created_at DESC
            LIMIT 10
            `
        ),

        db.query(
            `
            SELECT
                id, actor_username, actor_role, action,
                entity_type, entity_id, description, created_at
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT 6
            `
        ),

        // Breakdown kategori tiket lintas seluruh organizer
        db.query(
            `
            SELECT
                tc.category_name,
                COALESCE(SUM(etc.stock), 0) AS quota,
                COALESCE(SUM(etc.stock - etc.remaining_stock), 0) AS sold
            FROM event_ticket_categories etc
            JOIN ticket_categories tc ON etc.ticket_category_id = tc.id
            GROUP BY tc.category_name
            ORDER BY sold DESC
            LIMIT 5
            `
        ),
        // 5 transaksi berhasil terbaru di seluruh platform
        db.query(
            `
            SELECT
                o.id,
                o.invoice_number,
                e.title AS event_title,
                u.username AS customer_name,
                o.service_fee,
                o.grand_total,
                o.created_at
            FROM orders o
            JOIN events e ON o.event_id = e.id
            JOIN users u ON o.customer_id = u.id
            WHERE o.status = 'paid'
            ORDER BY o.created_at DESC
            LIMIT 5
            `
        ),
    ]);

    // ---- Tren 7 hari (isi hari kosong dengan 0) ----
    const gmvByDate = new Map(gmvRows.map((r) => [r.date, Number(r.gmv || 0)]));
    const usersByDate = new Map(newUserRows.map((r) => [r.date, Number(r.new_users || 0)]));

    const platformTrend = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        platformTrend.push({
            date: key,
            total_sales: gmvByDate.get(key) || 0,
            gmv: gmvByDate.get(key) || 0,
            new_users: usersByDate.get(key) || 0,
        });
    }

    const gmv = Number(orderStats?.gmv || 0);
    const prevGmv = Number(orderStats?.prev_gmv || 0);
    const newUsers = Number(userStats?.new_users || 0);
    const prevNewUsers = Number(userStats?.prev_new_users || 0);
    const paid30d = Number(orderStats?.paid_30d || 0);
    const settled30d = Number(orderStats?.settled_30d || 0);
    const ticketsSold = Number(ticketStats?.total_tiket_terjual || 0);
    const ticketsUsed = Number(usedStats?.used || 0);

    return {
        // --- Field lama (dipertahankan supaya konsumen lain tidak rusak) ---
        total_customer: Number(userStats?.total_customer || 0),
        total_admin: Number(userStats?.total_admin || 0),
        total_event: Number(eventStats?.total_event || 0),
        total_tiket_terjual: ticketsSold,
        total_transaksi: Number(orderStats?.total_transaksi || 0),
        total_pendapatan: Number(orderStats?.total_pendapatan || 0),

        // --- Field untuk app/superadmin/dashboard/page.js ---
        period,
        // "Total Transaksi" = uang yang dibayar customer (harga tiket setelah
        // diskon + biaya layanan) pada periode terpilih; "Biaya Layanan" =
        // bagian platform dari total itu.
        total_sales: gmv,
        total_sales_growth_percent: growthPercent(gmv, prevGmv),
        service_fee_collected: Number(orderStats?.service_fee_collected || 0),
        tickets_sold: ticketsSold,
        gmv,
        gmv_growth_percent: growthPercent(gmv, prevGmv),

        total_users: Number(userStats?.total_users || 0),
        new_users: newUsers,
        new_users_growth_percent: growthPercent(newUsers, prevNewUsers),

        total_organizers: Number(userStats?.total_admin || 0),
        active_organizers: Number(userStats?.active_admin || 0),

        // Skema belum punya status verifikasi organizer maupun tabel
        // laporan, jadi dua angka ini memang 0 (bukan data palsu).
        pending_organizers: 0,
        open_reports: 0,

        // Sementara "moderasi" = event yang masih draft.
        pending_moderation: Number(eventStats?.draft_events || 0),
        published_events: Number(eventStats?.published_events || 0),

        platform_trend: platformTrend,

        top_organizers: topOrganizerRows.map((r) => ({
            id: r.id,
            username: r.username,
            status: r.is_active ? "active" : "suspended",
            event_count: Number(r.event_count || 0),
            tickets_sold: Number(r.tickets_sold || 0),
            total_sales: Number(r.total_sales || 0),
            gmv: Number(r.total_sales || 0),
        })),
        recent_transactions: recentTransactionRows.map((r) => ({
            id: r.id,
            invoice_number: r.invoice_number,
            event_title: r.event_title,
            customer_name: r.customer_name,
            service_fee: Number(r.service_fee || 0),
            grand_total: Number(r.grand_total || 0),
            created_at: r.created_at,
        })),

        pending_events: draftEventRows,

        audit_logs: auditRows.map((r) => ({
            id: r.id,
            action: r.action,
            actor: r.actor_username,
            target: r.description || `${r.entity_type} #${r.entity_id}`,
            created_at: r.created_at,
        })),

        category_breakdown: categoryRows.map((r) => {
            const quota = Number(r.quota || 0);
            const sold = Number(r.sold || 0);
            return {
                category_name: r.category_name,
                quota,
                sold,
                percent: quota > 0 ? Math.round((sold / quota) * 100) : 0,
            };
        }),

        // Metrik yang benar-benar bisa diukur dari sistem ini.
        health: {
            status: "operational",
            items: [
                {
                    label: "API Server",
                    display: formatUptime(process.uptime()),
                    note: "uptime proses",
                    percent: null,
                },
                {
                    label: "Database",
                    display: `${dbLatencyMs} ms`,
                    note: "latensi query",
                    percent: null,
                },
                {
                    label: "Pembayaran Berhasil",
                    display: settled30d > 0
                        ? `${Number(((paid30d / settled30d) * 100).toFixed(1))}%`
                        : "—",
                    note: "order paid vs selesai, 30 hari",
                    percent: settled30d > 0 ? Math.round((paid30d / settled30d) * 100) : null,
                },
                {
                    label: "Tiket Sudah Check-in",
                    display: ticketsSold > 0
                        ? `${Number(((ticketsUsed / ticketsSold) * 100).toFixed(1))}%`
                        : "—",
                    note: `${ticketsUsed} dari ${ticketsSold} tiket`,
                    percent: ticketsSold > 0 ? Math.round((ticketsUsed / ticketsSold) * 100) : null,
                },
            ],
        },
    };

};

// =====================================================
// EVENT ANALYTICS (halaman app/admin/events/[id]/analytics/page.js)
//   Ringkasan, tren penjualan, breakdown tier, transaksi terbaru
//   -> discope ke satu event tertentu (bukan seluruh event admin)
// =====================================================
export const getEventAnalytics = async (eventId, range = "all") => {

    // "range" dipakai untuk lebar jendela tren & perbandingan
    // pertumbuhan pendapatan (vs periode sebelumnya dengan panjang
    // yang sama). "all" tetap memakai jendela tren 30 hari terakhir
    // supaya grafik tidak perlu menampilkan ratusan titik data untuk
    // event yang sudah berjalan lama; ringkasan (total pendapatan,
    // tiket terjual, dst) tetap dihitung dari seluruh riwayat.
    const days = range === "7d" ? 7 : 30;

    const [[orderStats]] = await db.query(
        `
        SELECT
            COUNT(*) AS total_orders,
            COALESCE(SUM(final_price), 0) AS total_revenue
        FROM orders
        WHERE event_id = ?
            AND status = 'paid'
        `,
        [eventId]
    );

    const [[ticketStats]] = await db.query(
        `
        SELECT
            COALESCE(SUM(od.quantity), 0) AS tickets_sold
        FROM order_details od
        JOIN orders o ON od.order_id = o.id
        WHERE o.event_id = ?
            AND o.status = 'paid'
        `,
        [eventId]
    );

    const [[quotaStats]] = await db.query(
        `
        SELECT COALESCE(SUM(stock), 0) AS tickets_quota
        FROM event_ticket_categories
        WHERE event_id = ?
        `,
        [eventId]
    );

    const [[checkinStats]] = await db.query(
        `
        SELECT COUNT(*) AS checked_in
        FROM tickets t
        JOIN order_details od ON t.order_detail_id = od.id
        JOIN orders o ON od.order_id = o.id
        WHERE o.event_id = ?
            AND t.status = 'used'
        `,
        [eventId]
    );

    // --- Pertumbuhan pendapatan: periode terpilih vs periode
    // sebelumnya dengan panjang yang sama ---
    const now = new Date();
    const periodEnd = now;
    const periodStart = new Date(now.getTime() - days * 86400000);
    const prevEnd = periodStart;
    const prevStart = new Date(periodStart.getTime() - days * 86400000);

    const [[currentPeriod]] = await db.query(
        `
        SELECT COALESCE(SUM(final_price), 0) AS revenue
        FROM orders
        WHERE event_id = ?
            AND status = 'paid'
            AND created_at >= ? AND created_at < ?
        `,
        [eventId, periodStart, periodEnd]
    );

    const [[previousPeriod]] = await db.query(
        `
        SELECT COALESCE(SUM(final_price), 0) AS revenue
        FROM orders
        WHERE event_id = ?
            AND status = 'paid'
            AND created_at >= ? AND created_at < ?
        `,
        [eventId, prevStart, prevEnd]
    );

    const currentRevenue = Number(currentPeriod?.revenue || 0);
    const previousRevenue = Number(previousPeriod?.revenue || 0);
    const revenueGrowthPercent =
        previousRevenue > 0
            ? Number((((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1))
            : (currentRevenue > 0 ? 100 : 0);

    const totalOrders = Number(orderStats?.total_orders || 0);
    const totalRevenue = Number(orderStats?.total_revenue || 0);

    const [salesTrend, tierBreakdown, recentOrders] = await Promise.all([
        getEventSalesTrend(eventId, days),
        getEventTierBreakdown(eventId),
        getEventRecentOrders(eventId),
    ]);

    return {
        summary: {
            total_revenue: totalRevenue,
            revenue_growth_percent: revenueGrowthPercent,
            tickets_sold: Number(ticketStats?.tickets_sold || 0),
            tickets_quota: Number(quotaStats?.tickets_quota || 0),
            checked_in: Number(checkinStats?.checked_in || 0),
            total_orders: totalOrders,
            avg_order_value: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
        },
        sales_trend: salesTrend,
        tier_breakdown: tierBreakdown,
        recent_orders: recentOrders,

        // Skema database saat ini tidak punya kolom lokasi/kota untuk
        // users maupun orders, jadi belum ada sumber data untuk ini.
        // Distub kosong supaya UI tidak error, sama seperti
        // support_cases/gates yang di-stub di getAdminStats().
        buyer_locations: [],
    };

};

// Tren penjualan harian untuk satu event (mengikuti pola
// getAdminSalesTrend, tapi discope per event_id bukan admin_id).
export const getEventSalesTrend = async (eventId, days = 30) => {
    const since = new Date(Date.now() - (days - 1) * 86400000);
    since.setHours(0, 0, 0, 0);

    const [ticketRows] = await db.query(
        `
        SELECT
            DATE(o.created_at) AS date,
            COALESCE(SUM(od.quantity), 0) AS tickets_sold
        FROM orders o
        JOIN order_details od ON od.order_id = o.id
        WHERE o.event_id = ?
            AND o.status = 'paid'
            AND o.created_at >= ?
        GROUP BY DATE(o.created_at)
        `,
        [eventId, since]
    );

    const [revenueRows] = await db.query(
        `
        SELECT
            DATE(o.created_at) AS date,
            COALESCE(SUM(o.final_price), 0) AS revenue
        FROM orders o
        WHERE o.event_id = ?
            AND o.status = 'paid'
            AND o.created_at >= ?
        GROUP BY DATE(o.created_at)
        `,
        [eventId, since]
    );

    const ticketsByDate = new Map(
        ticketRows.map((r) => [
            new Date(r.date).toISOString().slice(0, 10),
            Number(r.tickets_sold || 0),
        ])
    );
    const revenueByDate = new Map(
        revenueRows.map((r) => [
            new Date(r.date).toISOString().slice(0, 10),
            Number(r.revenue || 0),
        ])
    );

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        result.push({
            date: key,
            tickets_sold: ticketsByDate.get(key) || 0,
            revenue: revenueByDate.get(key) || 0,
        });
    }

    return result;
};

// Breakdown per tier tiket milik event ini: harga, kuota, terjual
// (dihitung dari order_details pada order yang sudah 'paid', bukan
// dari stock - remaining_stock, supaya konsisten walau ada tiket yang
// sedang dipesan tapi belum dibayar), dan pendapatan.
export const getEventTierBreakdown = async (eventId) => {
    const [rows] = await db.query(
        `
        SELECT
            etc.id,
            tc.category_name AS name,
            etc.price,
            etc.stock AS quota,
            COALESCE(agg.sold, 0) AS sold,
            COALESCE(agg.revenue, 0) AS revenue
        FROM event_ticket_categories etc
        JOIN ticket_categories tc
            ON etc.ticket_category_id = tc.id
        LEFT JOIN (
            SELECT
                od.event_ticket_category_id,
                SUM(od.quantity) AS sold,
                SUM(od.subtotal) AS revenue
            FROM order_details od
            JOIN orders o ON od.order_id = o.id
            WHERE o.status = 'paid'
            GROUP BY od.event_ticket_category_id
        ) agg ON agg.event_ticket_category_id = etc.id
        WHERE etc.event_id = ?
        ORDER BY etc.created_at ASC
        `,
        [eventId]
    );

    return rows.map((row) => ({
        ...row,
        price: Number(row.price || 0),
        quota: Number(row.quota || 0),
        sold: Number(row.sold || 0),
        revenue: Number(row.revenue || 0),
    }));
};

// 20 order terakhir untuk satu event (semua status, terbaru dulu).
export const getEventRecentOrders = async (eventId) => {
    const [rows] = await db.query(
        `
        SELECT
            o.id,
            o.invoice_number,
            o.status,
            o.final_price AS total,
            o.created_at,
            u.username AS buyer_name,
            (
                SELECT COALESCE(SUM(od2.quantity), 0)
                FROM order_details od2
                WHERE od2.order_id = o.id
            ) AS quantity,
            (
                SELECT tc2.category_name
                FROM order_details od3
                JOIN event_ticket_categories etc2
                    ON od3.event_ticket_category_id = etc2.id
                JOIN ticket_categories tc2
                    ON etc2.ticket_category_id = tc2.id
                WHERE od3.order_id = o.id
                ORDER BY od3.id ASC
                LIMIT 1
            ) AS tier_name
        FROM orders o
        JOIN users u ON o.customer_id = u.id
        WHERE o.event_id = ?
        ORDER BY o.created_at DESC
        LIMIT 20
        `,
        [eventId]
    );

    return rows.map((row) => ({
        ...row,
        total: Number(row.total || 0),
        quantity: Number(row.quantity || 0),
    }));
};