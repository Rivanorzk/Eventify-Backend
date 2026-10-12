// services/notificationService.js
import * as notificationRepository from "../repositories/notificationRepository.js";

export const getNotifications = async (userId, { limit = 20, offset = 0 } = {}) => {
    const notifications = await notificationRepository.findAllByUserId(userId, { limit, offset });
    const unreadCount = await notificationRepository.countUnreadByUserId(userId);
    const total = await notificationRepository.countAllByUserId(userId);

    return {
        data: notifications,
        meta: {
            unread_count: unreadCount,
            total: total,
            limit: limit,
            offset: offset
        }
    };
};

export const getUnreadCount = async (userId) => {
    return await notificationRepository.countUnreadByUserId(userId);
};

export const getNotificationById = async (id, userId) => {
    return await notificationRepository.findById(id, userId);
};

export const createNotification = async (data) => {
    return await notificationRepository.create(data);
};

export const markAsRead = async (id, userId) => {
    return await notificationRepository.markAsRead(id, userId);
};

export const markAllAsRead = async (userId) => {
    await notificationRepository.markAllAsRead(userId);
};

export const deleteNotification = async (id, userId) => {
    return await notificationRepository.remove(id, userId);
};

export const deleteAllNotifications = async (userId) => {
    return await notificationRepository.removeAll(userId);
};

// Helper untuk membuat notifikasi order
export const createOrderNotification = async (userId, orderId, status) => {
    const titles = {
        pending: 'Order Pending',
        paid: 'Order Confirmed!',
        expired: 'Order Expired',
        cancelled: 'Order Cancelled'
    };

    const messages = {
        pending: 'Your order is waiting for payment confirmation.',
        paid: 'Your order has been confirmed. Check your tickets!',
        expired: 'Your order has expired. Please try again.',
        cancelled: 'Your order has been cancelled.'
    };

    return await notificationRepository.create({
        user_id: userId,
        title: titles[status] || 'Order Update',
        message: messages[status] || `Your order #${orderId} status: ${status}`,
        type: 'order',
        link: `/customer/orders/${orderId}`,
        icon: 'ShoppingBag'
    });
};

// Helper untuk membuat notifikasi payment
export const createPaymentNotification = async (userId, orderId, status) => {
    const titles = {
        pending: 'Payment Processing',
        settlement: 'Payment Successful!',
        capture: 'Payment Captured',
        deny: 'Payment Denied',
        cancel: 'Payment Cancelled',
        expire: 'Payment Expired',
        failure: 'Payment Failed'
    };

    const messages = {
        settlement: 'Your payment has been successfully processed.',
        failure: 'Your payment failed. Please try again or use another method.'
    };

    return await notificationRepository.create({
        user_id: userId,
        title: titles[status] || 'Payment Update',
        message: messages[status] || `Your payment for order #${orderId} status: ${status}`,
        type: 'payment',
        link: `/customer/orders/${orderId}`,
        icon: 'CreditCard'
    });
};

// Helper untuk membuat notifikasi event
export const createEventNotification = async (userId, eventId, eventTitle) => {
    return await notificationRepository.create({
        user_id: userId,
        title: 'New Event!',
        message: `Check out "${eventTitle}" - a new event you might be interested in!`,
        type: 'event',
        link: `/customer/event/${eventId}`,
        icon: 'Calendar'
    });
};

// Helper untuk membuat notifikasi promo
export const createPromoNotification = async (userId, promoCode, discount) => {
    return await notificationRepository.create({
        user_id: userId,
        title: 'Special Promo!',
        message: `Get ${discount}% off with code: ${promoCode}. Hurry, limited time only!`,
        type: 'promo',
        link: `/customer/event`,
        icon: 'Gift'
    });
};

export const createTicketOpenNotification = async (userId, eventId, eventTitle) => {
    return await notificationRepository.create({
        user_id: userId,
        title: 'Tiket Sudah Dibuka!',
        message: `Penjualan tiket untuk "${eventTitle}" sudah dibuka. Buruan amankan tiketmu!`,
        type: 'ticket',
        link: `/customer/event/${eventId}`,
        icon: 'Ticket',
    });
};