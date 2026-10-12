import Joi from "joi";

export const updateServiceFeeSchema = Joi.object({
    service_fee_percent: Joi.number()
        .min(0)
        .max(30)
        .required()
        .messages({
            "number.base": "Biaya layanan harus berupa angka",
            "number.min": "Biaya layanan tidak boleh negatif",
            "number.max": "Biaya layanan maksimal 30%",
            "any.required": "Biaya layanan wajib diisi",
        }),
});
