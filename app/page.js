import Link from "next/link";

function BrandMark({ className = "h-10 w-10", glow = true }) {
  return (
    <div className={`relative ${className}`}>
      {glow && <div className="absolute inset-0 rounded-full bg-blue-500/40 blur-xl" />}
      <div
        aria-hidden="true"
        className="relative h-full w-full overflow-hidden rounded-full border border-white/15 bg-[#071631] bg-no-repeat shadow-[0_0_32px_rgba(59,130,246,0.35)]"
        style={{
          backgroundImage: "url('/brand-logo.png')",
          backgroundPosition: "14.7% 50%",
          backgroundSize: "436% auto"
        }}
      />
    </div>
  );
}

function BrandName() {
  return (
    <span className="text-lg font-semibold tracking-tight">
      <span className="text-white">Dietary </span>
      <span className="bg-gradient-to-r from-[#3B82F6] to-[#93C5FD] bg-clip-text text-transparent">Assistant</span>
    </span>
  );
}

const features = [
  ["1", "AI Health Coach", "Adapts meals around energy, digestion, illness, injury, and your real routine."],
  ["2", "Smart Meal Reminders", "Keeps your day moving with gentle timing awareness and automatic updates."],
  ["3", "Hydration Intelligence", "Guides water timing based on meals, digestion, and how you feel."],
  ["4", "Dynamic Adjustments", "Rebalances the day when you skip, feel unwell, or need lighter meals."],
  ["5", "Nutrition Dashboard", "Track calories, protein, water, streaks, and health coins without pressure."],
  ["6", "Flexible Goals", "Recovery and consistency come before rigid targets when your body needs care."]
];

const steps = ["Input lifestyle", "Get adaptive plan", "Follow smart reminders", "Improve daily"];
const differences = [
  ["Adapts to your health", "Plans soften around stomach pain, sickness, injury, and low energy."],
  ["No rigid calorie pressure", "The coach focuses on recovery and hydration when numbers should wait."],
  ["Real-life practical meals", "Indian meals, lunchbox options, canteen fallbacks, and simple home food."]
];

function GlassCard({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_40px_rgba(59,130,246,0.12)] backdrop-blur-md ${className}`}>
      {children}
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="group relative mx-auto w-full max-w-xl">
      <div className="absolute inset-4 scale-110 rounded-[2rem] bg-blue-500/20 blur-2xl opacity-30 animate-[pulse_4s_ease-in-out_infinite]" />
      <img
        alt="Dietary Assistant Coach Focus dashboard preview"
        className="absolute inset-0 h-full w-full scale-110 rounded-[2rem] object-contain blur-2xl opacity-30"
        src="/product-preview.png"
      />
      <div className="relative rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_50px_rgba(59,130,246,0.25)] backdrop-blur-md transition-all duration-300 group-hover:-translate-y-1">
        <img
          alt="Coach Focus card showing calories, protein, water, and adaptive meal timeline"
          className="relative mx-auto w-full max-w-[28rem] rounded-[1.75rem] object-contain"
          src="/product-preview.png"
        />
        <div className="pointer-events-none absolute right-6 top-6 opacity-70">
          <BrandMark className="h-10 w-10" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.22),transparent_30%),linear-gradient(135deg,#0B1E3C_0%,#020617_70%)] text-white">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <Link className="flex items-center gap-3" href="/">
          <BrandMark className="h-10 w-10" />
          <BrandName />
        </Link>
        <div className="flex items-center gap-3">
          <Link className="hidden text-sm font-medium text-white/65 hover:text-white sm:inline" href="#how-it-works">How it works</Link>
          <Link className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur-md hover:bg-white/10" href="/login">Log in</Link>
        </div>
      </nav>

      <section className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-20 pt-10 lg:grid-cols-[0.96fr_1fr] lg:pt-20">
        <ProductPreview />
        <div className="relative lg:pl-4">
          <p className="mb-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-blue-100 backdrop-blur-md">
            AI nutrition that listens first
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight text-white sm:text-6xl">
            AI-powered personal health coach.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Your body changes daily. Your diet should too. Get real-time adaptive nutrition guidance, not fixed plans.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rounded-full bg-gradient-to-r from-[#3B82F6] to-[#6366F1] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_40px_rgba(59,130,246,0.35)] hover:scale-[1.02] transition" href="/signup">
              Start Free
            </Link>
            <Link className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 backdrop-blur-md hover:bg-white/10" href="#how-it-works">
              See How It Works
            </Link>
          </div>
          <p className="mt-5 text-sm text-slate-400">✓ Free trial &nbsp; ✓ No pressure &nbsp; ✓ Cancel anytime</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-semibold tracking-tight">Everything You Need to Stay Healthy</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(([number, title, copy]) => (
            <GlassCard className="p-5" key={title}>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-[22px] font-bold leading-none text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                {number}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{copy}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16" id="how-it-works">
        <h2 className="text-3xl font-semibold tracking-tight">Your AI Coach in 4 Simple Steps</h2>
        <div className="relative mt-10 grid gap-4 md:grid-cols-4">
          <div className="absolute left-8 right-8 top-8 hidden h-px bg-gradient-to-r from-blue-500/10 via-blue-400/70 to-blue-500/10 md:block" />
          {steps.map((step, index) => (
            <div className="relative" key={step}>
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-[#0B1E3C]/80 text-lg font-semibold text-blue-100 shadow-[0_0_30px_rgba(59,130,246,0.25)] backdrop-blur-md">
                {index + 1}
              </div>
              <p className="mt-4 text-base font-semibold text-white">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-semibold tracking-tight">Not strict. Just smart.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {differences.map(([title, copy]) => (
            <GlassCard className="p-6" key={title}>
              <h3 className="text-xl font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{copy}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-20">
        <GlassCard className="relative overflow-hidden p-8 text-center sm:p-10">
          <div className="absolute inset-x-20 -top-24 h-48 rounded-full bg-blue-500/25 blur-3xl" />
          <h2 className="relative text-3xl font-semibold tracking-tight">Start your health journey today</h2>
          <form className="relative mx-auto mt-6 flex max-w-xl flex-col gap-3 sm:flex-row" action="/signup">
            <input className="min-h-12 flex-1 rounded-full border border-white/10 bg-white/10 px-5 text-sm text-white outline-none placeholder:text-white/40 focus:border-blue-300" name="email" placeholder="Enter your email" type="email" />
            <button className="min-h-12 rounded-full bg-gradient-to-r from-[#3B82F6] to-[#6366F1] px-6 text-sm font-semibold text-white shadow-[0_0_40px_rgba(59,130,246,0.3)]" type="submit">
              Register
            </button>
          </form>
        </GlassCard>
      </section>
    </main>
  );
}
