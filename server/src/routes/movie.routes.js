import { Router } from "express";
import {
  getPublishedMovies,
  getPublishedMovieBySlug,
} from "../controllers/publicMovie.controller.js";

const router = Router();

router.get("/", getPublishedMovies);
router.get("/:slug", getPublishedMovieBySlug);

export default router;
