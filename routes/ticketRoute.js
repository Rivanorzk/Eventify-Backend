import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import checkRole from "../middleware/checkRole.js";
import * as ticketController from "../controllers/ticketController.js";

const router = express.Router();

router.get(
    "/",
    authMiddleware,
    checkRole("admin", "superadmin"),
    ticketController.getTickets
);

router.get(
    "/my",
    authMiddleware,
    ticketController.getMyTickets
);

router.get(
    "/:id",
    authMiddleware,
    ticketController.getTicketById
);

export default router;