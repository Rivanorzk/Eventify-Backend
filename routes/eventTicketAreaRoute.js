import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import optionalAuthMiddleware from "../middleware/optionalAuthMiddleware.js";
import checkRole from "../middleware/checkRole.js";
import * as controller from "../controllers/eventTicketAreaController.js";

const router = express.Router();

// Publik (customer perlu lihat ini saat memilih kategori tiket)
router.get("/category/:eventTicketCategoryId", optionalAuthMiddleware, controller.getAreas);

router.post("/", authMiddleware, checkRole("admin", "superadmin"), controller.createArea);
router.put("/:id", authMiddleware, checkRole("admin", "superadmin"), controller.updateArea);
router.delete("/:id", authMiddleware, checkRole("admin", "superadmin"), controller.deleteArea);

export default router;