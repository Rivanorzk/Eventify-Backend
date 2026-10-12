import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import AppError from "../utils/AppError.js";

import * as authRepository from "../repositories/authRepository.js";

export const register = async (body) => {

    const existingUser =
        await authRepository.findByEmail(body.email);

    if (existingUser) {
        throw new AppError(
            "Email sudah digunakan",
            409
        );
    }

    const hashedPassword =
        await bcrypt.hash(body.password, 10);

    const id =
        await authRepository.createUser({

            ...body,

            password: hashedPassword

        });

    return await authRepository.findById(id);

};

export const login = async (body) => {

    const user =
        await authRepository.findByEmail(body.email);

    if (!user) {
        throw new AppError(
            "Email tidak ditemukan",
            404
        );
    }

    if (!user.is_active) {
        throw new AppError(
            "Akun dinonaktifkan",
            403
        );
    }

    const match =
        await bcrypt.compare(
            body.password,
            user.password
        );

    if (!match) {
        throw new AppError(
            "Password salah",
            401
        );
    }

    const token = jwt.sign(
        {
            id: user.id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d"
        }
    );

    delete user.password;

    return {
        token,
        user
    };

};

export const profile = async (id) => {

    const user =
        await authRepository.findById(id);

    if (!user) {
        throw new AppError(
            "User tidak ditemukan",
            404
        );
    }

    return user;

};