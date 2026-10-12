import asyncHandler from "../lib/utils/asyncHandler.js";
import { success } from "../lib/utils/response.js";
import * as dashboardService from "../lib/services/dashboardService.js";
import * as systemService from "../lib/services/systemService.js";

export const getCustomerDashboard = asyncHandler(async (req, res) => {

    const stats = await dashboardService.getCustomerDashboard(
        req.user.id
    );

    return success(res, stats);

});

export const getAdminDashboard = asyncHandler(async (req, res) => {

    // period: "month" (default, bulan kalender berjalan) atau "30d"
    // (30 hari terakhir) — dipakai untuk badge pertumbuhan penjualan,
    // sesuai toggle "Bulan Ini" / "30 Hari Terakhir" di dashboard EO.
    const period = req.query.period === "30d" ? "30d" : "month";

    // Superadmin yang mengintip endpoint admin akan melihat statistik
    // sistem secara keseluruhan, bukan error, supaya tetap berguna
    // kalau dipakai lintas role.
    const stats = req.user.role === "superadmin"
        ? await dashboardService.getSuperadminDashboard(period)
        : await dashboardService.getAdminDashboard(req.user.id, period);

    return success(res, stats);

});

export const getSuperadminDashboard = asyncHandler(async (req, res) => {

    // period: "month" (default) atau "30d", sama seperti dashboard admin.
    const period = req.query.period === "30d" ? "30d" : "month";

    const stats = await dashboardService.getSuperadminDashboard(period);

    return success(res, stats);

});

// GET /dashboard/events/:id/analytics — dipakai halaman
// app/admin/events/[id]/analytics/page.js (getEventAnalytics di
// services/dashboardService.js frontend).
export const getEventAnalytics = asyncHandler(async (req, res) => {

    const range = ["7d", "30d", "all"].includes(req.query.range)
        ? req.query.range
        : "all";

    const stats = await dashboardService.getEventAnalytics(
        req.params.id,
        range,
        req.user
    );

    return success(res, stats);

});

export const getSystemStatus = asyncHandler(async (req, res) => {

    const status = await systemService.getSystemStatus();

    return success(res, status);

});