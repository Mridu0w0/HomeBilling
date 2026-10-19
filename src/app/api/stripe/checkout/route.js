// src/app/api/stripe/checkout/route.js
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const { ownerId, ownerName, ownerEmail, flatNumber, month, amount } =
      await req.json();

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount." },
        { status: 400 },
      );
    }

    // Convert to cents for Stripe
    const unitAmount = Math.round(parsedAmount * 100);
    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Home Billing Dues: ${month}`,
              description: `Shared building utility & maintenance share for ${
                ownerName || "Owner"
              } (${flatNumber || "Unit"})`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: ownerEmail || undefined,
      metadata: {
        ownerId,
        month,
        amount: parsedAmount.toString(),
      },
      success_url: `${origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}&owner_id=${ownerId}&month=${encodeURIComponent(
        month,
      )}`,
      cancel_url: `${origin}/dashboard?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session error:", err);
    return NextResponse.json(
      { error: err.message || "Unable to initiate payment session." },
      { status: 500 },
    );
  }
}
