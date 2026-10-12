import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import checkRole from "../middleware/checkRole.js";
import validate from "../middleware/validateMiddleware.js";
import { updateServiceFeeSchema } from "../middleware/validators/settingsValidator.js";

import {
    getServiceFee,
    updateServiceFee,
} from "../controllers/settingsController.js";

const router = express.Router();

router.get(
    "/service-fee",
    authMiddleware,
    checkRole("admin", "superadmin"),
    getServiceFee
);

router.put(
    "/service-fee",
    authMiddleware,
    checkRole("superadmin"),
    validate(updateServiceFeeSchema),
    updateServiceFee
);

export default router;
