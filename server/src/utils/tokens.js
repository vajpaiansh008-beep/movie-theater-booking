import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";

export const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");

export const createAccessToken = (userId, sessionId) =>
  jwt.sign(
    {
      sid: sessionId,
      type: "access",
    },
    process.env.JWT_ACCESS_SECRET,
    {
      subject: userId.toString(),
      expiresIn: "15m",
      issuer: "movie-theater-booking",
      audience: "movie-theater-booking-client",
    },
  );

export const createRefreshToken = (userId, sessionId) =>
  jwt.sign(
    {
      sid: sessionId,
      type: "refresh",
    },
    process.env.JWT_REFRESH_SECRET,
    {
      subject: userId.toString(),
      expiresIn: "7d",
      issuer: "movie-theater-booking",
      audience: "movie-theater-booking-client",
    },
  );
