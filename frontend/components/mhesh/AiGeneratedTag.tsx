export function AiGeneratedTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold ${className}`}
    >
      AI-generated
    </span>
  );
}
