import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function getCouponDiscount(coupon?: string): Promise<number> {
    if (!coupon) return 0;
    try {
        const promoCodes = await stripe.promotionCodes.list({
            code: coupon.trim().toUpperCase(),
            active: true,
            limit: 1,
            expand: ["data.promotion.coupon"],
        });
        const couponObj = (promoCodes.data[0]?.promotion as any)?.coupon;
        return couponObj?.percent_off ?? 0;
    } catch (e) {
        console.error("getCouponDiscount failed:", e);
        return 0;
    }
}