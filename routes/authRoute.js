import express from "express";
import { login, logout, profile, register } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", authMiddleware, profile);
router.post("/logout", authMiddleware, logout);

export default router;