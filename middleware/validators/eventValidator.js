import Joi from "joi";

export const createEventSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(3)
        .max(255)
        .required()
        .messages({
            "string.empty": "Event title is required",
            "string.min": "Event title must be at least 3 characters",
            "any.required": "Event title is required",
        }),

    category_id: Joi.number()
        .integer()
        .required(),

    description: Joi.string()
        .allow("")
        .optional(),

    location: Joi.string()
        .trim()
        .max(255)
        .allow("")
        .optional(),

    latitude: Joi.number()
        .min(-90)
        .max(90)
        .allow(null, "")
        .optional(),

    longitude: Joi.number()
        .min(-180)
        .max(180)
        .allow(null, "")
        .optional(),

    event_date: Joi.date()
        .iso()
        .allow("")
        .optional(),

    start_time: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
        .allow("")
        .optional()
        .messages({
            "string.pattern.base":
                "Start time must use HH:mm or HH:mm:ss format",
        }),

    // Kapan penjualan tiket dibuka. Dipakai frontend untuk countdown
    // "Tiket dibuka dalam ..." di section "Akan Datang Segera".
    sales_start_at: Joi.date()
        .iso()
        .allow("", null)
        .optional(),

    status: Joi.string()
        .valid(
            "draft",
            "published",
            "finished",
            "cancelled"
        )
        .default("draft"),
});


export const updateEventSchema = Joi.object({
    category_id: Joi.number()
        .integer()
        .optional(),


    title: Joi.string()
        .trim()
        .min(3)
        .max(255)
        .optional(),

    description: Joi.string()
        .allow("")
        .optional(),

    location: Joi.string()
        .trim()
        .max(255)
        .allow("")
        .optional(),

    latitude: Joi.number()
        .min(-90)
        .max(90)
        .allow(null, "")
        .optional(),

    longitude: Joi.number()
        .min(-180)
        .max(180)
        .allow(null, "")
        .optional(),

    event_date: Joi.date()
        .iso()
        .allow("")
        .optional(),

    start_time: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
        .allow("")
        .optional(),

    sales_start_at: Joi.date()
        .iso()
        .allow("", null)
        .optional(),

    status: Joi.string()
        .valid(
            "draft",
            "published",
            "finished",
            "cancelled"
        )
        .optional(),
});