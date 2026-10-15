import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    purpose: {
      type: String,
      enum: ["signup_phone"],
      required: true,
    },

    codeHash: {
      type: String,
      required: true,
      select: false,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    consumedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Only one active OTP record per user and purpose.
otpSchema.index({ user: 1, purpose: 1 }, { unique: true });

// Expired records are cleaned up automatically.
// Application code must still check expiresAt explicitly.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.model("OTP", otpSchema);

export default OTP;
