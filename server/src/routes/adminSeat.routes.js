import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import {
  createSeatsBulk,
  getScreenSeats,
} from "../controllers/seat.controller.js";

const router = Router();

router.use(authenticate, authorizeRoles("admin"));

router.post("/bulk", createSeatsBulk);
router.get("/", getScreenSeats);

export default router;
