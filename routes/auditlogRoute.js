import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import checkRole from "../middleware/checkRole.js";
import { getAuditLogs } from "../controllers/auditlogController.js";

const router = express.Router();

router.get(
    "/",
    authMiddleware,
    checkRole("superadmin"),
    getAuditLogs
);

export default router;