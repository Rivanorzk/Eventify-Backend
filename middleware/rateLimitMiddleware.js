// Rate limiter sederhana di memori (tanpa dependency tambahan).
// Catatan: counter hilang saat server restart dan tidak dibagi antar instance.

export const createRateLimit = ({ windowMs, max, keyGenerator, message }) => {
    const hits = new Map();

    // Bersihkan entri yang sudah kedaluwarsa supaya Map tidak membengkak.
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) {
            if (entry.resetAt <= now) hits.delete(key);
        }
    }, windowMs).unref();

    return (req, res, next) => {
        const key = keyGenerator(req);
        const now = Date.now();

        let entry = hits.get(key);

        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
            hits.set(key, entry);
        }

        entry.count += 1;

        if (entry.count > max) {
            res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));

            return res.status(429).json({
                success: false,
                message
            });
        }

        next();
    };
};

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const TOO_MANY = "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.";

const clientIp = (req) => req.ip || req.socket?.remoteAddress || "unknown";

const emailKey = (req) =>
    String(req.body?.email || "").trim().toLowerCase() || clientIp(req);

// Batasi per IP
export const forgotPasswordIpLimiter = createRateLimit({
    windowMs: FIFTEEN_MINUTES,
    max: 10,
    keyGenerator: clientIp,
    message: TOO_MANY
});

// Batasi per email target (mencegah tebak-tebakan username/no HP satu akun)
export const forgotPasswordEmailLimiter = createRateLimit({
    windowMs: FIFTEEN_MINUTES,
    max: 5,
    keyGenerator: emailKey,
    message: TOO_MANY
});

export const resetPasswordIpLimiter = createRateLimit({
    windowMs: FIFTEEN_MINUTES,
    max: 10,
    keyGenerator: clientIp,
    message: TOO_MANY
});

export const verifyOtpIpLimiter = createRateLimit({
    windowMs: FIFTEEN_MINUTES,
    max: 20,
    keyGenerator: clientIp,
    message: TOO_MANY
});