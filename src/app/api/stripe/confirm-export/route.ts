import { getCurrentUser, pool } from "@/lib";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-05-27.dahlia",
});


export async function POST(req: Request) {
    const { paymentIntentId } = await req.json();

    if (!paymentIntentId) {
        return NextResponse.json({ message: "Payment Intent ID is required" }, { status: 400 })
    }

    // const user = await getCurrentUser();

    // if (!user) {
    //     return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    // }

    try {
        // const shop = await pool.query(`select id from shop_credentials where user_id = $1`, [user[0].id])

        // if (!shop) {
        //     return NextResponse.json({ message: "Invalid Shopify Domain. Do you have a shop configured?" }, { status: 404 })
        // }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        return Response.json({
            id: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            created: paymentIntent.created,
            metadata: paymentIntent.metadata,
        });

        

    } catch (error: any) {
        return NextResponse.json({ message: error.message ?? "Unexpacted Error" }, { status: 500 })
    }

}