import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import optionalAuthMiddleware from "../middleware/optionalAuthMiddleware.js";
import checkRole from "../middleware/checkRole.js";
import * as controller from "../controllers/eventTicketBenefitController.js";

const router = express.Router();

router.get("/category/:eventTicketCategoryId", optionalAuthMiddleware, controller.getBenefits);

router.post("/", authMiddleware, checkRole("admin", "superadmin"), controller.createBenefit);
router.put("/:id", authMiddleware, checkRole("admin", "superadmin"), controller.updateBenefit);
router.delete("/:id", authMiddleware, checkRole("admin", "superadmin"), controller.deleteBenefit);

export default router;