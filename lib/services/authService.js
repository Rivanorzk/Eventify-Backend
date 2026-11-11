import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";

import AppError from "../utils/AppError.js";

import * as authRepository from "../repositories/authRepository.js";

// ===== Konfigurasi reset password =====
const RESET_PURPOSE = "reset_password";
const RESET_EXPIRES_IN = "10m";
const RESET_EXPIRES_SECONDS = 10 * 60;

// Role yang boleh reset password sendiri. Akun admin/superadmin sebaiknya
// direset oleh superadmin karena data verifikasinya (email, username, no HP)
// relatif mudah ditebak.
const RESET_ALLOWED_ROLES = ["customer"];

// 0812-3456-7890 / +62 812 3456 7890 / 6281234567890 -> 081234567890
const normalizePhone = (value = "") => {

    let digits = String(value).replace(/\D/g, "");

    if (digits.startsWith("62")) {
        digits = "0" + digits.slice(2);
    }

    return digits;

};

// Token sekali pakai tanpa tabel tambahan: secret-nya digabung dengan hash
// password saat ini. Begitu password berubah, token otomatis tidak valid.
// Secret ini juga berbeda dari JWT_SECRET login, jadi token reset tidak
// bisa dipakai sebagai token login.
const issueResetToken = (user) => {

    const resetToken = jwt.sign(
        {
            id: user.id,
            purpose: RESET_PURPOSE
        },
        process.env.JWT_SECRET + user.password,
        {
            expiresIn: RESET_EXPIRES_IN
        }
    );

    return {
        reset_token: resetToken,
        expires_in: RESET_EXPIRES_SECONDS
    };

};

export const register = async (body) => {

    const existingUser =
        await authRepository.findByEmail(body.email);

    if (existingUser) {
        throw new AppError(
            "Email sudah digunakan",
            409
        );
    }

    const hashedPassword =
        await bcrypt.hash(body.password, 10);

    const id =
        await authRepository.createUser({

            ...body,

            password: hashedPassword

        });

    return await authRepository.findById(id);

};

export const login = async (body) => {

    const user =
        await authRepository.findByEmail(body.email);

    if (!user) {
        throw new AppError(
            "Email tidak ditemukan",
            404
        );
    }

    if (!user.is_active) {
        throw new AppError(
            "Akun dinonaktifkan",
            403
        );
    }

    const match =
        await bcrypt.compare(
            body.password,
            user.password
        );

    if (!match) {
        throw new AppError(
            "Password salah",
            401
        );
    }

    const token = jwt.sign(
        {
            id: user.id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d"
        }
    );
    await authRepository.setStatus(user.id, "online");
    user.status = "online";

    delete user.password;

    return {
        token,
        user
    };

};

export const profile = async (id) => {

    const user =
        await authRepository.findById(id);

    if (!user) {
        throw new AppError(
            "User tidak ditemukan",
            404
        );
    }

    return user;

};

export const logout = async (id) => {

    await authRepository.setStatus(id, "offline");

};

// Langkah 1: verifikasi identitas lewat data yang sudah ada di tabel users
// (email + username + no HP). Tidak ada email yang dikirim, jadi aman dipakai
// walau email akun hanya dummy.
export const verifyForgotPassword = async ({ email, username, phone }) => {

    // Pesan sengaja dibuat sama untuk semua kegagalan agar penyerang
    // tidak bisa tahu mana yang salah (email / username / no HP).
    const invalid = () =>
        new AppError("Data yang dimasukkan tidak cocok", 400);

    const user = await authRepository.findByEmail(email);

    if (!user || !user.is_active || !RESET_ALLOWED_ROLES.includes(user.role)) {
        throw invalid();
    }

    const sameUsername =
        String(user.username || "").trim().toLowerCase() ===
        String(username).trim().toLowerCase();

    const samePhone =
        normalizePhone(user.phone) !== "" &&
        normalizePhone(user.phone) === normalizePhone(phone);

    if (!sameUsername || !samePhone) {
        throw invalid();
    }

    return issueResetToken(user);

};

// Langkah 2: set password baru memakai token dari langkah 1.
export const resetPassword = async ({ reset_token, password }) => {

    const invalidToken = () =>
        new AppError("Token reset tidak valid atau sudah digunakan", 400);

    // Decode (tanpa verifikasi) hanya untuk tahu user-nya,
    // verifikasi sebenarnya dilakukan setelah ambil hash password.
    const decoded = jwt.decode(reset_token);

    if (!decoded?.id || decoded.purpose !== RESET_PURPOSE) {
        throw invalidToken();
    }

    const user =
        await authRepository.findByIdWithPassword(decoded.id);

    if (!user || !user.is_active || !RESET_ALLOWED_ROLES.includes(user.role)) {
        throw invalidToken();
    }

    try {

        const verified = jwt.verify(
            reset_token,
            process.env.JWT_SECRET + user.password
        );

        if (verified.purpose !== RESET_PURPOSE) {
            throw invalidToken();
        }

    } catch (error) {

        if (error.name === "TokenExpiredError") {
            throw new AppError(
                "Sesi reset password sudah kedaluwarsa, silakan ulangi dari awal",
                400
            );
        }

        throw invalidToken();

    }

    const sameAsOld =
        await bcrypt.compare(password, user.password);

    if (sameAsOld) {
        throw new AppError(
            "Password baru tidak boleh sama dengan password lama",
            400
        );
    }

    const hashedPassword =
        await bcrypt.hash(password, 10);

    await authRepository.updatePassword(user.id, hashedPassword);

};

// ===== OTP (mode dummy) =====
// OTP disimpan di memori server (tanpa tabel). Hilang saat server restart dan
// tidak dibagi antar instance - cukup untuk demo. Untuk produksi, pindahkan
// ke tabel/Redis dan kirim OTP lewat email/SMS sungguhan.
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 5;

// OTP_DUMMY=true -> OTP dikembalikan di response API (karena email dummy).
// Jangan aktifkan ini kalau email sudah asli.
const isDummyOtp = () => process.env.OTP_DUMMY === "true";

const otpStore = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of otpStore) {
        if (entry.expiresAt <= now) otpStore.delete(key);
    }
}, 60 * 1000).unref();

const hashOtp = (otp) =>
    crypto
        .createHmac("sha256", process.env.JWT_SECRET)
        .update(String(otp))
        .digest("hex");

const normalizeEmail = (email) => String(email).trim().toLowerCase();

// Langkah 1: minta OTP. Respons selalu sama (tidak membocorkan apakah email
// terdaftar), kecuali pada mode dummy yang memang mengembalikan kodenya.
export const requestResetOtp = async ({ email }) => {

    const key = normalizeEmail(email);
    const user = await authRepository.findByEmail(email);

    const eligible =
        user && user.is_active && RESET_ALLOWED_ROLES.includes(user.role);

    const result = {
        expires_in: OTP_TTL_MS / 1000,
        resend_in: OTP_RESEND_COOLDOWN_MS / 1000
    };

    if (!eligible) {
        return result;
    }

    const existing = otpStore.get(key);

    if (existing && Date.now() - existing.sentAt < OTP_RESEND_COOLDOWN_MS) {
        throw new AppError(
            "Tunggu beberapa detik sebelum meminta kode lagi",
            429
        );
    }

    const otp = String(crypto.randomInt(100000, 1000000));

    otpStore.set(key, {
        hash: hashOtp(otp),
        sentAt: Date.now(),
        expiresAt: Date.now() + OTP_TTL_MS,
        attempts: 0
    });

    if (isDummyOtp()) {
        console.log(`[DUMMY OTP] ${key} -> ${otp}`);
        result.otp = otp;
    } else {
        // TODO: kirim OTP lewat email/SMS sungguhan di sini.
    }

    return result;

};

// Langkah 2: cek OTP, kalau benar keluarkan token reset (dipakai di /reset-password).
export const verifyResetOtp = async ({ email, otp }) => {

    const key = normalizeEmail(email);
    const invalid = () => new AppError("Kode OTP salah atau sudah kedaluwarsa", 400);

    const entry = otpStore.get(key);

    if (!entry || entry.expiresAt <= Date.now()) {
        otpStore.delete(key);
        throw invalid();
    }

    entry.attempts += 1;

    if (entry.attempts > OTP_MAX_ATTEMPTS) {
        otpStore.delete(key);
        throw new AppError(
            "Terlalu banyak percobaan salah, silakan minta kode baru",
            429
        );
    }

    const given = Buffer.from(hashOtp(otp));
    const expected = Buffer.from(entry.hash);

    if (!crypto.timingSafeEqual(given, expected)) {
        throw invalid();
    }

    // Sekali pakai
    otpStore.delete(key);

    const user = await authRepository.findByEmail(email);

    if (!user || !user.is_active || !RESET_ALLOWED_ROLES.includes(user.role)) {
        throw invalid();
    }

    return issueResetToken(user);

};