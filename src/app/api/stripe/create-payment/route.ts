import { Stripe } from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
    const { amount } = await req.json();

    const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        automatic_payment_methods: { enabled: true }, // enables Google Pay, Apple Pay, card automatically
    });

    return Response.json({ clientSecret: paymentIntent.client_secret });
}