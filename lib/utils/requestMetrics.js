// Metrik request in-memory untuk System Console superadmin.
// Data hanya berlaku untuk proses yang sedang berjalan (reset saat restart/deploy).

const MAX_SAMPLES = 500;
const MAX_ERRORS = 10;

const startedAt = new Date();
const samples = []; // { t, ms, status, key }
const recentErrors = []; // { t, method, path, status, message }
const totals = { all: 0, s2xx: 0, s3xx: 0, s4xx: 0, s5xx: 0 };

const routeKey = (req) => {
    const base = req.baseUrl || "";
    const route = req.route?.path && req.route.path !== "/" ? req.route.path : "";
    return `${req.method} ${base}${route}` || `${req.method} ${req.path}`;
};

export const requestMetrics = (req, res, next) => {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
        // Endpoint console sendiri tidak dihitung supaya tidak menambah noise.
        if (req.originalUrl.startsWith("/dashboard/system")) return;

        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        const status = res.statusCode;
        const key = routeKey(req);

        totals.all += 1;
        if (status >= 500) totals.s5xx += 1;
        else if (status >= 400) totals.s4xx += 1;
        else if (status >= 300) totals.s3xx += 1;
        else totals.s2xx += 1;

        samples.push({ t: Date.now(), ms, status, key });
        if (samples.length > MAX_SAMPLES) samples.shift();

        if (status >= 500) {
            recentErrors.unshift({
                t: new Date().toISOString(),
                method: req.method,
                path: key,
                status,
                message: res.locals.errorMessage || "Internal Server Error",
            });
            if (recentErrors.length > MAX_ERRORS) recentErrors.pop();
        }
    });

    next();
};

const percentile = (sortedValues, p) => {
    if (sortedValues.length === 0) return 0;
    const idx = Math.min(sortedValues.length - 1, Math.ceil((p / 100) * sortedValues.length) - 1);
    return sortedValues[idx];
};

export const getRequestMetrics = () => {
    const durations = samples.map((s) => s.ms).sort((a, b) => a - b);
    const avg = durations.length
        ? durations.reduce((sum, v) => sum + v, 0) / durations.length
        : 0;

    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const lastFive = samples.filter((s) => s.t >= fiveMinAgo).length;

    const byRoute = new Map();
    for (const s of samples) {
        const cur = byRoute.get(s.key) || { route: s.key, count: 0, total_ms: 0, max_ms: 0, errors: 0 };
        cur.count += 1;
        cur.total_ms += s.ms;
        cur.max_ms = Math.max(cur.max_ms, s.ms);
        if (s.status >= 500) cur.errors += 1;
        byRoute.set(s.key, cur);
    }

    const slowestRoutes = [...byRoute.values()]
        .map((r) => ({
            route: r.route,
            count: r.count,
            avg_ms: Math.round(r.total_ms / r.count),
            max_ms: Math.round(r.max_ms),
            errors: r.errors,
        }))
        .sort((a, b) => b.avg_ms - a.avg_ms)
        .slice(0, 5);

    const recent100 = samples.slice(-100);
    const recentErrorRate = recent100.length
        ? Number(((recent100.filter((s) => s.status >= 500).length / recent100.length) * 100).toFixed(1))
        : 0;

    return {
        since: startedAt.toISOString(),
        totals: {
            total: totals.all,
            success_2xx: totals.s2xx,
            redirect_3xx: totals.s3xx,
            client_error_4xx: totals.s4xx,
            server_error_5xx: totals.s5xx,
        },
        sample_size: samples.length,
        avg_ms: Math.round(avg),
        p95_ms: Math.round(percentile(durations, 95)),
        requests_last_5m: lastFive,
        recent_error_rate_percent: recentErrorRate,
        slowest_routes: slowestRoutes,
        recent_errors: recentErrors,
    };
};