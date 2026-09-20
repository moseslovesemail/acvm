import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { updateUserBilling } from "@/lib/db";

function objectId(value: string | Stripe.Customer | Stripe.DeletedCustomer | Stripe.Subscription | null) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !webhookSecret || !signature) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 503 });
  }

  const stripe = new Stripe(secret);
  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = Number(session.metadata?.userId || session.client_reference_id || 0);
    const plan = session.metadata?.plan || "preview";
    await updateUserBilling({
      userId,
      plan,
      status: "active",
      customerId: objectId(session.customer as any),
      subscriptionId: objectId(session.subscription as any)
    });
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = Number(subscription.metadata?.userId || 0);
    const deleted = event.type === "customer.subscription.deleted";
    await updateUserBilling({
      userId,
      plan: deleted ? "preview" : (subscription.metadata?.plan || "preview"),
      status: deleted ? "cancelled" : subscription.status,
      customerId: objectId(subscription.customer as any),
      subscriptionId: subscription.id
    });
  }

  return NextResponse.json({ received: true });
}
