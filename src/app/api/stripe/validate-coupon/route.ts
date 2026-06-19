import Stripe from "Stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
    const { code } = await req.json();

    try {
        const promoCodes = await stripe.promotionCodes.list({
            code,
            active: true,
            limit: 1,
            expand: ["data.promotion.coupon"], // must expand to get coupon details
        });

        const promoCode = promoCodes.data[0];

        if (!promoCode) {
            return Response.json({ error: "Invalid coupon" }, { status: 400 });
        }

        const coupon = (promoCode.promotion as any)?.coupon;

        if (!coupon || !coupon.valid) {
            return Response.json({ error: "Coupon expired" }, { status: 400 });
        }

        return Response.json({ discount: coupon.percent_off ?? 0 });
    } catch (err: any) {
        return Response.json({ error: err.message ?? "Invalid coupon" }, { status: 400 });
    }
}