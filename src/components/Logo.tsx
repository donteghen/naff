/** NAFF mark: an amber "N" on a navy tile, with the word mark. */
export function Logo({ size = 26, onDark = false, withText = true }: { size?: number; onDark?: boolean; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="NAFF">
        <rect width="40" height="40" rx="11" fill={onDark ? "transparent" : "#0B1B3F"} />
        <path d="M11 29V11l18 18V11" fill="none" stroke="#FFB81C" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {withText && <b className={`tracking-[2px] ${onDark ? "text-white" : "text-navy"}`} style={{ fontSize: size * 0.72 }}>NAFF</b>}
    </span>
  );
}
