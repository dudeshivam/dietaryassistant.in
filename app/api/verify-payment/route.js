import crypto from "crypto";
import { NextResponse } from "next/server";
import { getPremiumSubscriptionFields } from "@/lib/subscription";
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

    const subscriptionFields = getPremiumSubscriptionFields();

    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: user.id,
      razorpay_order_id,
      razorpay_payment_id,
      amount: 99,
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

    return NextResponse.json(
      { success: false, error: error.message || "Unable to verify payment." },
      { status: 500 }
    );
  }
}
