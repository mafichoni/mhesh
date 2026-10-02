export function AiGeneratedTag({
  className = "",
  size,
  showSubtitle,
}: {
  className?: string;
  size?: string;
  showSubtitle?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold ${className}`}
    >
      AI-generated {showSubtitle ? "· ODPC/IEBC Verified" : ""}
    </span>
  );
}
