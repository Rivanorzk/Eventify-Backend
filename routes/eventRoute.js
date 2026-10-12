import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import optionalAuthMiddleware from "../middleware/optionalAuthMiddleware.js";
import checkRole from "../middleware/checkRole.js";
import validate from "../middleware/validateMiddleware.js";
import upload from "../middleware/upload.js";

import {
    createEventSchema,
    updateEventSchema,
} from "../middleware/validators/eventValidator.js";

import {
    getEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
} from "../controllers/eventController.js";

const router = express.Router();

router.get("/", optionalAuthMiddleware, getEvents);

router.get("/:id", optionalAuthMiddleware, getEventById);

router.post(
    "/",
    authMiddleware,
    checkRole("admin", "superadmin"),
    upload.single("poster"),
    validate(createEventSchema),
    createEvent
);

router.put(
    "/:id",
    authMiddleware,
    checkRole("admin", "superadmin"),
    upload.single("poster"),
    validate(updateEventSchema),
    updateEvent
);

router.delete(
    "/:id",
    authMiddleware,
    checkRole("admin", "superadmin"),
    deleteEvent
);

export default router;