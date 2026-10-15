import { createHmac, randomInt } from "node:crypto";

export const generateOtp = () =>
  randomInt(0, 1_000_000).toString().padStart(6, "0");

export const hashOtp = (userId, code) => {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret) {
    throw new Error("OTP_HASH_SECRET is not configured");
  }

  return createHmac("sha256", secret).update(`${userId}:${code}`).digest("hex");
};
