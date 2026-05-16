"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

function transactionSign(type) {
  return type === "penalty" || type === "redeem" ? "-" : "+";
}

function transactionColor(type) {
  if (type === "penalty" || type === "redeem") return "text-red-700";
  if (type === "bonus") return "text-amber-700";
  return "text-emerald-700";
}

export default function CoinHistoryPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCoins() {
      setLoading(true);
      setError("");

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const [{ data: userProfile, error: profileError }, { data: coinTransactions, error: transactionError }] = await Promise.all([
        supabase
          .from("users")
          .select("coins_balance, total_coins_earned, total_coins_spent")
          .eq("id", user.id)
          .single(),
        supabase
          .from("coin_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100)
      ]);

      if (profileError || transactionError) {
        setError(profileError?.message || transactionError?.message || "Unable to load coin history.");
        setLoading(false);
        return;
      }

      setProfile(userProfile);
      setTransactions(coinTransactions || []);
      setLoading(false);
    }

    loadCoins();
  }, [router]);

  const summary = useMemo(() => ({
    balance: Math.max(Number(profile?.coins_balance) || 0, 0),
    earned: Math.max(Number(profile?.total_coins_earned) || 0, 0),
    spent: Math.max(Number(profile?.total_coins_spent) || 0, 0)
  }), [profile]);

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8">
      <section className="mx-auto w-full max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-700">Coin History</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-950">Your Health Coins</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Earn coins by staying consistent and redeem them for premium discounts.</p>
          </div>
          <Link className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700" href="/dashboard">
            Dashboard
          </Link>
        </header>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-semibold uppercase text-amber-700">Coins balance</p>
            <p className="mt-2 text-3xl font-semibold text-amber-950">🪙 {summary.balance}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-semibold uppercase text-emerald-700">Total earned</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-950">{summary.earned}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-5">
            <p className="text-xs font-semibold uppercase text-red-700">Redeemed or penalties</p>
            <p className="mt-2 text-3xl font-semibold text-red-950">{summary.spent}</p>
          </div>
        </div>

        {loading && <p className="mt-8 rounded-lg border border-slate-200 bg-white p-5 text-slate-600">Loading coin history...</p>}
        {error && <p className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">{error}</p>}

        {!loading && !error && (
          <section className="mt-8 rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-semibold text-slate-950">Transactions</h2>
            </div>
            {transactions.length === 0 && (
              <p className="p-5 text-sm text-slate-600">No coin activity yet.</p>
            )}
            <div className="divide-y divide-slate-100">
              {transactions.map((transaction) => (
                <div className="flex items-center justify-between gap-3 p-5 text-sm" key={transaction.id}>
                  <div>
                    <p className="font-semibold text-slate-950">{transaction.reason}</p>
                    <p className="mt-1 text-xs capitalize text-slate-500">
                      {transaction.type} · {new Date(transaction.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`font-semibold ${transactionColor(transaction.type)}`}>
                    {transactionSign(transaction.type)}{transaction.coins} coins
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
