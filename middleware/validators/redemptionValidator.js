import Joi from "joi";

export const redeemTicketSchema = Joi.object({
    ticket_code: Joi.string().required(),
    notes: Joi.string().allow("", null)
});
