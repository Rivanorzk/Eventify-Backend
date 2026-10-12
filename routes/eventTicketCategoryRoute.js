import express from "express";

import {
    getEventTicketCategories,
    getEventTicketCategoryById,
    createEventTicketCategory,
    updateEventTicketCategory,
    deleteEventTicketCategory,
    getEventTicketCategoryDetail,
} from "../controllers/eventTicketCategoryController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import checkRole from "../middleware/checkRole.js";

const router = express.Router();

router.get(
    "/event/:eventId",
    authMiddleware,
    getEventTicketCategories
);

router.get(
    "/:id",
    authMiddleware,
    getEventTicketCategoryById
);

router.post(
    "/",
    authMiddleware,
    checkRole("admin", "superadmin"),
    createEventTicketCategory
);

router.put(
    "/:id",
    authMiddleware,
    checkRole("admin", "superadmin"),
    updateEventTicketCategory
);

router.delete(
    "/:id",
    authMiddleware,
    checkRole("admin", "superadmin"),
    deleteEventTicketCategory
);

router.get("/:id/detail", authMiddleware, getEventTicketCategoryDetail);

export default router;