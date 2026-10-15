export const sendPhoneOtp = async ({ phoneNumber, code }) => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Phone OTP delivery provider is not configured");
  }

  // Development only. Never log OTPs in production.
  console.log(`[DEV OTP] Phone: ${phoneNumber} | Code: ${code}`);
};
