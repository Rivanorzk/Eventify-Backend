import asyncHandler from "../lib/utils/asyncHandler.js";
import { success } from "../lib/utils/response.js";

import * as settingsService from "../lib/services/settingsService.js";
import * as auditLogService from "../lib/services/auditlogService.js";

export const getServiceFee = asyncHandler(async (req, res) => {

    const data = await settingsService.getServiceFeeSetting();

    return success(res, data);

});

export const updateServiceFee = asyncHandler(async (req, res) => {

    const data = await settingsService.updateServiceFee(
        req.body.service_fee_percent,
        req.user.id
    );

    await auditLogService.logActivity({
        actor: req.user,
        req,
        action: "UPDATE_SERVICE_FEE",
        entityType: "settings",
        entityId: null,
        description:
            `Mengubah biaya layanan menjadi ${data.service_fee_percent}% dari harga tiket`,
    });

    return success(res, data, "Biaya layanan berhasil diperbarui");

});
