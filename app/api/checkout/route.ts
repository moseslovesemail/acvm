import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

const priceMap: Record<string, string | undefined> = {
  watch: process.env.STRIPE_PRICE_WATCH,
  intelligence: process.env.STRIPE_PRICE_INTELLIGENCE,
  pro: process.env.STRIPE_PRICE_PRO
};

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const plan = String(form.get("plan") ?? "");
  const price = priceMap[plan];
  const secret = process.env.STRIPE_SECRET_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  if (!secret || !price) {
    return NextResponse.json({
      error: "Stripe is not configured yet.",
      required: ["STRIPE_SECRET_KEY", `STRIPE_PRICE_${plan.toUpperCase()}`]
    }, { status:503 });
  }

  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity:1 }],
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/#pricing`,
    metadata: { plan }
  });

  return NextResponse.redirect(session.url!, 303);
}
