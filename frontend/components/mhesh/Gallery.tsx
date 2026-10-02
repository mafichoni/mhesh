"use client";

import React, { useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { AiGeneratedTag } from "./AiGeneratedTag";

export interface GalleryItem {
  id?: string;
  url: string;
  title?: string;
  is_ai?: boolean;
  format?: string;
}

export interface GalleryProps {
  images?: GalleryItem[];
  title?: string;
  className?: string;
}

export function Gallery({
  images = [],
  title = "Campaign Gallery",
  className = "",
}: GalleryProps) {
  const [activeImage, setActiveImage] = useState<GalleryItem | null>(null);

  if (!images || images.length === 0) {
    return (
      <div
        className={`rounded-2xl border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700 ${className}`}
      >
        <ImageIcon className="mx-auto mb-2 text-neutral-400" size={28} />
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          No campaign gallery images available yet.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {title}
          </h2>
          <span className="text-xs font-medium text-neutral-500">
            {images.length} {images.length === 1 ? "photo" : "photos"}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img, idx) => (
          <div
            key={img.id || `${img.url}-${idx}`}
            onClick={() => setActiveImage(img)}
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-black/10 bg-neutral-100 shadow-sm transition hover:opacity-95 dark:border-white/10 dark:bg-neutral-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.title || `Campaign photo ${idx + 1}`}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              loading="lazy"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

            {/* Title / Format if present */}
            {img.title && (
              <div className="absolute bottom-2 left-2 right-12 truncate text-[11px] font-medium text-white drop-shadow">
                {img.title}
              </div>
            )}

            {/* AI Generated Tag */}
            {img.is_ai && <AiGeneratedTag />}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {activeImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setActiveImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-neutral-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveImage(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white transition hover:bg-black/80"
              aria-label="Close image preview"
            >
              <X size={18} />
            </button>

            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImage.url}
                alt={activeImage.title || "Expanded preview"}
                className="max-h-[80vh] w-auto object-contain"
              />
              {activeImage.is_ai && <AiGeneratedTag />}
            </div>

            {activeImage.title && (
              <div className="p-4 text-center text-sm font-semibold text-white">
                {activeImage.title}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
