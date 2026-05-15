import { NextResponse } from "next/server";
import { getRazorpayClient } from "@/lib/razorpay";
import { PREMIUM_PLAN } from "@/lib/subscription";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please log in to upgrade." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("name, razorpay_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const razorpay = getRazorpayClient();
    let razorpayCustomerId = profile?.razorpay_customer_id || "";

    if (!razorpayCustomerId) {
      const customer = await razorpay.customers.create({
        name: profile?.name || user.email,
        email: user.email,
        notes: {
          user_id: user.id
        }
      });

      razorpayCustomerId = customer.id;

      await supabase
        .from("users")
        .update({ razorpay_customer_id: razorpayCustomerId })
        .eq("id", user.id);
    }

    const order = await razorpay.orders.create({
      amount: PREMIUM_PLAN.amountInPaise,
      currency: PREMIUM_PLAN.currency,
      receipt: `premium_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        user_id: user.id,
        customer_id: razorpayCustomerId,
        plan: PREMIUM_PLAN.name
      }
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Razorpay order creation failed:", error);

    return NextResponse.json(
      { error: error.message || "Unable to create payment order." },
      { status: 500 }
    );
  }
}
