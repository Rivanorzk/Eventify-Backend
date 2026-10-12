import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { createCategory, deleteCategory, getCategories, getCategoryById, updateCategory } from "../controllers/categoryController.js";
import checkRole from "../middleware/checkRole.js";

const router = express.Router();

router.get("/", getCategories);

router.get("/:id", getCategoryById);

router.post(
    "/",
    authMiddleware,
    checkRole("admin", "superadmin"),
    createCategory
);
   
router.put(
    "/:id",
    authMiddleware,
    checkRole("admin", "superadmin"),
    updateCategory
);

router.delete(
    "/:id",
    authMiddleware,
    checkRole("admin","superadmin"),
    deleteCategory
);

export default router;