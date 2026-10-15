import Theater from "../models/theater.model.js";
import mongoose from "mongoose";
import { createTheaterSchema, updateTheaterSchema } from "../utils/theater.validation.js";

export const createTheater = async (req, res, next) => {
  try {
    const result = createTheaterSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid theater details",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const theater = await Theater.create({
      ...result.data,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Theater created successfully",
      data: { theater },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A theater with this name and address already exists",
      });
    }

    next(error);
  }
};


export const getAllTheaters = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const requestedLimit = Number.parseInt(req.query.limit, 10) || 10;
    const limit = Math.min(50, Math.max(1, requestedLimit));

    const filter = {};

    if (req.query.city) {
      filter.city = req.query.city.trim();
    }

    if (req.query.status) {
      if (!["active", "inactive"].includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status filter",
        });
      }

      filter.status = req.query.status;
    }

    const [theaters, totalTheaters] = await Promise.all([
      Theater.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Theater.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        theaters,
        pagination: {
          currentPage: page,
          limit,
          totalTheaters,
          totalPages: Math.ceil(totalTheaters / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTheater = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid theater ID",
      });
    }

    const result = updateTheaterSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid theater details",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    if (Object.keys(result.data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    const theater = await Theater.findByIdAndUpdate(
      req.params.id,
      { $set: result.data },
      { new: true, runValidators: true }
    );

    if (!theater) {
      return res.status(404).json({
        success: false,
        message: "Theater not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Theater updated successfully",
      data: { theater },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A theater with this name and address already exists",
      });
    }

    next(error);
  }
};

export const deleteTheater = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid theater ID",
      });
    }

    const theater = await Theater.findByIdAndDelete(req.params.id);

    if (!theater) {
      return res.status(404).json({
        success: false,
        message: "Theater not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Theater deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
