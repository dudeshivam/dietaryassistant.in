function DumbbellIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
      viewBox="0 0 24 24"
    >
      <path d="M6.5 6.5 17.5 17.5" />
      <path d="m4 9 5-5" />
      <path d="m15 20 5-5" />
      <path d="m2.5 7.5 4-4" />
      <path d="m17.5 20.5 4-4" />
      <path d="m8.5 11.5 3-3" />
      <path d="m12.5 15.5 3-3" />
    </svg>
  );
}

export default function CoinIcon({ value, className = "", compact = false }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full bg-[#0B1E3C]/10 px-3 py-1 shadow-sm transition-all duration-200 hover:scale-105 ${className}`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-300/40 bg-gradient-to-br from-[#0B1E3C] via-[#1E3A8A] to-[#3B82F6] text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]">
        <DumbbellIcon />
      </div>
      {value !== undefined && (
        <span className={`font-semibold text-[#0B1E3C] ${compact ? "text-sm" : ""}`}>
          {value}
        </span>
      )}
    </div>
  );
}
