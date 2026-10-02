import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ShieldCheck,
  Globe,
  Share2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { AspirantHero } from "@/components/mhesh/AspirantHero";
import { ManifestoBlock } from "@/components/mhesh/ManifestoBlock";
import { AchievementsBlock } from "@/components/mhesh/AchievementsBlock";
import { FollowButton } from "@/components/mhesh/FollowButton";
import { ShareButton } from "@/components/mhesh/ShareButton";
import { ReportButton } from "@/components/mhesh/ReportButton";
import type { AspirantProfile } from "@/types/mhesh";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PageProps {
  params: {
    slug: string;
  };
}

async function getAspirant(slug: string): Promise<AspirantProfile | null> {
  try {
    const res = await fetch(`${API_BASE}/api/mhesh/aspirants/${slug}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch aspirant: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const aspirant = await getAspirant(params.slug);
  if (!aspirant) {
    return {
      title: "Candidate Not Found — Mhesh Kenya 2027",
    };
  }

  const officeTitle = aspirant.office.replace(/_/g, " ").toUpperCase();
  const title = `${aspirant.display_name} — Candidate for ${officeTitle} (${aspirant.county}) | Mhesh`;
  const description = `${aspirant.display_name} is running for ${officeTitle} in ${aspirant.county} County for Kenya 2027. Read their verified manifesto, track record, and campaign priorities.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: aspirant.photo_url ? [aspirant.photo_url] : [],
      type: "profile",
    },
  };
}

export default async function AspirantPublicProfilePage({ params }: PageProps) {
  const aspirant = await getAspirant(params.slug);

  if (!aspirant) {
    notFound();
  }

  // Schema.org Person JSON-LD
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mhesh.ke";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: aspirant.display_name,
    alternateName: aspirant.official_name || undefined,
    jobTitle: `Candidate for ${aspirant.office.replace(/_/g, " ")}`,
    image: aspirant.photo_url || undefined,
    url: `${siteUrl}/mhesh/p/${aspirant.slug}`,
    ...(aspirant.party && {
      affiliation: {
        "@type": "PoliticalParty",
        name: aspirant.party,
      },
    }),
    homeLocation: {
      "@type": "AdministrativeArea",
      name: `${aspirant.county} County, Kenya`,
    },
    ...(aspirant.social_links && {
      sameAs: Object.values(aspirant.social_links).filter(Boolean),
    }),
  };

  const socialKeys = Object.entries(aspirant.social_links || {}).filter(
    ([, url]) => Boolean(url)
  );

  return (
    <>
      {/* Schema.org Person JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/mhesh/county/${aspirant.county.toLowerCase()}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 transition hover:text-[#0B6E4F] dark:text-neutral-400 dark:hover:text-emerald-400"
          >
            <ChevronLeft size={16} />
            <span>Back to {aspirant.county} Aspirants</span>
          </Link>

          <ReportButton subjectId={aspirant.slug} kind="profile" />
        </div>

        {/* Hero Section */}
        <AspirantHero aspirant={aspirant} />

        {/* Interactive Action Bar: Follow & Share */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center gap-3">
            <FollowButton
              slug={aspirant.slug}
              candidateName={aspirant.display_name}
            />
            <ShareButton
              slug={aspirant.slug}
              candidateName={aspirant.display_name}
              office={aspirant.office}
              county={aspirant.county}
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            <ShieldCheck size={16} className="text-[#0B6E4F]" />
            <span>M-Pesa Verified Candidate</span>
          </div>
        </div>

        {/* Profile Content Blocks */}
        <div className="mt-8 space-y-10">
          {/* Manifesto Block */}
          <ManifestoBlock items={aspirant.manifesto} />

          {/* Achievements / Track Record Block */}
          <AchievementsBlock items={aspirant.achievements} />

          {/* Social Links & Web Channels */}
          {socialKeys.length > 0 && (
            <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-[#0B6E4F]" />
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Official Campaign Channels
                </h3>
              </div>

              <div className="mt-4 flex flex-wrap gap-2.5">
                {socialKeys.map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs font-semibold text-neutral-800 transition hover:border-[#0B6E4F] hover:bg-emerald-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    <span className="capitalize">{platform}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Trust and Compliance Verification Info */}
          <div className="rounded-2xl border border-emerald-900/10 bg-emerald-50/50 p-6 dark:border-emerald-900/30 dark:bg-emerald-950/20">
            <div className="flex items-start gap-3">
              <ShieldCheck size={22} className="flex-shrink-0 text-[#0B6E4F]" />
              <div>
                <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Verified Candidate Profile
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-emerald-800/80 dark:text-emerald-300/80">
                  This profile has undergone Daraja STK mobile identity verification. All manifesto items and campaign statements are published directly by the campaign team under the Kenya Data Protection Act 2019 and IEBC regulations.
                </p>
                {aspirant.created_at && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                    <Calendar size={13} />
                    <span>Registered on Mhesh: {new Date(aspirant.created_at).toLocaleDateString("en-KE", { dateStyle: "long" })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
