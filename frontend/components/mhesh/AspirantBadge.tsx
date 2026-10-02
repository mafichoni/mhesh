import React from "react";
import { CheckCircle2, ShieldCheck, Sparkles, Star } from "lucide-react";
import type { AspirantTier } from "@/types/mhesh";

export interface AspirantBadgeProps {
  verifiedMpesa?: boolean;
  trustScore?: number;
  tier?: AspirantTier | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AspirantBadge({
  verifiedMpesa = false,
  trustScore,
  tier = "free",
  size = "md",
  className = "",
}: AspirantBadgeProps) {
  const isFeatured = tier === "featured";
  const isVerifiedTier = tier === "verified" || isFeatured;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <div className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {/* Tier Badge */}
      {isFeatured && (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:bg-amber-400/10 dark:text-amber-400 dark:border-amber-400/30 ${sizeClasses[size]}`}
          title="Featured Aspirant"
        >
          <Sparkles size={iconSizes[size]} className="text-amber-500" />
          Featured
        </span>
      )}

      {isVerifiedTier && !isFeatured && (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400 dark:border-blue-400/30 ${sizeClasses[size]}`}
          title="Verified Aspirant Profile"
        >
          <Star size={iconSizes[size]} className="text-blue-500" />
          Verified
        </span>
      )}

      {/* M-Pesa Verification Badge */}
      {verifiedMpesa && (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/30 ${sizeClasses[size]}`}
          title="Verified via M-Pesa ID & payment"
        >
          <CheckCircle2 size={iconSizes[size]} className="text-emerald-600 dark:text-emerald-400" />
          M-Pesa Verified
        </span>
      )}

      {/* Trust Score */}
      {typeof trustScore === "number" && (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 ${sizeClasses[size]}`}
          title={`Trust Score: ${trustScore}/100`}
        >
          <ShieldCheck size={iconSizes[size]} className="text-gray-500 dark:text-neutral-400" />
          Trust: {trustScore}
        </span>
      )}
    </div>
  );
}
