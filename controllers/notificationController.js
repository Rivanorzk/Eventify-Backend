// controllers/notificationController.js
import asyncHandler from "../lib/utils/asyncHandler.js";
import { success } from "../lib/utils/response.js";
import * as notificationService from "../lib/services/notificationService.js";

export const getNotifications = asyncHandler(async (req, res) => {
    const { limit = 20, offset = 0 } = req.query;
    
    const result = await notificationService.getNotifications(
        req.user.id,
        { limit: parseInt(limit), offset: parseInt(offset) }
    );

    return success(res, result);
});

export const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await notificationService.getUnreadCount(req.user.id);
    
    return success(res, { unread_count: count });
});

export const markAsRead = asyncHandler(async (req, res) => {
    const notification = await notificationService.markAsRead(
        req.params.id,
        req.user.id
    );

    if (!notification) {
        return res.status(404).json({
            success: false,
            message: "Notification not found"
        });
    }

    return success(res, notification, "Notification marked as read");
});

export const markAllAsRead = asyncHandler(async (req, res) => {
    await notificationService.markAllAsRead(req.user.id);
    
    return success(res, null, "All notifications marked as read");
});

export const deleteNotification = asyncHandler(async (req, res) => {
    const deleted = await notificationService.deleteNotification(
        req.params.id,
        req.user.id
    );

    if (!deleted) {
        return res.status(404).json({
            success: false,
            message: "Notification not found"
        });
    }

    return success(res, null, "Notification deleted");
});

export const deleteAllNotifications = asyncHandler(async (req, res) => {
    await notificationService.deleteAllNotifications(req.user.id);
    
    return success(res, null, "All notifications deleted");
});