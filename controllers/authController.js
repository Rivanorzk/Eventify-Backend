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

export const logout = asyncHandler(async (req, res) => {

    await authService.logout(req.user.id);

    return success(
        res,
        null,
        "Logout berhasil"
    );

});

export const forgotPassword = asyncHandler(async (req, res) => {

    const data =
        await authService.verifyForgotPassword(req.body);

    return success(
        res,
        data,
        "Verifikasi berhasil, silakan atur password baru"
    );

});

export const resetPassword = asyncHandler(async (req, res) => {

    await authService.resetPassword(req.body);

    return success(
        res,
        null,
        "Password berhasil diubah, silakan login"
    );

});

export const requestOtp = asyncHandler(async (req, res) => {

    const data =
        await authService.requestResetOtp(req.body);

    return success(
        res,
        data,
        "Jika email terdaftar, kode OTP telah dikirim"
    );

});

export const verifyOtp = asyncHandler(async (req, res) => {

    const data =
        await authService.verifyResetOtp(req.body);

    return success(
        res,
        data,
        "OTP benar, silakan atur password baru"
    );

});