"use client";

import React, { useState } from "react";
import { Share2, Copy, Check, MessageSquare, Twitter, X, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";

interface ShareButtonProps {
  slug: string;
  candidateName: string;
  office?: string;
  county?: string;
  className?: string;
}

export function ShareButton({
  slug,
  candidateName,
  office,
  county,
  className = "",
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");

  const getShareLink = async (): Promise<string> => {
    if (shareUrl) return shareUrl;
    try {
      const res = await api.post(`/api/mhesh/aspirants/${slug}/share`);
      const url = res.data?.url;
      if (url) {
        setShareUrl(url);
        return url;
      }
    } catch {
      // Fallback to current browser location or constructed share path
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fallback = `${origin}/mhesh/s/${slug}`;
    setShareUrl(fallback);
    return fallback;
  };

  const handleOpen = async () => {
    const url = await getShareLink();
    const shareText = `Support ${candidateName}${office ? ` for ${office}` : ""}${county ? ` (${county})` : ""} on Mhesh 2027: ${url}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${candidateName} — Mhesh Campaign`,
          text: shareText,
          url: url,
        });
        return;
      } catch {
        // Fallback to modal if user cancelled or not allowed
      }
    }
    setIsOpen(true);
  };

  const handleCopy = async () => {
    const url = await getShareLink();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const shareText = `Check out ${candidateName}'s verified campaign profile for ${office || "office"} on Mhesh:`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl || ""}`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl || "")}&hashtags=Kenya2027,Mhesh`;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 active:scale-95 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 ${className}`}
      >
        <Share2 size={16} />
        <span>Share Profile</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900 dark:border dark:border-neutral-800">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Share Campaign Profile
            </h3>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
              Help amplify {candidateName}&apos;s vision with friends, constituents, and campaign networks.
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-800">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent px-2 text-xs text-neutral-800 outline-none dark:text-neutral-200"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <MessageSquare size={16} />
                  <span>WhatsApp</span>
                  <ExternalLink size={12} className="opacity-70" />
                </a>

                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                >
                  <Twitter size={16} />
                  <span>Post on X</span>
                  <ExternalLink size={12} className="opacity-70" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
