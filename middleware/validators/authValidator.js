// validators/authValidator.js

import Joi from "joi";

export const registerSchema = Joi.object({
    username: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    phone: Joi.string().required()
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

export const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().required(),
    phone: Joi.string().required()
});

export const resetPasswordSchema = Joi.object({
    reset_token: Joi.string().required(),
    password: Joi.string().min(8).required()
});

export const requestOtpSchema = Joi.object({
    email: Joi.string().email().required()
});

export const verifyOtpSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().pattern(/^\d{6}$/).required().messages({
        "string.pattern.base": "Kode OTP harus 6 digit angka"
    })
});