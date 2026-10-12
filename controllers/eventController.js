import asyncHandler from "../lib/utils/asyncHandler.js";
import { success } from "../lib/utils/response.js";
import * as eventService from "../lib/services/eventService.js";

export async function getEvents(req, res) {
    try {
        const events = await eventService.getEvents(req.query, req.user);

        res.json({
            success: true,
            message: "Success",
            data: events || []
        });
    } catch (err) {
        console.error('Error in getEvents controller:', err);
        res.status(500).json({
            success: false,
            message: err.message || "Failed to fetch events",
            data: []
        });
    }
}

export const getEventById = asyncHandler(async (req, res) => {

    const event = await eventService.getEventById(
        req.params.id,
        req.user
    );

    return success(res, event);

});

export const createEvent = asyncHandler(async (req, res) => {
    const event = await eventService.createEvent(
        req.user.id,
        {
            ...req.body,
            poster: req.file?.path,
        }
    );

    return success(
        res,
        event,
        "Event berhasil dibuat",
        201
    );
});

export const updateEvent = asyncHandler(async (req, res) => {
    const event = await eventService.updateEvent(
        req.params.id,
        {
            ...req.body,
            ...(req.file
                ? { poster: req.file.path }
                : {}),
        },
        req.user
    );

    return success(
        res,
        event,
        "Event berhasil diperbarui"
    );
});

export const deleteEvent = asyncHandler(async (req, res) => {

    await eventService.deleteEvent(req.params.id, req.user);

    return success(
        res,
        null,
        "Event berhasil dihapus"
    );

});