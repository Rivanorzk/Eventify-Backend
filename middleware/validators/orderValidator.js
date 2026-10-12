import Joi from "joi";

export const createOrderSchema = Joi.object({
    event_id: Joi.number().integer().positive().required(),
    user_voucher_id: Joi.number().integer().positive().allow(null),
    tickets: Joi.array().items(
        Joi.object({
            ticket_category_id: Joi.number().integer().positive().required(),
            quantity: Joi.number().integer().min(1).required()
        })
    ).min(1).required()
});
