function DumbbellIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M5 10h2v4H5v-4zm12 0h2v4h-2v-4zM8 9h2v6H8V9zm6 0h2v6h-2V9zM10 11h4v2h-4v-2z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function CoinIcon({ value, className = "", compact = false }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0B1E3C]/80 px-3 py-1 shadow-[0_0_15px_rgba(59,130,246,0.3)] backdrop-blur-lg transition-all duration-200 hover:scale-105 ${className}`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-[#0B1E3C] via-[#1E293B] to-[#3B82F6] text-white shadow-[inset_0_1px_8px_rgba(255,255,255,0.16),0_0_12px_rgba(59,130,246,0.4)]">
        <DumbbellIcon />
      </div>
      {value !== undefined && (
        <span className={`font-semibold tracking-wide text-white/90 ${compact ? "text-sm" : ""}`}>
          {value}
        </span>
      )}
    </div>
  );
}
