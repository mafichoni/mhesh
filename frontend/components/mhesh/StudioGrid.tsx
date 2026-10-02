"use client";

import React, { useState } from "react";
import { Download, ExternalLink, Image as ImageIcon, Sparkles } from "lucide-react";
import { AiGeneratedTag } from "./AiGeneratedTag";
import type { OutputFormat } from "@/types/mhesh";

export interface StudioGridItem {
  id?: string;
  url: string;
  style_template?: string;
  prompt?: string;
  formats?: (OutputFormat | string)[];
  format?: OutputFormat | string;
  created_at?: string;
  cost_kes?: number;
}

export type GenerationItem = StudioGridItem;

export interface StudioGridProps {
  items?: StudioGridItem[];
  generations?: StudioGridItem[];
  onOrderPrint?: (item: StudioGridItem) => void;
  className?: string;
}

const formatLabels: Record<string, string> = {
  story: "Story (9:16)",
  post: "Post (1:1)",
  billboard: "Billboard (16:9)",
  banner: "Banner (3:1)",
  tshirt: "T-Shirt",
  cap: "Cap",
  umbrella: "Umbrella",
  a3: "A3 Poster",
};

export function StudioGrid({
  items = [],
  generations,
  onOrderPrint,
  className = "",
}: StudioGridProps) {
  const allItems = items.length > 0 ? items : (generations || []);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  const handleDownload = async (url: string, filename = "mhesh-campaign.jpg") => {
    try {
      setDownloadingUrl(url);
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: direct window open
      window.open(url, "_blank");
    } finally {
      setDownloadingUrl(null);
    }
  };

  if (!items || items.length === 0) {
    return (
      <div
        className={`rounded-2xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700 ${className}`}
      >
        <Sparkles className="mx-auto mb-2 text-emerald-600 dark:text-emerald-400" size={32} />
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
          No generated campaign materials yet
        </h3>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Choose a campaign style template and generate photo-realistic visuals for your campaign.
        </p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {items.map((item, idx) => {
        const formats = item.formats || (item.format ? [item.format] : ["post"]);
        const isDownloading = downloadingUrl === item.url;

        return (
          <div
            key={item.id || `${item.url}-${idx}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-neutral-900"
          >
            {/* Image Preview Container */}
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.prompt || "AI Campaign Generation"}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
              />

              {/* Formats Overlay */}
              <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
                {formats.map((fmt) => (
                  <span
                    key={fmt}
                    className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm"
                  >
                    {formatLabels[fmt] || fmt}
                  </span>
                ))}
              </div>

              {/* Mandatory AI Generated Tag */}
              <AiGeneratedTag />
            </div>

            {/* Metadata & Actions */}
            <div className="flex flex-1 flex-col justify-between p-4">
              <div>
                {item.style_template && (
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {item.style_template.replace(/_/g, " ")}
                  </p>
                )}

                {item.prompt && (
                  <p className="mt-1 line-clamp-2 text-xs text-neutral-600 dark:text-neutral-300">
                    {item.prompt}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-black/5 pt-3 dark:border-white/5">
                <button
                  type="button"
                  onClick={() =>
                    handleDownload(
                      item.url,
                      `mhesh-${item.style_template || "campaign"}-${idx + 1}.jpg`
                    )
                  }
                  disabled={isDownloading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                >
                  <Download size={13} />
                  <span>{isDownloading ? "Downloading..." : "Download"}</span>
                </button>

                {onOrderPrint ? (
                  <button
                    type="button"
                    onClick={() => onOrderPrint(item)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    <ImageIcon size={13} />
                    <span>Print Order</span>
                  </button>
                ) : (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    title="Open original"
                  >
                    <ExternalLink size={13} />
                    <span>Full size</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
