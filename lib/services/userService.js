import bcrypt from "bcrypt";

import AppError from "../utils/AppError.js";

import * as userRepository from "../repositories/userRepository.js";

export const getUsers = async () => {

    return await userRepository.findAll();

};

export const getUserById = async (id) => {

    const user = await userRepository.findById(id);

    if (!user) {
        throw new AppError(
            "User tidak ditemukan",
            404
        );
    }

    return user;

};

export const updateProfile = async (id, body) => {

    return await userRepository.updateProfile(
        id,
        body
    );

};

export const updatePassword = async (id, password) => {

    const hash =
        await bcrypt.hash(password, 10);

    await userRepository.updatePassword(
        id,
        hash
    );

};

export const updateRole = async (id, role) => {

    return await userRepository.updateRole(
        id,
        role
    );

};

export const updateStatus = async (
    id,
    status,
    isActive
) => {

    return await userRepository.updateStatus(
        id,
        status,
        isActive
    );

};

export const deleteUser = async (id) => {

    await userRepository.remove(id);

};

export const getUserWithPassword = async (id) => {
    const user = await userRepository.findByIdWithPassword(id);
    if (!user) {
        throw new AppError("User tidak ditemukan", 404);
    }
    return user;
};