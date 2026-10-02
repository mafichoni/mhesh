import React from "react";
import { Award, Calendar } from "lucide-react";
import type { AchievementItem } from "@/types/mhesh";

export interface AchievementsBlockProps {
  items?: AchievementItem[];
  title?: string;
  className?: string;
}

export function AchievementsBlock({
  items = [],
  title = "Track Record & Key Achievements",
  className = "",
}: AchievementsBlockProps) {
  if (!items || items.length === 0) {
    return (
      <div
        className={`rounded-2xl border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700 ${className}`}
      >
        <Award className="mx-auto mb-2 text-neutral-400" size={28} />
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          No track record items listed yet.
        </p>
      </div>
    );
  }

  // Sort descending by year if available
  const sortedItems = [...items].sort((a, b) => {
    const yearA = a.year ?? 0;
    const yearB = b.year ?? 0;
    return yearB - yearA;
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <div className="flex items-center gap-2">
          <Award size={20} className="text-amber-500" />
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {title}
          </h2>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sortedItems.map((item, idx) => (
          <div
            key={`${item.title}-${idx}`}
            className="flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition hover:border-black/20 dark:border-white/10 dark:bg-neutral-900 dark:hover:border-white/20"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                  <Calendar size={12} />
                  {item.year ? item.year : "Achievement"}
                </span>
              </div>

              <h3 className="mt-3 text-base font-bold text-neutral-900 dark:text-neutral-100">
                {item.title}
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
