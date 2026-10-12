import { Router } from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import checkRole from "../middleware/checkRole.js";
import validate from "../middleware/validateMiddleware.js";
import { redeemTicketSchema } from "../middleware/validators/redemptionValidator.js";

import * as redemptionController from "../controllers/redemptionController.js";

const router = Router();

router.get(
    "/",
    authMiddleware,
    checkRole("admin", "superadmin"),
    redemptionController.getRedemptions
);

router.get(
    "/:id",
    authMiddleware,
    checkRole("admin", "superadmin"),
    redemptionController.getRedemptionById
);

router.post(
    "/",
    authMiddleware,
    checkRole("admin", "superadmin"),
    validate(redeemTicketSchema),
    redemptionController.redeemTicket
);

export default router;
