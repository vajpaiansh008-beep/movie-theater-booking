import mongoose from "mongoose";
import Screen from "../models/screen.model.js";
import Theater from "../models/theater.model.js";
import {
  createScreenSchema,
  updateScreenSchema,
} from "../utils/screen.validation.js";

export const createScreen = async (req, res, next) => {
  try {
    const result = createScreenSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid screen details",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { theaterId, ...screenData } = result.data;

    const theater = await Theater.findById(theaterId);

    if (!theater) {
      return res.status(404).json({
        success: false,
        message: "Theater not found",
      });
    }

    if (theater.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Cannot add a screen to an inactive theater",
      });
    }

    const screen = await Screen.create({
      ...screenData,
      theater: theater._id,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Screen created successfully",
      data: { screen },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A screen with this name already exists in this theater",
      });
    }

    next(error);
  }
};

export const getAllScreens = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const requestedLimit = Number.parseInt(req.query.limit, 10) || 10;
    const limit = Math.min(50, Math.max(1, requestedLimit));

    const filter = {};

    if (req.query.theaterId !== undefined) {
      if (!mongoose.isValidObjectId(req.query.theaterId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid theater ID",
        });
      }

      filter.theater = req.query.theaterId;
    }

    if (req.query.status !== undefined) {
      if (!["active", "inactive"].includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status filter",
        });
      }

      filter.status = req.query.status;
    }

    const [screens, totalScreens] = await Promise.all([
      Screen.find(filter)
        .populate("theater", "name city state")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Screen.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        screens,
        pagination: {
          currentPage: page,
          limit,
          totalScreens,
          totalPages: Math.ceil(totalScreens / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateScreen = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid screen ID",
      });
    }

    const result = updateScreenSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid screen details",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const screen = await Screen.findByIdAndUpdate(
      req.params.id,
      { $set: result.data },
      { new: true, runValidators: true },
    );

    if (!screen) {
      return res.status(404).json({
        success: false,
        message: "Screen not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Screen updated successfully",
      data: { screen },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A screen with this name already exists in this theater",
      });
    }

    next(error);
  }
};

export const deleteScreen = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid screen ID",
      });
    }

    const screen = await Screen.findByIdAndDelete(req.params.id);

    if (!screen) {
      return res.status(404).json({
        success: false,
        message: "Screen not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Screen deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
