import React from "react";
import { User, MapPin, Users, Share2, MessageCircle } from "lucide-react";
import { AspirantBadge } from "./AspirantBadge";
import type { AspirantProfile } from "@/types/mhesh";

export interface AspirantHeroProps {
  aspirant: AspirantProfile;
  className?: string;
  onFollowClick?: () => void;
  onShareClick?: () => void;
}

function formatOffice(office?: string): string {
  if (!office) return "";
  switch (office.toLowerCase()) {
    case "president":
      return "President of Kenya";
    case "governor":
      return "County Governor";
    case "senator":
      return "County Senator";
    case "woman_rep":
      return "County Woman Representative";
    case "mp":
      return "Member of Parliament";
    case "mca":
      return "Member of County Assembly";
    default:
      return office.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function AspirantHero({
  aspirant,
  className = "",
}: AspirantHeroProps) {
  const {
    slug,
    display_name,
    official_name,
    title_prefix,
    photo_url,
    office,
    party,
    county,
    constituency,
    ward,
    whatsapp_public,
    verified_mpesa,
    trust_score,
    tier,
    follower_count = 0,
    share_count = 0,
  } = aspirant;

  const fullName = title_prefix
    ? `${title_prefix} ${display_name}`
    : display_name;

  const locationText = [ward ? `${ward} Ward` : null, constituency, `${county} County`]
    .filter(Boolean)
    .join(", ");

  const cleanWhatsapp = whatsapp_public ? whatsapp_public.replace(/\D/g, "") : null;
  const whatsappUrl = cleanWhatsapp
    ? `/api/mhesh/aspirants/${slug}/whatsapp`
    : null;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-black/10 bg-gradient-to-b from-neutral-50 to-white p-6 shadow-sm md:p-8 dark:border-white/10 dark:from-neutral-900 dark:to-neutral-950 ${className}`}
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        {/* Left: Photo and Core Identity */}
        <div className="flex flex-col items-center gap-5 sm:flex-row md:items-start">
          <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-emerald-500/20 bg-neutral-200 shadow-inner sm:h-32 sm:w-32 dark:bg-neutral-800">
            {photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo_url}
                alt={display_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-400">
                <User size={48} />
              </div>
            )}
          </div>

          <div className="text-center sm:text-left">
            <div className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <AspirantBadge
                verifiedMpesa={verified_mpesa}
                trustScore={trust_score}
                tier={tier}
                size="md"
              />
            </div>

            <h1 className="text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl dark:text-neutral-50">
              {fullName}
            </h1>

            {official_name && official_name !== display_name && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Official IEBC Name: <span className="font-medium">{official_name}</span>
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-semibold text-emerald-700 sm:justify-start dark:text-emerald-400">
              <span>{formatOffice(office)} Candidate</span>
              {party && (
                <>
                  <span className="text-neutral-300 dark:text-neutral-600">•</span>
                  <span className="text-neutral-700 dark:text-neutral-300">{party}</span>
                </>
              )}
            </div>

            {locationText && (
              <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-neutral-500 sm:justify-start dark:text-neutral-400">
                <MapPin size={14} className="flex-shrink-0 text-emerald-600" />
                <span>{locationText}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Metrics & WhatsApp Action */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center md:flex-col md:items-end">
          {/* Counters */}
          <div className="flex items-center gap-4 text-xs text-neutral-600 dark:text-neutral-300">
            <div className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 font-medium dark:bg-neutral-800">
              <Users size={14} className="text-neutral-500" />
              <span>{follower_count.toLocaleString()} followers</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 font-medium dark:bg-neutral-800">
              <Share2 size={14} className="text-neutral-500" />
              <span>{share_count.toLocaleString()} shares</span>
            </div>
          </div>

          {/* WhatsApp Direct Action */}
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-95"
            >
              <MessageCircle size={16} />
              Chat on WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
