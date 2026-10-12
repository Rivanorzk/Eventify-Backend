import Joi from "joi";

export const createVoucherSchema = Joi.object({
    event_id: Joi.number().integer().positive().required(),
    title: Joi.string().min(3).required(),
    minimum_quantity: Joi.number().integer().min(1).default(1),
    promo_code: Joi.string().alphanum().min(3).required(),
    discount_type: Joi.string().valid("percentage", "fixed").required(),
    discount_value: Joi.number().positive().when("discount_type", {
        is: "percentage",
        then: Joi.number().max(100),
    }).required(),
    maximum_discount: Joi.number().positive().allow(null),
    quota: Joi.number().integer().min(1).default(1),
    start_date: Joi.date().required(),
    end_date: Joi.date().greater(Joi.ref("start_date")).required(),
    status: Joi.string().valid("draft", "active", "inactive")
});

export const updateVoucherSchema = Joi.object({
    title: Joi.string().min(3),
    minimum_quantity: Joi.number().integer().min(1),
    promo_code: Joi.string().alphanum().min(3),
    discount_type: Joi.string().valid("percentage", "fixed"),
    discount_value: Joi.number().positive().when("discount_type", {
        is: "percentage",
        then: Joi.number().max(100),
    }),
    maximum_discount: Joi.number().positive().allow(null),
    quota: Joi.number().integer().min(1),
    start_date: Joi.date(),
    end_date: Joi.date(),
    status: Joi.string().valid("draft", "active", "inactive")
}).min(1);

export const redeemVoucherSchema = Joi.object({
    promo_code: Joi.string().trim().required()
});

export const validateVoucherSchema = Joi.object({
    user_voucher_id: Joi.number().integer().positive().required(),
    event_id: Joi.number().integer().positive().required(),
    total_ticket: Joi.number().integer().min(1)
});
