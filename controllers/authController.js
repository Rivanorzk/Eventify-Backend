import asyncHandler from "../lib/utils/asyncHandler.js";
import { success } from "../lib/utils/response.js";

import * as authService from "../lib/services/authService.js";

export const register = asyncHandler(async (req, res) => {

    const user =
        await authService.register(req.body);

    return success(
        res,
        user,
        "Register berhasil",
        201
    );

});

export const login = asyncHandler(async (req, res) => {

    const data =
        await authService.login(req.body);

    return success(
        res,
        data,
        "Login berhasil"
    );

});

export const profile = asyncHandler(async (req, res) => {

    const user =
        await authService.profile(
            req.user.id
        );

    return success(
        res,
        user
    );

});