import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Vote, Award, MapPin } from "lucide-react";
import { AspirantCard } from "@/components/mhesh/AspirantCard";
import type { AspirantProfile } from "@/types/mhesh";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const OFFICE_DETAILS: Record<
  string,
  { title: string; subtitle: string; icon: string; countDesc: string }
> = {
  president: {
    title: "President of the Republic of Kenya",
    subtitle: "Head of State, Head of Government, and Commander-in-Chief.",
    icon: "🇰🇪",
    countDesc: "National Electoral Office",
  },
  governor: {
    title: "County Governors",
    subtitle: "Chief executives leading devolved county administration and budgets.",
    icon: "🏛️",
    countDesc: "47 Counties",
  },
  senator: {
    title: "County Senators",
    subtitle: "Protecting county interests, devolution legislation, and county revenue allocation.",
    icon: "📜",
    countDesc: "47 Counties",
  },
  woman_rep: {
    title: "County Woman Representatives",
    subtitle: "National Assembly legislators promoting affirmative action and county interests.",
    icon: "🗳️",
    countDesc: "47 Counties",
  },
  mp: {
    title: "Members of Parliament (National Assembly)",
    subtitle: "Constituency representatives leading national legislation and NG-CDF.",
    icon: "👥",
    countDesc: "290 Constituencies",
  },
  mca: {
    title: "Members of County Assembly (MCAs)",
    subtitle: "Ward legislators passing local county acts and performing executive oversight.",
    icon: "📍",
    countDesc: "1,450 Wards",
  },
};

interface PageProps {
  params: {
    office: string;
  };
  searchParams?: {
    county?: string;
  };
}

async function getOfficeAspirants(office: string): Promise<AspirantProfile[]> {
  try {
    // Try full aspirants query first
    const res = await fetch(`${API_BASE}/api/mhesh/aspirants?office=${office}`, {
      next: { revalidate: 30 },
    });
    if (res.ok) {
      return await res.json();
    }
    // Fallback to /api/mhesh/office/{office}
    const fallbackRes = await fetch(`${API_BASE}/api/mhesh/office/${office}`, {
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
  const meta = OFFICE_DETAILS[params.office.toLowerCase()];
  if (!meta) {
    return { title: "Office Not Found — Mhesh" };
  }
  return {
    title: `${meta.title} Candidates — Mhesh Kenya 2027`,
    description: `Explore verified candidates running for ${meta.title} in the 2027 Kenyan General Election. Read manifestos, compare records, and follow campaigns.`,
  };
}

export default async function OfficeAspirantsPage({ params, searchParams }: PageProps) {
  const officeKey = params.office.toLowerCase();
  const officeInfo = OFFICE_DETAILS[officeKey];

  if (!officeInfo) {
    notFound();
  }

  const aspirants = await getOfficeAspirants(officeKey);
  const selectedCounty = searchParams?.county?.toLowerCase();

  const filteredAspirants = selectedCounty
    ? aspirants.filter((a) => a.county?.toLowerCase() === selectedCounty)
    : aspirants;

  // Extract unique counties for filter
  const countiesInOffice = Array.from(
    new Set(aspirants.map((a) => a.county).filter(Boolean))
  ).sort();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/mhesh"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-[#0B6E4F] dark:text-neutral-400 dark:hover:text-emerald-400"
        >
          <ChevronLeft size={16} />
          <span>Back to National Directory</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-neutral-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-3xl shadow-inner dark:bg-neutral-800">
              {officeInfo.icon}
            </span>
            <div>
              <div className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#0B6E4F]">
                <Award size={14} />
                <span>{officeInfo.countDesc}</span>
              </div>
              <h1 className="mt-0.5 text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl dark:text-neutral-50">
                {officeInfo.title}
              </h1>
              <p className="mt-1 text-xs text-neutral-600 sm:text-sm dark:text-neutral-400">
                {officeInfo.subtitle}
              </p>
            </div>
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

        {/* Office Navigation Pills */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-black/5 pt-6 dark:border-white/5">
          {Object.entries(OFFICE_DETAILS).map(([key, info]) => {
            const isSelected = key === officeKey;
            return (
              <Link
                key={key}
                href={`/mhesh/office/${key}`}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-[#0B6E4F] text-white shadow-sm"
                    : "border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                <span>{info.icon}</span>
                <span>{info.title.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* County Filter Bar */}
      {countiesInOffice.length > 1 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500">Filter by County:</span>
          <Link
            href={`/mhesh/office/${officeKey}`}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
              !selectedCounty
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
            }`}
          >
            All
          </Link>
          {countiesInOffice.map((county) => (
            <Link
              key={county}
              href={`/mhesh/office/${officeKey}?county=${county.toLowerCase()}`}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                selectedCounty === county.toLowerCase()
                  ? "bg-[#0B6E4F] text-white"
                  : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
              }`}
            >
              {county}
            </Link>
          ))}
        </div>
      )}

      {/* Grid of Candidates */}
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
              No verified candidates registered yet for this seat
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-neutral-500">
              Are you running for {officeInfo.title}? Set up your official campaign hub now.
            </p>
            <div className="mt-6">
              <Link
                href="/mhesh/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B6E4F] px-5 py-2.5 text-xs font-bold text-white shadow transition hover:bg-emerald-800"
              >
                Register Candidate Profile
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
