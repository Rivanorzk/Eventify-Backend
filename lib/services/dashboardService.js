import * as dashboardRepository from "../repositories/dashboardRepository.js";
import * as eventRepository from "../repositories/eventRepository.js";
import * as settingsService from "./settingsService.js";
import AppError from "../utils/AppError.js";

export const getCustomerDashboard = async (customerId) => {
    return await dashboardRepository.getCustomerStats(customerId);
};

export const getAdminDashboard = async (adminId, period) => {
    return await dashboardRepository.getAdminStats(adminId, period);
};

export const getSuperadminDashboard = async (period) => {

    const stats = await dashboardRepository.getSuperadminStats(period);

    // Persentase biaya layanan yang sedang berlaku (untuk kartu "Biaya
    // Layanan" di dashboard).
    return {
        ...stats,
        service_fee_percent: await settingsService.getServiceFeePercent(),
    };

};

// Halaman app/admin/events/[id]/analytics/page.js — admin hanya boleh
// melihat analitik event miliknya sendiri, superadmin bebas.
export const getEventAnalytics = async (eventId, range, user) => {

    const event = await eventRepository.findById(eventId);

    if (!event) {
        throw new AppError("Event tidak ditemukan", 404);
    }

    const isSuperadmin = user?.role === "superadmin";
    const isOwnerAdmin = user?.role === "admin" && event.admin_id === user.id;

    if (!isSuperadmin && !isOwnerAdmin) {
        throw new AppError(
            "Anda tidak memiliki akses terhadap event ini",
            403
        );
    }

    return await dashboardRepository.getEventAnalytics(eventId, range);

};