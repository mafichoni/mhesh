"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Shield, Loader2 } from "lucide-react";

export interface GenerationProgressProps {
  styleTemplate?: string;
  stepText?: string;
  progress?: number;
  className?: string;
}

const DEFAULT_STEPS = [
  "Loading candidate LoRA identity model...",
  "Applying style template and Kenyan contextual lighting...",
  "Synthesizing high-resolution campaign composition...",
  "Embedding ODPC-compliant digital signatures and EXIF metadata...",
  "Finalizing formats for story, banner, and poster print...",
];

export function GenerationProgress({
  styleTemplate,
  stepText,
  progress: externalProgress,
  className = "",
}: GenerationProgressProps) {
  const [internalStepIdx, setInternalStepIdx] = useState(0);
  const [fakeProgress, setFakeProgress] = useState(10);

  useEffect(() => {
    if (externalProgress !== undefined) return;

    const interval = setInterval(() => {
      setFakeProgress((prev) => {
        if (prev >= 95) return 95;
        const inc = Math.floor(Math.random() * 8) + 4;
        return Math.min(prev + inc, 95);
      });
    }, 900);

    const stepInterval = setInterval(() => {
      setInternalStepIdx((prev) => (prev + 1) % DEFAULT_STEPS.length);
    }, 2800);

    return () => {
      clearInterval(interval);
      clearInterval(stepInterval);
    };
  }, [externalProgress]);

  const progress = externalProgress !== undefined ? externalProgress : fakeProgress;
  const currentStep = stepText || DEFAULT_STEPS[internalStepIdx];

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-50/50 to-white p-8 text-center shadow-lg dark:from-emerald-950/20 dark:to-neutral-900 ${className}`}
    >
      {/* Animated Sparkle Icon */}
      <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
          <Sparkles size={28} className="animate-spin-slow" />
        </div>
      </div>

      {/* Heading */}
      <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
        Generating Campaign Material
      </h3>

      {styleTemplate && (
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          Style: {styleTemplate.replace(/_/g, " ")}
        </p>
      )}

      {/* Current Step Description */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">
        <Loader2 size={14} className="animate-spin text-emerald-600" />
        <span>{currentStep}</span>
      </div>

      {/* Progress Bar */}
      <div className="mx-auto mt-5 max-w-md">
        <div className="flex justify-between text-[11px] font-semibold text-neutral-500">
          <span>Processing</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all duration-500 ease-out dark:bg-emerald-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Compliance Note */}
      <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
        <Shield size={13} className="text-emerald-600 dark:text-emerald-400" />
        <span>
          Auto-stamped with mandatory AI-generated tag and ODPC compliance hash.
        </span>
      </div>
    </div>
  );
}
