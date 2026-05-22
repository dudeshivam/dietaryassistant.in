"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandMark, BrandWordmark } from "@/components/brand-mark";

function Toggle({ enabled, onChange }) {
  return (
    <button
      aria-pressed={enabled}
      className={`flex h-7 w-12 items-center rounded-full border border-white/10 p-1 ${
        enabled ? "bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]" : "bg-white/10"
      }`}
      onClick={() => onChange(!enabled)}
      type="button"
    >
      <span className={`h-5 w-5 rounded-full bg-white transition ${enabled ? "translate-x-5" : ""}`} />
    </button>
  );
}

function SettingRow({ children, description, enabled, onChange, title }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
      <div>
        <h2 className="font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-300">{description}</p>
      </div>
      {children || <Toggle enabled={enabled} onChange={onChange} />}
    </div>
  );
}

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(false);
  const [smartTiming, setSmartTiming] = useState(true);

  return (
    <main className="min-h-screen px-4 py-8">
      <section className="mx-auto w-full max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandMark className="h-12 w-12" />
            <div>
              <BrandWordmark />
              <p className="mt-1 text-sm text-slate-300">Settings</p>
            </div>
          </div>
          <Link className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90" href="/dashboard">
            Dashboard
          </Link>
        </header>

        <div className="mt-8 grid gap-5">
          <section className="premium-card p-5">
            <p className="text-sm font-semibold text-blue-300">Notifications</p>
            <div className="mt-4 grid gap-3">
              <SettingRow description="Meal reminders, auto-skip nudges, and hydration prompts." enabled={notifications} onChange={setNotifications} title="Smart reminders" />
              <SettingRow description="Let AI shift reminder timing around class, work, and commute." enabled={smartTiming} onChange={setSmartTiming} title="Adaptive reminder timing" />
            </div>
          </section>

          <section className="premium-card p-5">
            <p className="text-sm font-semibold text-blue-300">Sound / Ringtone</p>
            <div className="mt-4 grid gap-3">
              <SettingRow description="Use a calm chime when a meal reminder is due." enabled={sound} onChange={setSound} title="Reminder sound" />
            </div>
          </section>

          <section className="premium-card p-5">
            <p className="text-sm font-semibold text-blue-300">Account</p>
            <div className="mt-4 grid gap-3">
              <SettingRow description="Manage profile, health notes, subscription, and account safety." title="Profile and account">
                <Link className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500/20" href="/profile">
                  Open
                </Link>
              </SettingRow>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
