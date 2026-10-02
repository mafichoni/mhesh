import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, ChevronLeft, Vote, Filter } from "lucide-react";
import { AspirantCard } from "@/components/mhesh/AspirantCard";
import { CountySelect } from "@/components/mhesh/CountySelect";
import type { AspirantProfile } from "@/types/mhesh";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const KENYA_COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo Marakwet", "Embu", "Garissa",
  "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi",
  "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu",
  "Machakos", "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa",
  "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua",
  "Nyeri", "Samburu", "Siaya", "Taita Taveta", "Tana River", "Tharaka-Nithi",
  "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot"
];

interface PageProps {
  params: {
    county: string;
  };
  searchParams?: {
    office?: string;
  };
}

function formatCountyName(raw: string): string {
  const decoded = decodeURIComponent(raw).replace(/[-_]/g, " ");
  return decoded.charAt(0).toUpperCase() + decoded.slice(1);
}

async function getCountyAspirants(county: string): Promise<AspirantProfile[]> {
  try {
    // Try /api/mhesh/aspirants?county= first as it gives full AspirantPublic schema
    const res = await fetch(`${API_BASE}/api/mhesh/aspirants?county=${encodeURIComponent(county)}`, {
      next: { revalidate: 30 },
    });
    if (res.ok) {
      return await res.json();
    }
    // Fallback to /api/mhesh/county/{county}
    const fallbackRes = await fetch(`${API_BASE}/api/mhesh/county/${encodeURIComponent(county)}`, {
      next: { revalidate: 30 },
    });
    if (fallbackRes.ok) {
      return await fallbackRes.json();
    }
    return [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const countyName = formatCountyName(params.county);
  return {
    title: `${countyName} County Candidates — Mhesh Kenya 2027`,
    description: `Browse verified political aspirants running for Governor, Senator, Woman Rep, MP, and MCA in ${countyName} County for the Kenya 2027 General Election.`,
  };
}

export default async function CountyAspirantsPage({ params, searchParams }: PageProps) {
  const countyName = formatCountyName(params.county);
  const aspirants = await getCountyAspirants(params.county);
  const selectedOffice = searchParams?.office?.toLowerCase();

  const filteredAspirants = selectedOffice
    ? aspirants.filter((a) => a.office?.toLowerCase() === selectedOffice)
    : aspirants;

  const officeCounts: Record<string, number> = {};
  for (const asp of aspirants) {
    const off = asp.office?.toLowerCase() || "other";
    officeCounts[off] = (officeCounts[off] || 0) + 1;
  }

  const officesList = [
    { key: "all", label: "All Offices", count: aspirants.length },
    { key: "governor", label: "Governor", count: officeCounts["governor"] || 0 },
    { key: "senator", label: "Senator", count: officeCounts["senator"] || 0 },
    { key: "woman_rep", label: "Woman Rep", count: officeCounts["woman_rep"] || 0 },
    { key: "mp", label: "MP", count: officeCounts["mp"] || 0 },
    { key: "mca", label: "MCA", count: officeCounts["mca"] || 0 },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button & County switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/mhesh"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-[#0B6E4F] dark:text-neutral-400 dark:hover:text-emerald-400"
        >
          <ChevronLeft size={16} />
          <span>Back to National Directory</span>
        </Link>

        {/* Quick switcher */}
        <CountySelect
          currentCounty={params.county}
          counties={KENYA_COUNTIES}
        />
      </div>

      {/* Header Banner */}
      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-neutral-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0B6E4F]">
              <MapPin size={15} />
              <span>County Government Candidates</span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
              {countyName} County
            </h1>
            <p className="mt-1.5 text-xs text-neutral-600 sm:text-sm dark:text-neutral-400">
              Verified aspirants running across {countyName} in Kenya&apos;s 2027 General Election.
            </p>
          </div>

          <div className="rounded-2xl border border-black/5 bg-neutral-50 p-4 text-center dark:border-white/5 dark:bg-neutral-800">
            <span className="text-2xl font-black text-[#0B6E4F] sm:text-3xl">
              {aspirants.length}
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Verified Candidates
            </p>
          </div>
        </div>

        {/* Office Filters */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-black/5 pt-6 dark:border-white/5">
          {officesList.map((off) => {
            const isSelected =
              (off.key === "all" && !selectedOffice) ||
              selectedOffice === off.key;
            const href =
              off.key === "all"
                ? `/mhesh/county/${params.county.toLowerCase()}`
                : `/mhesh/county/${params.county.toLowerCase()}?office=${off.key}`;

            return (
              <Link
                key={off.key}
                href={href}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-[#0B6E4F] text-white shadow-sm"
                    : "border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                <span>{off.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {off.count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Candidates Grid */}
      <div className="mt-8">
        {filteredAspirants.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAspirants.map((asp) => (
              <AspirantCard key={asp.slug} aspirant={asp} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <Vote size={40} className="mx-auto text-neutral-400" />
            <h3 className="mt-3 text-base font-bold text-neutral-800 dark:text-neutral-200">
              No verified candidates found for this filter
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-neutral-500">
              Are you or someone on your campaign team running in {countyName}? Verify your profile today to appear in official voter searches.
            </p>
            <div className="mt-6">
              <Link
                href="/mhesh/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B6E4F] px-5 py-2.5 text-xs font-bold text-white shadow transition hover:bg-emerald-800"
              >
                Claim or Register Profile
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
