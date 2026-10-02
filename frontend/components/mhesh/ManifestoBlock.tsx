"use client";

import React, { useState } from "react";
import { ChevronDown, BookOpen } from "lucide-react";
import type { ManifestoItem } from "@/types/mhesh";

export interface ManifestoBlockProps {
  items?: ManifestoItem[];
  title?: string;
  defaultExpandedIndex?: number;
  className?: string;
}

export function ManifestoBlock({
  items = [],
  title = "Key Manifesto Pillars",
  defaultExpandedIndex = 0,
  className = "",
}: ManifestoBlockProps) {
  const [openIndices, setOpenIndices] = useState<Record<number, boolean>>({
    [defaultExpandedIndex]: true,
  });

  const toggleItem = (idx: number) => {
    setOpenIndices((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  if (!items || items.length === 0) {
    return (
      <div
        className={`rounded-2xl border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700 ${className}`}
      >
        <BookOpen className="mx-auto mb-2 text-neutral-400" size={28} />
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          No manifesto items published yet.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {title}
          </h2>
        </div>
      )}

      <div className="divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:divide-white/5 dark:border-white/10 dark:bg-neutral-900">
        {items.map((item, index) => {
          const isOpen = !!openIndices[index];
          const itemNum = String(index + 1).padStart(2, "0");

          return (
            <div key={`${item.title}-${index}`} className="group transition-colors">
              <button
                type="button"
                onClick={() => toggleItem(index)}
                className="flex w-full items-center justify-between p-4 text-left transition hover:bg-neutral-50 focus:outline-none dark:hover:bg-neutral-800/60"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
                    {itemNum}
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {item.title}
                  </span>
                </div>

                <ChevronDown
                  size={18}
                  className={`text-neutral-400 transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-emerald-600 dark:text-emerald-400" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                  <div className="rounded-xl bg-neutral-50/80 p-3.5 pl-4 border-l-2 border-emerald-500 dark:bg-neutral-800/40">
                    {item.description}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
