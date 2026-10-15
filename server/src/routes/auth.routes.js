import { Router } from "express";
import {
  signup,
  login,
  getCurrentUser,
  verifyPhoneOtp,
  refreshSession,
  logout,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.post("/signup", signup);
router.post("/verify-phone", verifyPhoneOtp);
router.post("/login", login);
router.post("/refresh", refreshSession);
router.get("/me", authenticate, getCurrentUser);
router.post("/logout", logout);

export default router;
