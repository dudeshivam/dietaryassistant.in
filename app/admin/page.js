"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch("/api/admin/stats");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load stats.");
        }

        setStats(result);
      } catch (statsError) {
        setError(statsError.message || "Unable to load stats.");
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8">
      <section className="mx-auto w-full max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Admin</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-950">Payment Overview</h1>
            <p className="mt-2 text-sm text-slate-600">Revenue, active subscribers, and failed payment health.</p>
          </div>
          <Link className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700" href="/dashboard">
            Dashboard
          </Link>
        </header>

        {loading && <p className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">Loading payment stats...</p>}
        {error && <p className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">{error}</p>}

        {stats && (
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-semibold uppercase text-emerald-700">Total revenue</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-950">₹{Number(stats.totalRevenue || 0).toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-5">
              <p className="text-xs font-semibold uppercase text-sky-700">Active subscribers</p>
              <p className="mt-2 text-3xl font-semibold text-sky-950">{stats.activeSubscribers}</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-5">
              <p className="text-xs font-semibold uppercase text-red-700">Failed payments</p>
              <p className="mt-2 text-3xl font-semibold text-red-950">{stats.failedPayments}</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
