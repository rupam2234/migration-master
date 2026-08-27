import Razorpay from "razorpay";

export const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY!,
    key_secret: process.env.RAZORPAY_SECRET!,
});
// export const razorpay = new Razorpay({
//     key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY!,
//     key_secret: process.env.TEST_RAZORPAY_SECRET!,
// });

