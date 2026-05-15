"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PREMIUM_PLAN, getSubscriptionState } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function UpgradePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const subscription = useMemo(() => getSubscriptionState(profile), [profile]);

  useEffect(() => {
    async function loadAccount() {
      const {
        data: { user: currentUser }
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);

      const { data: userProfile } = await supabase
        .from("users")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      setProfile(userProfile);
      setLoading(false);
    }

    loadAccount();
  }, [router]);

  async function handlePayment() {
    setPaying(true);
    setError("");
    setMessage("");

    try {
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        throw new Error("Unable to load Razorpay Checkout. Please check your connection and try again.");
      }

      if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY) {
        throw new Error("Razorpay public key is not configured.");
      }

      const orderResponse = await fetch("/api/create-order", { method: "POST" });
      const order = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(order.error || "Unable to create payment order.");
      }

      const checkout = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
        amount: order.amount,
        currency: order.currency,
        name: "Dietary Assistant",
        description: "Premium monthly subscription",
        order_id: order.id,
        prefill: {
          email: user?.email || "",
          name: profile?.name || ""
        },
        theme: {
          color: "#059669"
        },
        handler: async function verifyPayment(response) {
          setPaying(true);
          setError("");

          try {
            const verifyResponse = await fetch("/api/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(response)
            });
            const result = await verifyResponse.json();

            if (!verifyResponse.ok || !result.success) {
              throw new Error(result.error || "Payment verification failed.");
            }

            setProfile((current) => ({ ...current, ...result.subscription }));
            setMessage("Payment successful. Premium access is active for the next 30 days.");
            router.refresh();
          } catch (verifyError) {
            setError(verifyError.message || "Payment verification failed.");
          } finally {
            setPaying(false);
          }
        }
      });

      checkout.on("payment.failed", async function onPaymentFailed(response) {
        setError(response.error?.description || "Payment failed. Please try again.");
      });

      checkout.open();
    } catch (paymentError) {
      setError(paymentError.message || "Unable to start payment.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8">
      <section className="mx-auto w-full max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Premium access</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-950">Upgrade Dietary Assistant</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Keep AI plans, full meal customization, analytics, and premium tools available after your trial.
            </p>
          </div>
          <Link className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700" href="/dashboard">
            Dashboard
          </Link>
        </header>

        <section className="mt-8 grid gap-6 md:grid-cols-[1fr_0.8fr]">
          <article className="rounded-lg border border-emerald-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">{PREMIUM_PLAN.name} Plan</h2>
                <p className="mt-2 text-sm text-slate-600">30-day free trial for new users, then simple monthly access.</p>
              </div>
              <div className="rounded-lg bg-emerald-50 px-4 py-3 text-right">
                <p className="text-3xl font-semibold text-emerald-900">₹{PREMIUM_PLAN.price}</p>
                <p className="text-xs font-semibold uppercase text-emerald-700">per month</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {["Advanced AI-assisted diet plans", "Full diet customization", "Analytics and nutrition tracking", "Cancel anytime", "No hidden charges", "Secure Razorpay checkout"].map((item) => (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700" key={item}>
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              <p className="font-semibold text-slate-950">Payment terms</p>
              <p>Price: ₹{PREMIUM_PLAN.price}/month. No refund policy unless required by applicable law.</p>
              <p>Support: help.dietaryassistant@gmail.com</p>
            </div>

            {error && <p className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {message && <p className="mt-5 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}

            <button
              className="mt-6 w-full rounded-md bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              disabled={loading || paying || subscription.status === "premium"}
              onClick={handlePayment}
              type="button"
            >
              {subscription.status === "premium" ? "Premium Active" : paying ? "Opening Checkout..." : "Start Free Trial / Upgrade Now"}
            </button>
          </article>

          <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Current access</h2>
            <p className="mt-3 text-sm text-slate-600">
              Status: <span className="font-semibold capitalize text-slate-950">{subscription.status}</span>
            </p>
            {subscription.status === "trial" && (
              <p className="mt-2 text-sm text-amber-700">
                Trial remaining: {subscription.trialDaysLeft} day{subscription.trialDaysLeft === 1 ? "" : "s"}
              </p>
            )}
            {subscription.status === "premium" && (
              <p className="mt-2 text-sm text-emerald-700">
                Subscription remaining: {subscription.subscriptionDaysLeft} day{subscription.subscriptionDaysLeft === 1 ? "" : "s"}
              </p>
            )}
            <p className="mt-5 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">
              Payments are verified on the server with Razorpay signatures. Your secret key never reaches the browser.
            </p>
          </aside>
        </section>
      </section>
    </main>
  );
}
