// services/eventReminderService.js
import AppError from "../utils/AppError.js";
import * as eventReminderRepository from "../repositories/eventReminderRepository.js";
import * as eventRepository from "../repositories/eventRepository.js";

// Toggle: kalau user belum reminder -> tambahkan, kalau sudah -> hapus.
// Dipakai tombol "Ingatkan Saya" di kartu event (satu endpoint untuk dua aksi).
export const toggleReminder = async (userId, eventId) => {
    const event = await eventRepository.findById(eventId);

    if (!event) {
        throw new AppError("Event tidak ditemukan", 404);
    }

    const alreadyReminded = await eventReminderRepository.exists(
        userId,
        eventId
    );

    if (alreadyReminded) {
        await eventReminderRepository.remove(userId, eventId);
        return { event_id: Number(eventId), is_reminded: false };
    }

    await eventReminderRepository.create(userId, eventId);
    return { event_id: Number(eventId), is_reminded: true };
};

export const getMyReminders = async (userId) => {
    return await eventReminderRepository.findAllByUserId(userId);
};
