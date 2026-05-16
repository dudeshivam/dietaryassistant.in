import crypto from "crypto";
import { NextResponse } from "next/server";
import { getRazorpayClient } from "@/lib/razorpay";
import { getPremiumSubscriptionFields } from "@/lib/subscription";
import { PREMIUM_PLAN } from "@/lib/subscription";
import { createClient } from "@/utils/supabase/server";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Please log in again." }, { status: 401 });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, error: "Missing payment details." }, { status: 400 });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay key secret is not configured.");
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedBuffer = Buffer.from(razorpay_signature);
    const isValid = expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isValid) {
      await supabase.from("payments").insert({
        user_id: user.id,
        razorpay_order_id,
        razorpay_payment_id,
        amount: 99,
        status: "failed"
      });

      return NextResponse.json({ success: false, error: "Payment verification failed." }, { status: 400 });
    }

    const razorpay = getRazorpayClient();
    const [order, payment] = await Promise.all([
      razorpay.orders.fetch(razorpay_order_id),
      razorpay.payments.fetch(razorpay_payment_id)
    ]);

    const isExpectedOrder =
      order?.id === razorpay_order_id &&
      order?.amount === PREMIUM_PLAN.amountInPaise &&
      order?.currency === PREMIUM_PLAN.currency &&
      order?.notes?.user_id === user.id;
    const isExpectedPayment =
      payment?.id === razorpay_payment_id &&
      payment?.order_id === razorpay_order_id &&
      payment?.amount === PREMIUM_PLAN.amountInPaise &&
      payment?.currency === PREMIUM_PLAN.currency &&
      ["authorized", "captured"].includes(payment?.status);

    if (!isExpectedOrder || !isExpectedPayment) {
      await supabase.from("payments").insert({
        user_id: user.id,
        razorpay_order_id,
        razorpay_payment_id,
        amount: PREMIUM_PLAN.price,
        status: "failed"
      });

      return NextResponse.json({ success: false, error: "Payment details are invalid." }, { status: 400 });
    }

    const subscriptionFields = getPremiumSubscriptionFields();

    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: user.id,
      razorpay_order_id,
      razorpay_payment_id,
      amount: PREMIUM_PLAN.price,
      status: "success"
    });

    if (paymentError) {
      throw paymentError;
    }

    const { error: profileError } = await supabase
      .from("users")
      .update(subscriptionFields)
      .eq("id", user.id);

    if (profileError) {
      throw profileError;
    }

    return NextResponse.json({
      success: true,
      subscription: subscriptionFields
    });
  } catch (error) {
    console.error("Razorpay payment verification failed:", error);

    return NextResponse.json({ success: false, error: "Unable to verify payment." }, { status: 500 });
  }
}
