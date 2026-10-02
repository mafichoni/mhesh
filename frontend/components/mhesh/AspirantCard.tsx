import React from "react";
import Link from "next/link";
import { User, MapPin, Award } from "lucide-react";
import { AspirantBadge } from "./AspirantBadge";
import type { AspirantProfile, MheshOffice } from "@/types/mhesh";

export interface AspirantCardProps {
  aspirant?: AspirantProfile;
  slug?: string;
  displayName?: string;
  photoUrl?: string | null;
  office?: MheshOffice | string;
  party?: string | null;
  county?: string;
  constituency?: string | null;
  ward?: string | null;
  trustScore?: number;
  verifiedMpesa?: boolean;
  tier?: string;
  className?: string;
}

function formatOffice(office?: string): string {
  if (!office) return "";
  switch (office.toLowerCase()) {
    case "president":
      return "President";
    case "governor":
      return "Governor";
    case "senator":
      return "Senator";
    case "woman_rep":
      return "Woman Representative";
    case "mp":
      return "Member of Parliament (MP)";
    case "mca":
      return "Member of County Assembly (MCA)";
    default:
      return office.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function AspirantCard({
  aspirant,
  slug: propSlug,
  displayName: propDisplayName,
  photoUrl: propPhotoUrl,
  office: propOffice,
  party: propParty,
  county: propCounty,
  constituency: propConstituency,
  ward: propWard,
  trustScore: propTrustScore,
  verifiedMpesa: propVerifiedMpesa,
  tier: propTier,
  className = "",
}: AspirantCardProps) {
  const slug = aspirant?.slug ?? propSlug ?? "";
  const displayName = aspirant?.display_name ?? propDisplayName ?? "Aspirant";
  const photoUrl = aspirant?.photo_url ?? propPhotoUrl;
  const office = aspirant?.office ?? propOffice ?? "";
  const party = aspirant?.party ?? propParty;
  const county = aspirant?.county ?? propCounty ?? "";
  const constituency = aspirant?.constituency ?? propConstituency;
  const ward = aspirant?.ward ?? propWard;
  const trustScore = aspirant?.trust_score ?? propTrustScore ?? 0;
  const verifiedMpesa = aspirant?.verified_mpesa ?? propVerifiedMpesa ?? false;
  const tier = aspirant?.tier ?? propTier ?? "free";

  const locationDetails = [county, constituency, ward].filter(Boolean).join(" • ");

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-neutral-900 ${className}`}
    >
      <div>
        <div className="flex items-start gap-4">
          {/* Aspirant Photo or Avatar */}
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border border-black/10 bg-neutral-100 dark:border-white/10 dark:bg-neutral-800">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={displayName}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-400">
                <User size={28} />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
              <Link href={`/mhesh/p/${slug}`} className="focus:outline-none">
                <span className="absolute inset-0" aria-hidden="true" />
                {displayName}
              </Link>
            </h3>

            <p className="truncate text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {formatOffice(office)}
            </p>

            {party && (
              <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                {party}
              </p>
            )}
          </div>
        </div>

        {/* Location */}
        {locationDetails && (
          <div className="mt-4 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <MapPin size={13} className="flex-shrink-0 text-neutral-400" />
            <span className="truncate">{locationDetails}</span>
          </div>
        )}
      </div>

      {/* Footer Badges */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-3 dark:border-white/5">
        <AspirantBadge
          verifiedMpesa={verifiedMpesa}
          trustScore={trustScore}
          tier={tier}
          size="sm"
        />

        <div className="flex items-center gap-1 text-xs font-medium text-neutral-400">
          <Award size={13} />
          <span>2027</span>
        </div>
      </div>
    </div>
  );
}
