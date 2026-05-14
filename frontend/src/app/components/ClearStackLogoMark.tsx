/**
 * Brand mark: 2x2 color grid. Use `withChip` on light headers; omit on dark footer.
 */
export function ClearStackLogoMark({
  size = 14,
  withChip = true,
}: {
  size?: number;
  withChip?: boolean;
}) {
  const svg = (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="1" y="1" width="5" height="5" rx="1" fill="#e11d48" />
      <rect x="8" y="1" width="5" height="5" rx="1" fill="#f97316" />
      <rect x="1" y="8" width="5" height="5" rx="1" fill="#eab308" />
      <rect x="8" y="8" width="5" height="5" rx="1" fill="#16a34a" />
    </svg>
  );

  if (!withChip) {
    return svg;
  }

  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border border-[#e8e8ec] bg-white">
      {svg}
    </div>
  );
}
