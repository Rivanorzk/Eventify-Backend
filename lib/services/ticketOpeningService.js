import * as eventRepository from "../repositories/eventRepository.js";
import * as eventReminderRepository from "../repositories/eventReminderRepository.js";
import * as notificationService from "./notificationService.js";

export async function publishDueEventsAndNotify() {
    const dueEvents = await eventRepository.findDraftsReadyToPublish();

    for (const event of dueEvents) {
        await eventRepository.publishById(event.id);

        const userIds = await eventReminderRepository.findUserIdsByEventId(event.id);

        for (const userId of userIds) {
            await notificationService.createTicketOpenNotification(
                userId,
                event.id,
                event.title
            );
        }

        console.log(
            `[scheduler] Event #${event.id} "${event.title}" dipublikasikan otomatis, ${userIds.length} notifikasi terkirim.`
        );
    }

    return dueEvents.length;
}

export async function finishPastEvents() {
    return eventRepository.finishPastEvents();
}