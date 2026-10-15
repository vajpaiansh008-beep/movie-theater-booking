import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";

import {
  createBooking,
  getMyBookings,
  getBookingById,
} from "../controllers/booking.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getMyBookings);
router.get("/:id", getBookingById);
router.post("/", createBooking);

export default router;
