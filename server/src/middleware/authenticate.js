import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";

export const authenticate = async (req, res, next) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
      algorithms: ["HS256"],
      issuer: "movie-theater-booking",
      audience: "movie-theater-booking-client",
    });
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }

  if (
    typeof payload === "string" ||
    payload.type !== "access" ||
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string" ||
    !mongoose.isValidObjectId(payload.sub) ||
    !mongoose.isValidObjectId(payload.sid)
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid access token",
    });
  }

  try {
    const session = await Session.findOne({
      _id: payload.sid,
      user: payload.sub,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session is invalid or expired",
      });
    }

    const user = await User.findById(payload.sub).select(
      "_id name email role isActive",
    );

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is unavailable",
      });
    }

    req.user = user;
    req.session = session;

    next();
  } catch (error) {
    next(error);
  }
};
