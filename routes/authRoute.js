import express from "express";
import {
    forgotPassword,
    login,
    logout,
    profile,
    register,
    requestOtp,
    resetPassword,
    verifyOtp
} from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import validate from "../middleware/validateMiddleware.js";
import {
    forgotPasswordSchema,
    requestOtpSchema,
    resetPasswordSchema,
    verifyOtpSchema
} from "../middleware/validators/authValidator.js";
import {
    forgotPasswordEmailLimiter,
    forgotPasswordIpLimiter,
    resetPasswordIpLimiter,
    verifyOtpIpLimiter
} from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", authMiddleware, profile);
router.post("/logout", authMiddleware, logout);

router.post(
    "/forgot-password",
    forgotPasswordIpLimiter,
    forgotPasswordEmailLimiter,
    validate(forgotPasswordSchema),
    forgotPassword
);

router.post(
    "/forgot-password/otp",
    forgotPasswordIpLimiter,
    forgotPasswordEmailLimiter,
    validate(requestOtpSchema),
    requestOtp
);

router.post(
    "/forgot-password/verify-otp",
    verifyOtpIpLimiter,
    validate(verifyOtpSchema),
    verifyOtp
);

router.post(
    "/reset-password",
    resetPasswordIpLimiter,
    validate(resetPasswordSchema),
    resetPassword
);

export default router;