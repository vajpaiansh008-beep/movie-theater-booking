import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import {
  createShow,
  getAllShows,
  initializeShowSeats,
  getShowSeatAvailability,
} from "../controllers/show.controller.js";

const router = Router();

router.use(authenticate, authorizeRoles("admin"));

router.route("/").post(createShow).get(getAllShows);
router.post("/:id/initialize-seats", initializeShowSeats);
router.get("/:id/seats", getShowSeatAvailability);

router.route("/")
  .post(createShow)
  .get(getAllShows);

export default router;
