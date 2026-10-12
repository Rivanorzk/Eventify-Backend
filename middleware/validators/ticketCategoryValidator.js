import Joi from "joi";

export const createTicketCategorySchema = Joi.object({
    category_name: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
});

export const updateTicketCategorySchema = Joi.object({
    category_name: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
});