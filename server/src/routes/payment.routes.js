import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  createPaymentOrder,
  verifyPayment,
} from "../controllers/payment.controller.js";

const router = Router();

router.use(authenticate);

router.post("/order", createPaymentOrder);
router.post("/verify", verifyPayment);

export default router;
