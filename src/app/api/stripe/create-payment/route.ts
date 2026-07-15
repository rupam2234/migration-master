import { Stripe } from 'stripe'
import { PRICE_PER_ITEM } from '../default-price';
import { getCouponDiscount } from '../getCoupon';
import { NextRequest, NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
    const { itemCount, coupon, paymentIntentId } = await req.json();

    if (!Number.isInteger(itemCount) || itemCount < 1) {
        return NextResponse.json({ error: "Invalid itemCount" }, { status: 400 });
    }

    const subtotal = itemCount * PRICE_PER_ITEM;
    const discount = await getCouponDiscount(coupon);
    const total = subtotal * (1 - discount / 100);
    const amountInCents = Math.round(total * 100);

    if (amountInCents === 0) {
        return NextResponse.json({ clientSecret: null, amount: 0 });
    }

    if (paymentIntentId) {
        const paymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
            amount: amountInCents < 50 ? 50 : amountInCents,
            metadata: { itemCount, coupon: coupon ?? "" },
        });
        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            amount: amountInCents,
        });
    }

    const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents < 50 ? 50 : amountInCents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: { itemCount, coupon: coupon ?? "" },
    });

    return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        amount: amountInCents,
        paymentIntentId: paymentIntent.id,
    });
}