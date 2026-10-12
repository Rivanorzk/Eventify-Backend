// validators/userValidator.js
import Joi from "joi";

export const updateProfileSchema = Joi.object({
    username: Joi.string().min(3),
    email: Joi.string().email(),
    phone: Joi.string(),
    profile_image: Joi.string().allow("", null)
}).min(1);

export const updatePasswordSchema = Joi.object({
    currentPassword: Joi.string().min(8).required()
        .messages({
            'string.min': 'Password minimal 8 karakter',
            'any.required': 'Current password wajib diisi'
        }),
    newPassword: Joi.string().min(8).required()
        .messages({
            'string.min': 'Password baru minimal 8 karakter',
            'any.required': 'New password wajib diisi'
        })
});

export const updateRoleSchema = Joi.object({
    role: Joi.string().valid("customer", "admin", "superadmin").required()
});

export const updateStatusSchema = Joi.object({
    status: Joi.string().valid("online", "offline").required(),
    is_active: Joi.boolean().required()
});