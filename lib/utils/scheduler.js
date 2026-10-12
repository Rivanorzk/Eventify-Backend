import cron from "node-cron";
import {
    publishDueEventsAndNotify,
    finishPastEvents,
} from "../services/ticketOpeningService.js";

const SCHEDULE = "* * * * *";

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

export function getSchedulerStatus() {
    return [{ ...publishJob }, { ...finishJob }];
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
        job.last_error = err.message;
        job.last_error_at = new Date().toISOString();
        console.error(`[scheduler] Gagal jalankan job "${job.name}":`, err.message);
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
    });
}