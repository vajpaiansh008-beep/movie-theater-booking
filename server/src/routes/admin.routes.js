import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import {
  createMovie,
  updateMovie,
  deleteMovie,
  getAdminMovies,
} from "../controllers/movie.controller.js";
import uploadPoster from "../middleware/uploadPoster.js";

const router = Router();

router.use(authenticate, authorizeRoles("admin"));

router.post("/movies", uploadPoster.single("poster"), createMovie);

router.patch("/movies/:id", uploadPoster.single("poster"), updateMovie);

router.delete("/movies/:id", deleteMovie);

router.get("/movies", getAdminMovies);

export default router;
