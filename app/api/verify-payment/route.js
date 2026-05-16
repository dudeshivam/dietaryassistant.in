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
        amount: PREMIUM_PLAN.price,
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
      order?.currency === PREMIUM_PLAN.currency &&
      order?.notes?.user_id === user.id &&
      order?.notes?.original_amount === String(PREMIUM_PLAN.amountInPaise) &&
      Number(order?.amount) >= 100 &&
      Number(order?.amount) <= PREMIUM_PLAN.amountInPaise &&
      Number(order?.notes?.coins_redeemed || 0) <= PREMIUM_PLAN.amountInPaise - 100;
    const isExpectedPayment =
      payment?.id === razorpay_payment_id &&
      payment?.order_id === razorpay_order_id &&
      payment?.amount === order?.amount &&
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
    const coinsRedeemed = Math.max(Number(order?.notes?.coins_redeemed) || 0, 0);
    const purchaseBonusCoins = 100;

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("coins_balance, total_coins_earned, total_coins_spent")
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    const currentCoins = Math.max(Number(profile.coins_balance) || 0, 0);
    const safeCoinsRedeemed = Math.min(coinsRedeemed, currentCoins);
    const nextCoinsBalance = currentCoins - safeCoinsRedeemed + purchaseBonusCoins;
    const nextTotalCoinsEarned = (Number(profile.total_coins_earned) || 0) + purchaseBonusCoins;
    const nextTotalCoinsSpent = (Number(profile.total_coins_spent) || 0) + safeCoinsRedeemed;

    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: user.id,
      razorpay_order_id,
      razorpay_payment_id,
      amount: Number(payment.amount || order.amount || 0) / 100,
      status: "success"
    });

    if (paymentError) {
      throw paymentError;
    }

    const today = new Date().toISOString().slice(0, 10);
    const coinTransactions = [];

    if (safeCoinsRedeemed > 0) {
      coinTransactions.push({
        user_id: user.id,
        type: "redeem",
        coins: safeCoinsRedeemed,
        reason: "Premium discount redeemed",
        date: today
      });
    }

    coinTransactions.push({
      user_id: user.id,
      type: "bonus",
      coins: purchaseBonusCoins,
      reason: "Premium purchase bonus",
      date: today
    });

    const { error: coinTransactionError } = await supabase.from("coin_transactions").insert(coinTransactions);

    if (coinTransactionError) {
      throw coinTransactionError;
    }

    const { error: profileUpdateError } = await supabase
      .from("users")
      .update({
        ...subscriptionFields,
        coins_balance: nextCoinsBalance,
        total_coins_earned: nextTotalCoinsEarned,
        total_coins_spent: nextTotalCoinsSpent
      })
      .eq("id", user.id);

    if (profileUpdateError) {
      throw profileUpdateError;
    }

    return NextResponse.json({
      success: true,
      subscription: subscriptionFields,
      coins: {
        bonus: purchaseBonusCoins,
        redeemed: safeCoinsRedeemed,
        balance: nextCoinsBalance,
        totalEarned: nextTotalCoinsEarned,
        totalSpent: nextTotalCoinsSpent
      }
    });
  } catch (error) {
    console.error("Razorpay payment verification failed:", error);

    return NextResponse.json({ success: false, error: "Unable to verify payment." }, { status: 500 });
  }
}
