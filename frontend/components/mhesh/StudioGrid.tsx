import React from "react";
import { Download, ExternalLink, Calendar, Coins, Sparkles } from "lucide-react";
import { AiGeneratedTag } from "./AiGeneratedTag";
import { shortDate } from "@/lib/api";

export interface GenerationItem {
  id: string;
  style_template: string;
  prompt: string;
  output_urls: string[];
  cost_kes: number;
  model: string;
  created_at: string;
  rejected?: boolean;
  rejection_reason?: string;
}

interface StudioGridProps {
  generations: GenerationItem[];
  emptyMessage?: string;
}

export function StudioGrid({ generations, emptyMessage = "No campaign media generated yet." }: StudioGridProps) {
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch {
      // Direct fallback
      window.open(url, "_blank");
    }
  };

  if (generations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white/50 p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-base font-semibold text-stone-900">No media yet</h3>
        <p className="mt-1 text-sm text-stone-500 max-w-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {generations.map((gen) =>
        gen.output_urls.map((url, idx) => {
          const itemKey = `${gen.id}-${idx}`;
          return (
            <div
              key={itemKey}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-stone-100">
                <img
                  src={url}
                  alt={gen.prompt || gen.style_template}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3">
                  <AiGeneratedTag size="sm" showSubtitle={false} />
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <button
                    onClick={() => handleDownload(url, `mhesh-${gen.style_template}-${gen.id.slice(0, 8)}.jpg`)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow-md backdrop-blur-sm hover:bg-white hover:text-emerald-700"
                    title="Download high-resolution image"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow-md backdrop-blur-sm hover:bg-white hover:text-emerald-700"
                    title="Open full size"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="font-semibold uppercase tracking-wider text-emerald-800">
                      {gen.style_template.replace(/_/g, " ")}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Coins className="h-3 w-3 text-amber-600" />
                      {gen.cost_kes} KES
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-stone-700 line-clamp-2">
                    {gen.prompt || "Kenyan campaign setting portrait."}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-xs text-stone-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {shortDate(gen.created_at)}
                  </span>
                  <span className="font-mono text-[10px] text-stone-400">{gen.model}</span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
