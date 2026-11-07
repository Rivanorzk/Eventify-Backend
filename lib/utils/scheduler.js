//scheduler.js
import cron from "node-cron";
import {
    publishDueEventsAndNotify,
    finishPastEvents,
} from "../services/ticketOpeningService.js";
import { notifyDueVouchers, deactivateEndedVouchers } from "../services/voucherService.js";
import { expireOverdueOrders, sendPaymentReminders } from "../services/orderService.js";
import * as authRepository from "../repositories/authRepository.js";

const SCHEDULE = "* * * * *";

const INACTIVE_MINUTES = 10;

// State job untuk System Console (in-memory, reset saat restart).
const publishJob = {
    name: "Publikasi otomatis event",
    schedule: SCHEDULE,
    description: "Mempublikasikan event draft yang waktu penjualannya sudah tiba dan mengirim notifikasi.",
    runs: 0,
    total_published: 0,
    last_run_at: null,
    last_duration_ms: null,
    last_published: 0,
    last_error: null,
    last_error_at: null,
};

const finishJob = {
    name: "Selesaikan event otomatis",
    schedule: SCHEDULE,
    description: "Mengubah status event published menjadi finished jika tanggal event sudah lewat satu hari.",
    runs: 0,
    total_published: 0, // dipakai ulang sebagai total event yang di-finish
    last_run_at: null,
    last_duration_ms: null,
    last_published: 0,
    last_error: null,
    last_error_at: null,
};

const voucherJob = {
    name: "Notifikasi voucher baru",
    schedule: SCHEDULE,
    description: "Mengirim notifikasi kode voucher ke semua customer saat voucher aktif dan sudah berlaku.",
    runs: 0,
    total_published: 0, // dipakai ulang sebagai total voucher yang dinotifikasi
    last_run_at: null,
    last_duration_ms: null,
    last_published: 0,
    last_error: null,
    last_error_at: null,
};

const voucherExpireJob = {
    name: "Nonaktifkan voucher berakhir",
    schedule: SCHEDULE,
    description: "Mengubah status voucher aktif menjadi inactive jika end_date sudah lewat.",
    runs: 0,
    total_published: 0, // dipakai ulang sebagai total voucher yang dinonaktifkan
    last_run_at: null,
    last_duration_ms: null,
    last_published: 0,
    last_error: null,
    last_error_at: null,
};

const expireJob = {
    name: "Kedaluwarsakan pesanan",
    schedule: SCHEDULE,
    description: "Mengubah pesanan pending yang melewati batas bayar menjadi expired dan mengembalikan stok & voucher.",
    runs: 0, total_published:0, last_run_at: null, last_duration_ms: null, 
    last_published: 0, last_error: null, last_error_at: null,
};

const reminderJob = {
    name: "Pengingat pembayaran",
    schedule: SCHEDULE,
    description: "Mengirim notifikasi 5 menit sebelum batas pembayaran habis.",
    runs: 0, total_published: 0, last_run_at: null,
    last_duration_ms: null, last_published: 0, last_error: null, last_error_at: null,
}

export function getSchedulerStatus() {
    return [{ ...publishJob }, { ...finishJob }, { ...voucherJob }, { ...voucherExpireJob }, { ...expireJob }, { ...reminderJob }];
}

async function runJob(job, fn, successLog) {
    const started = Date.now();
    try {
        const count = await fn();
        job.last_published = count;
        job.total_published += count;
        job.last_error = null;
        if (count > 0) console.log(`[scheduler] ${count} ${successLog}`);
    } catch (err) {
        job.last_error = err.message || err.message || String(err);
        job.last_error_at = new Date().toISOString();
        console.error(`[scheduler] Gagal jalankan job "${job.name}":`, err.message || err.code || err);
    } finally {
        job.runs += 1;
        job.last_run_at = new Date().toISOString();
        job.last_duration_ms = Date.now() - started;
    }
}

export function startScheduler() {
    // Jalan tiap 1 menit. Publish dulu, baru finish, supaya urutannya konsisten.
    cron.schedule(SCHEDULE, async () => {
        await runJob(publishJob, publishDueEventsAndNotify, "event dipublikasikan otomatis.");
        await runJob(finishJob, finishPastEvents, "event diselesaikan otomatis (finished).");
        await runJob(voucherJob, notifyDueVouchers, "voucher dinotifikasi ke customer.");
        await runJob(voucherExpireJob, deactivateEndedVouchers, "voucher dinonaktifkan karena end_date lewat.");
        await runJob(reminderJob, sendPaymentReminders, "reminder pembayaran dikirim ke customer.");
        await runJob(expireJob, expireOverdueOrders, "pesanan kedaluwarsa dan stok dikembalikan.");
        try {
            const n = await authRepository.markInactiveOffline(INACTIVE_MINUTES);
            if (n > 0) console.log(`[scheduler] ${n} user di-set offline (tidak aktif).`);
        } catch (err) {
            console.error("[scheduler] Gagal set user offline:", err.message);
        }
    }); 
}