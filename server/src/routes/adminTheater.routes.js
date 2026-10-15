import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import {
  createTheater,
  getAllTheaters,
  updateTheater,
  deleteTheater,
} from "../controllers/theater.controller.js";

const router = Router();

router.use(authenticate, authorizeRoles("admin"));

router.route("/").post(createTheater).get(getAllTheaters);

router.route("/:id").patch(updateTheater).delete(deleteTheater);

export default router;
