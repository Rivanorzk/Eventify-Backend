import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkRole from "../middleware/checkRole.js";
import validate from "../middleware/validateMiddleware.js";
import {
  updateProfileSchema,
  updatePasswordSchema,
  updateRoleSchema,
  updateStatusSchema
} from "../middleware/validators/userValidator.js";

import {
  getUsers,
  getUserById,
  updateRole,
  updateStatus,
  deleteUser,
  updateMyProfile,
  updateMyPassword,
  getMyProfile
} from "../controllers/userController.js";
import upload from "../middleware/upload.js";
import { uploadAvatar, uploadCover } from "../controllers/userController.js";

const router = express.Router();

router.get("/", authMiddleware, checkRole("admin", "superadmin"), getUsers);
router.get("/me", authMiddleware, getMyProfile);
router.put("/me", authMiddleware, validate(updateProfileSchema), updateMyProfile);
router.put("/me/password", authMiddleware, validate(updatePasswordSchema), updateMyPassword);
router.put("/:id/role", authMiddleware, checkRole("superadmin"), validate(updateRoleSchema), updateRole);
router.put("/:id/status", authMiddleware, checkRole("admin", "superadmin"), validate(updateStatusSchema), updateStatus);
router.delete("/:id", authMiddleware, checkRole("superadmin"), deleteUser);
router.post(
    "/me/avatar",
    authMiddleware,
    upload.single("avatar"),
    uploadAvatar
);
router.post(
    "/me/cover",
    authMiddleware,
    upload.single("cover"),
    uploadCover
);

export default router;
