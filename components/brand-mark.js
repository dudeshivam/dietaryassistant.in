export function BrandMark({ className = "h-12 w-12", glow = true }) {
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

export function BrandWordmark() {
  return (
    <span className="text-lg font-semibold tracking-tight">
      <span className="text-white">Dietary </span>
      <span className="bg-gradient-to-r from-[#3B82F6] to-[#93C5FD] bg-clip-text text-transparent">Assistant</span>
    </span>
  );
}
