import { createClient } from "../../../utils/supabase/server"; 
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: Request) {
  try {
    // 1. Validate Environment
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      console.error("Server Misconfiguration: STRIPE_SECRET_KEY is missing.");
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const stripe = new Stripe(secretKey);

    // 2. Authenticate User
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Parse Request
    const body = await request.json();
    const { priceId } = body;

    // 4. Create Stripe Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      // Dynamic Success/Cancel URLs
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?payment=cancelled`,
      customer_email: user.email,
      metadata: { userId: user.id },
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json(
      { error: "An error occurred during checkout." }, 
      { status: 500 }
    );
  }
}