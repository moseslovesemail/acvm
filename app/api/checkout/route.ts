import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const priceMap: Record<string, string | undefined> = {
  watch: process.env.STRIPE_PRICE_WATCH,
  intelligence: process.env.STRIPE_PRICE_INTELLIGENCE,
  pro: process.env.STRIPE_PRICE_PRO
};

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  if (["active", "trialing"].includes(String(user.subscription_status))) {\n    return NextResponse.redirect(new URL("/account?billing=already-active", request.url), 303);\n  }\n\n  const form = await request.formData();
  const plan = String(form.get("plan") ?? "");
  const price = priceMap[plan];
  const secret = process.env.STRIPE_SECRET_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  if (!secret || !price) {
    return NextResponse.redirect(new URL("/account?billing=not-configured", request.url), 303);
  }

  const stripe = new Stripe(secret);
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    client_reference_id: String(user.id),
    success_url: baseUrl + "/account?billing=success",
    cancel_url: baseUrl + "/#pricing",
    metadata: { plan, userId: String(user.id) },
    subscription_data: { metadata: { plan, userId: String(user.id) } }
  };

  if (user.stripe_customer_id) params.customer = String(user.stripe_customer_id);
  else params.customer_email = String(user.email);

  const session = await stripe.checkout.sessions.create(params);
  return NextResponse.redirect(session.url!, 303);
}
