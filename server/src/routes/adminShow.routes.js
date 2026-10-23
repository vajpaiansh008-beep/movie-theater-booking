import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import {
  createShow,
  getAllShows,
  initializeShowSeats,
  getShowSeatAvailability,
  cancelShow,
} from "../controllers/show.controller.js";

const router = Router();

// Public: list scheduled shows
router.get("/", getAllShows);

// Admin only: create shows
router.post("/", authenticate, authorizeRoles("admin"), createShow);

// Admin only: cancel show

router.patch("/:id/cancel", authenticate, authorizeRoles("admin"), cancelShow);

// Admin only: initialize seats
router.post(
  "/:id/initialize-seats",
  authenticate,
  authorizeRoles("admin"),
  initializeShowSeats,
);

// Seat availability can be viewed by customers
router.get("/:id/seats", getShowSeatAvailability);

export default router;
