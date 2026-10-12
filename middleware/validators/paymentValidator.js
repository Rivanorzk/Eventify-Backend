import Joi from "joi";

export const createPaymentSchema = Joi.object({
    order_id: Joi.number().integer().positive().required()
});
