"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface CountySelectProps {
  currentCounty: string;
  counties: string[];
}

export function CountySelect({ currentCounty, counties }: CountySelectProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-neutral-500">Other Counties:</span>
      <select
        value={currentCounty.toLowerCase()}
        onChange={(e) => {
          if (e.target.value) {
            router.push(`/mhesh/county/${e.target.value}`);
          }
        }}
        className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-800 outline-none focus:border-[#0B6E4F] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
      >
        {counties.map((c) => (
          <option key={c} value={c.toLowerCase()}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
