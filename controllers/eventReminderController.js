// controllers/eventReminderController.js
import asyncHandler from "../lib/utils/asyncHandler.js";
import { success } from "../lib/utils/response.js";
import * as eventReminderService from "../lib/services/eventReminderService.js";

export const toggleReminder = asyncHandler(async (req, res) => {
    const result = await eventReminderService.toggleReminder(
        req.user.id,
        req.params.eventId
    );

    return success(
        res,
        result,
        result.is_reminded
            ? "Pengingat diaktifkan"
            : "Pengingat dinonaktifkan"
    );
});

export const getMyReminders = asyncHandler(async (req, res) => {
    const reminders = await eventReminderService.getMyReminders(req.user.id);

    return success(res, reminders);
});
