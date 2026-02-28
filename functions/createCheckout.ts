import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

const PRICES = {
  listing_fee: "price_1T5ulwB8cgd2XnDD5LTm5MZf",       // $9.99 one-time
  premium_subscription: "price_1T5ulwB8cgd2XnDD9R2Le0d5", // $4.99/month
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, success_url, cancel_url } = body;

    if (!PRICES[type]) {
      return Response.json({ error: "Invalid payment type" }, { status: 400 });
    }

    const isSubscription = type === "premium_subscription";

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      line_items: [{ price: PRICES[type], quantity: 1 }],
      success_url: success_url || `${req.headers.get("origin") || "https://app.base44.com"}?payment=success&type=${type}`,
      cancel_url: cancel_url || `${req.headers.get("origin") || "https://app.base44.com"}?payment=cancelled`,
      customer_email: user.email,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        user_email: user.email,
        payment_type: type,
      },
    });

    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});