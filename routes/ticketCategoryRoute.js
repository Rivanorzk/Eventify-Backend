import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkRole from "../middleware/checkRole.js";
import validate from "../middleware/validateMiddleware.js";
import {
  createTicketCategorySchema,
  updateTicketCategorySchema
} from "../middleware/validators/ticketCategoryValidator.js";

import {
  getTicketCategories,
  getTicketCategoryById,
  createTicketCategory,
  updateTicketCategory,
  deleteTicketCategory
} from "../controllers/ticketCategoryController.js";

const router = express.Router();

router.get("/", getTicketCategories);

router.get("/:id", getTicketCategoryById);

router.post(
  "/",
  authMiddleware,
  checkRole("admin", "superadmin"),
  validate(createTicketCategorySchema),
  createTicketCategory
);

router.put(
  "/:id",
  authMiddleware,
  checkRole("admin", "superadmin"),
  validate(updateTicketCategorySchema),
  updateTicketCategory
);

router.delete(
  "/:id",
  authMiddleware,
  checkRole("superadmin"),
  deleteTicketCategory
);

export default router;
