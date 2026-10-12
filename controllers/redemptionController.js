import asyncHandler from "../lib/utils/asyncHandler.js";
import { success } from "../lib/utils/response.js";

import * as redemptionService from "../lib/services/redemptionService.js";

export const redeemTicket = asyncHandler(async (req, res) => {

    const redemption =
        await redemptionService.redeemTicket(
            req.user.id,
            req.body
        );

    return success(
        res,
        redemption,
        "Tiket berhasil digunakan"
    );

});

export const getRedemptions = asyncHandler(async (req, res) => {

    const redemptions =
        await redemptionService.getRedemptions();

    return success(res, redemptions);

});

export const getRedemptionById = asyncHandler(async (req, res) => {

    const redemption =
        await redemptionService.getRedemptionById(
            req.params.id
        );

    return success(res, redemption);

});