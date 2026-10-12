import asyncHandler from "../lib/utils/asyncHandler.js";
import { success } from "../lib/utils/response.js";

import * as auditLogService from "../lib/services/auditlogService.js";

export const getAuditLogs = asyncHandler(async (req, res) => {

    const result = await auditLogService.getAuditLogs(req.query);

    return success(
        res,
        result,
        "Audit log retrieved successfully"
    );

});