import React from "react";
import Link from "next/link";
import { CheckCircle2, Clock, MapPin, Printer, Star, PackageCheck } from "lucide-react";
import type { PrintPartner } from "@/types/mhesh";

export interface PartnerCardProps {
  partner?: PrintPartner;
  slug?: string;
  businessName?: string;
  county?: string;
  capabilities?: string[];
  rating?: number;
  ordersCompleted?: number;
  turnaroundDays?: number | null;
  verified?: boolean;
  className?: string;
}

export function PartnerCard({
  partner,
  slug: propSlug,
  businessName: propBusinessName,
  county: propCounty,
  capabilities: propCapabilities,
  rating: propRating,
  ordersCompleted: propOrdersCompleted,
  turnaroundDays: propTurnaroundDays,
  verified: propVerified,
  className = "",
}: PartnerCardProps) {
  const slug = partner?.slug ?? propSlug ?? "";
  const businessName = partner?.business_name ?? propBusinessName ?? "Print Partner";
  const county = partner?.county ?? propCounty ?? "";
  const capabilities = partner?.capabilities ?? propCapabilities ?? [];
  const rating = partner?.rating ?? propRating ?? 5.0;
  const ordersCompleted = partner?.orders_completed ?? propOrdersCompleted ?? 0;
  const turnaroundDays = partner?.turnaround_days ?? propTurnaroundDays ?? 2;
  const verified = partner?.verified ?? propVerified ?? false;

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md dark:border-white/10 dark:bg-neutral-900 dark:hover:border-white/20 ${className}`}
    >
      <div>
        {/* Header with Icon, Name & Rating */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
              <Printer size={22} className="text-emerald-600 dark:text-emerald-400" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-neutral-900 transition group-hover:text-emerald-600 dark:text-neutral-100 dark:group-hover:text-emerald-400">
                  <Link href={`/mhesh/partners/${slug}`} className="focus:outline-none">
                    <span className="absolute inset-0" aria-hidden="true" />
                    {businessName}
                  </Link>
                </h3>
                {verified && (
                  <span title="Verified Print Partner">
                    <CheckCircle2
                      size={15}
                      className="flex-shrink-0 text-emerald-600 dark:text-emerald-400"
                    />
                  </span>
                )}
              </div>

              {county && (
                <div className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                  <MapPin size={12} className="text-neutral-400" />
                  <span>{county} County</span>
                </div>
              )}
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-400/10 dark:text-amber-400">
            <Star size={12} className="fill-amber-500 text-amber-500" />
            <span>{rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Capabilities Pills */}
        {capabilities.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {capabilities.slice(0, 4).map((cap) => (
              <span
                key={cap}
                className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 capitalize dark:bg-neutral-800 dark:text-neutral-300"
              >
                {cap.replace(/_/g, " ")}
              </span>
            ))}
            {capabilities.length > 4 && (
              <span className="rounded-md bg-neutral-50 px-1.5 py-0.5 text-[10px] text-neutral-400">
                +{capabilities.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Metrics Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-3 text-xs text-neutral-500 dark:border-white/5 dark:text-neutral-400">
        <div className="flex items-center gap-1">
          <Clock size={13} className="text-neutral-400" />
          <span>{turnaroundDays} {turnaroundDays === 1 ? "day" : "days"} turnaround</span>
        </div>

        <div className="flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
          <PackageCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
          <span>{ordersCompleted} orders done</span>
        </div>
      </div>
    </div>
  );
}
