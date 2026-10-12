// routes/eventReminderRoute.js
import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import {
    toggleReminder,
    getMyReminders,
} from "../controllers/eventReminderController.js";

const router = express.Router();

// Reminder selalu terikat ke user yang login.
router.use(authMiddleware);

// GET /reminders -> daftar event yang di-reminder user (mis. untuk halaman
// "Reminder Saya" atau notifikasi terjadwal).
router.get("/", getMyReminders);

// POST /reminders/:eventId -> toggle (aktifkan / matikan) reminder untuk
// satu event. Response berisi { event_id, is_reminded }.
router.post("/:eventId", toggleReminder);

export default router;
