import mongoose from "mongoose";

const theaterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    addressLine: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    pincode: {
      type: String,
      required: true,
      trim: true,
      match: /^[0-9]{6}$/,
    },

    contactPhone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20,
    },

    amenities: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate theater records at the same address.
theaterSchema.index({ name: 1, addressLine: 1, city: 1 }, { unique: true });

// Useful for filtering theaters by city and status.
theaterSchema.index({ city: 1, status: 1 });

const Theater = mongoose.model("Theater", theaterSchema);

export default Theater;
