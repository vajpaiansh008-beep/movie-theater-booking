import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import {
  signupSchema,
  verifyPhoneOtpSchema,
  loginSchema,
} from "../utils/auth.validation.js";
import jwt from "jsonwebtoken";
import Session from "../models/session.model.js";
import {
  hashToken,
  createAccessToken,
  createRefreshToken,
} from "../utils/tokens.js";
import OTP from "../models/otp.model.js";
import { generateOtp, hashOtp } from "../utils/otp.js";
import { sendPhoneOtp } from "../utils/phoneOtpDelivery.js";
import { timingSafeEqual } from "node:crypto";

// Signup: create an unverified account and send a phone OTP.

export const signup = async (req, res, next) => {
  try {
    const result = signupSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid signup details",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { name, email, password, phoneNumber, whatsappTicketOptIn } =
      result.data;

    const existingUser = await User.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email or phone number already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash,
      phoneNumber,
      phoneVerified: false,
      whatsappTicketOptIn,
      role: "customer",
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully. You can now log in.",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          whatsappTicketOptIn: user.whatsappTicketOptIn,
        },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email or phone number already exists",
      });
    }

    next(error);
  }
};

export const verifyPhoneOtp = async (req, res, next) => {
  try {
    // 1. Validate the request
    const result = verifyPhoneOtpSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification details",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { email, code } = result.data;

    // 2. Find the pending account
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    if (user.phoneVerified) {
      return res.status(200).json({
        success: true,
        message: "Phone number is already verified",
      });
    }

    // 3. Atomically reserve one verification attempt.
    // Expired, consumed, or exhausted OTPs cannot be used.
    const otp = await OTP.findOneAndUpdate(
      {
        user: user._id,
        purpose: "signup_phone",
        consumedAt: null,
        expiresAt: { $gt: new Date() },
        attempts: { $lt: 5 },
      },
      {
        $inc: { attempts: 1 },
      },
      {
        new: true,
      },
    ).select("+codeHash");

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP, or attempt limit reached",
      });
    }

    // 4. Hash the submitted code and compare safely
    const submittedHash = hashOtp(user._id.toString(), code);

    const storedBuffer = Buffer.from(otp.codeHash, "hex");
    const submittedBuffer = Buffer.from(submittedHash, "hex");

    const isValid =
      storedBuffer.length === submittedBuffer.length &&
      timingSafeEqual(storedBuffer, submittedBuffer);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // 5. Consume the OTP only if another request hasn't consumed it
    const consumedOtp = await OTP.findOneAndUpdate(
      {
        _id: otp._id,
        consumedAt: null,
      },
      {
        $set: { consumedAt: new Date() },
      },
      {
        new: true,
      },
    );

    if (!consumedOtp) {
      return res.status(400).json({
        success: false,
        message: "This OTP has already been used",
      });
    }

    // 6. Mark the user's phone as verified
    user.phoneVerified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Phone number verified successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          phoneVerified: user.phoneVerified,
          whatsappTicketOptIn: user.whatsappTicketOptIn,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const cookieBaseOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};

export const login = async (req, res, next) => {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid login details",
      });
    }

    const { email, password } = result.data;

    // Explicitly select the hidden password hash.
    const user = await User.findOne({ email }).select("+passwordHash");

    // Use a generic response to avoid revealing whether an email exists.
    if (!user || !user.isActive || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Create a session with a unique ID.
    const session = new Session({
      user: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: req.get("user-agent"),
    });

    const accessToken = createAccessToken(user._id, session._id);
    const refreshToken = createRefreshToken(user._id, session._id);

    // Store only the refresh token hash.
    session.refreshTokenHash = hashToken(refreshToken);
    await session.save();

    res.cookie("accessToken", accessToken, {
      ...cookieBaseOptions,
      path: "/",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      ...cookieBaseOptions,
      path: "/api/v1/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshSession = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // 1. Verify the refresh JWT
    let payload;

    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
        algorithms: ["HS256"],
        issuer: "movie-theater-booking",
        audience: "movie-theater-booking-client",
      });
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    if (
      payload.type !== "refresh" ||
      typeof payload.sub !== "string" ||
      typeof payload.sid !== "string" ||
      !/^[a-f\d]{24}$/i.test(payload.sub) ||
      !/^[a-f\d]{24}$/i.test(payload.sid)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // 2. Find the session and its stored refresh-token hash
    const session = await Session.findOne({
      _id: payload.sid,
      user: payload.sub,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).select("+refreshTokenHash");

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session expired or revoked",
      });
    }

    const oldHash = hashToken(refreshToken);

    if (session.refreshTokenHash !== oldHash) {
      return res.status(401).json({
        success: false,
        message: "Refresh token has already been rotated",
      });
    }

    // 3. Check the account is still allowed to log in
    const user = await User.findById(payload.sub).select(
      "name email role isActive phoneVerified",
    );

    if (!user || !user.isActive || !user.phoneVerified) {
      return res.status(401).json({
        success: false,
        message: "Account is not authorized",
      });
    }

    // 4. Create replacement tokens
    const newAccessToken = createAccessToken(user._id, session._id);

    const newRefreshToken = createRefreshToken(user._id, session._id);

    // 5. Atomically rotate the stored refresh-token hash.
    // Only one request using the old token can succeed.
    const updatedSession = await Session.findOneAndUpdate(
      {
        _id: session._id,
        user: user._id,
        refreshTokenHash: oldHash,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          refreshTokenHash: hashToken(newRefreshToken),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      { new: true },
    );

    if (!updatedSession) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is no longer valid",
      });
    }

    // 6. Set replacement HTTP-only cookies
    const secure = process.env.NODE_ENV === "production";

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/api/v1/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Session refreshed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    },
  });
};

// logout

export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    // Revoke the matching server-side session when the
    // refresh token is valid. Logout remains idempotent.
    if (refreshToken) {
      try {
        const payload = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET,
          {
            algorithms: ["HS256"],
            issuer: "movie-theater-booking",
            audience: "movie-theater-booking-client",
          },
        );

        if (
          payload.type === "refresh" &&
          typeof payload.sub === "string" &&
          typeof payload.sid === "string" &&
          /^[a-f\d]{24}$/i.test(payload.sub) &&
          /^[a-f\d]{24}$/i.test(payload.sid)
        ) {
          await Session.findOneAndUpdate(
            {
              _id: payload.sid,
              user: payload.sub,
              revokedAt: null,
            },
            {
              $set: { revokedAt: new Date() },
            },
          );
        }
      } catch {
        // Invalid or expired tokens must not prevent
        // cookie cleanup.
      }
    }

    // Cookie clearing options must match the original paths.
    const secure = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure,
      sameSite: "lax",
    };

    res.clearCookie("accessToken", {
      ...cookieOptions,
      path: "/",
    });

    res.clearCookie("refreshToken", {
      ...cookieOptions,
      path: "/api/v1/auth",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};
