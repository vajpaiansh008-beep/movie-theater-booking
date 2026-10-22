
import "dotenv/config";
import razorpay from "./config/razorpay.js";

console.log("Razorpay SDK initialized successfully.");
console.log("Razorpay Key ID loaded:", Boolean(process.env.RAZORPAY_KEY_ID));
console.log("Razorpay instance ready:", Boolean(razorpay));
