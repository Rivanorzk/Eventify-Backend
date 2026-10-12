import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import optionalAuthMiddleware from "../middleware/optionalAuthMiddleware.js";
import checkRole from "../middleware/checkRole.js";
import * as controller from "../controllers/eventTicketRuleController.js";

const router = express.Router();

router.get("/category/:eventTicketCategoryId", optionalAuthMiddleware, controller.getRules);

router.post("/", authMiddleware, checkRole("admin", "superadmin"), controller.createRule);
router.put("/:id", authMiddleware, checkRole("admin", "superadmin"), controller.updateRule);
router.delete("/:id", authMiddleware, checkRole("admin", "superadmin"), controller.deleteRule);

export default router;