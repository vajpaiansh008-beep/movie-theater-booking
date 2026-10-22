import { Router } from "express";
import {
  getAllShows,
  getShowSeatAvailability,
} from "../controllers/show.controller.js";

const router = Router();

// Public: browse scheduled shows
router.get("/", getAllShows);

// Public: view seat availability for a show
router.get("/:id/seats", getShowSeatAvailability);

export default router;
