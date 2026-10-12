import asyncHandler from "../lib/utils/asyncHandler.js";
import { success } from "../lib/utils/response.js";
import AppError from "../lib/utils/AppError.js";
import bcrypt from "bcrypt"

import * as userService from "../lib/services/userService.js";
import * as auditLogService from "../lib/services/auditlogService.js";

const isStaff = (role) => ["admin", "superadmin"].includes(role);

export const getUsers = asyncHandler(async (req, res) => {

    const users = await userService.getUsers();

    return success(res, users);

});

export const getUserById = asyncHandler(async (req, res) => {

    if (
        String(req.user.id) !== String(req.params.id) &&
        !isStaff(req.user.role)
    ) {
        throw new AppError("Anda tidak memiliki akses ke data ini", 403);
    }

    const user =
        await userService.getUserById(
            req.params.id
        );

    return success(res, user);

});

export const getMyProfile = asyncHandler(async (req, res) => {

    const user = await userService.getUserById(
        req.user.id
    );

    return success(res, user);

});

export const updateMyProfile = asyncHandler(async (req, res) => {

    const user = await userService.updateProfile(
        req.user.id,
        req.body
    );

    return success(
        res,
        user,
        "Profile berhasil diperbarui"
    );

});

export const updateMyPassword = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Ambil user dengan password
    const user = await userService.getUserWithPassword(userId);

    // Verifikasi current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        throw new AppError("Current password salah", 400);
    }

    // Update password
    await userService.updatePassword(userId, newPassword);

    return success(res, null, "Password berhasil diperbarui");
});

export const updateRole = asyncHandler(async (req, res) => {

    const targetBefore =
        await userService.getUserById(req.params.id);

    const user =
        await userService.updateRole(
            req.params.id,
            req.body.role
        );

    await auditLogService.logActivity({
        actor: req.user,
        req,
        action: "UPDATE_USER_ROLE",
        entityType: "user",
        entityId: req.params.id,
        description: `Mengubah role "${targetBefore.username}" dari ${targetBefore.role} menjadi ${req.body.role}`,
    });

    return success(
        res,
        user,
        "Role berhasil diperbarui"
    );

});

export const updateStatus = asyncHandler(async (req, res) => {

    const user =
        await userService.updateStatus(
            req.params.id,
            req.body.status,
            req.body.is_active
        );

    return success(
        res,
        user,
        "Status berhasil diperbarui"
    );

});

export const deleteUser = asyncHandler(async (req, res) => {

    const target =
        await userService.getUserById(req.params.id);

    await userService.deleteUser(
        req.params.id
    );

    await auditLogService.logActivity({
        actor: req.user,
        req,
        action: "DELETE_USER",
        entityType: "user",
        entityId: req.params.id,
        description: `Menghapus user "${target.username}" (${target.role})`,
    });

    return success(
        res,
        null,
        "User berhasil dihapus"
    );

});

export const uploadAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new AppError("Tidak ada file yang diupload", 400);
    }

    const avatarUrl = req.file.path; 
    
    const updatedUser = await userService.updateProfile(req.user.id, {
        profile_image: avatarUrl
    });

    return success(res, updatedUser, "Avatar berhasil diupdate");
});


export const uploadCover = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new AppError("Tidak ada file yang diupload", 400);
    }

    const coverUrl = req.file.path;

    const updatedUser = await userService.updateProfile(req.user.id, {
        cover_image: coverUrl,
    });

    return success(res, updatedUser, "Cover berhasil diupdate");
});