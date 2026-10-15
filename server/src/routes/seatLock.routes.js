import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { lockSeats, releaseSeats } from "../controllers/seatLock.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", lockSeats);
router.post("/release", releaseSeats);

export default router;
