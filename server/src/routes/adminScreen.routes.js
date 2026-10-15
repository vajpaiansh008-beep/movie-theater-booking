import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import {
  createScreen,
  getAllScreens,
  updateScreen,
  deleteScreen,
} from "../controllers/screen.controller.js";

const router = Router();

router.use(authenticate, authorizeRoles("admin"));

router.route("/").post(createScreen).get(getAllScreens);

router.route("/:id").patch(updateScreen).delete(deleteScreen);

export default router;
