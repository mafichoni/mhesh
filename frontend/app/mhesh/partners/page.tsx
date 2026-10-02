import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Printer,
  PlusCircle,
  MapPin,
  Star,
  ShieldCheck,
  Clock,
  Layers,
  CheckCircle,
  ChevronRight,
  Filter,
} from "lucide-react";
import type { PrintPartner } from "@/types/mhesh";

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

const CAPABILITIES = [
  { id: "posters", label: "Posters" },
  { id: "banners", label: "Banners" },
  { id: "tshirts", label: "T-Shirts" },
  { id: "caps", label: "Caps" },
  { id: "flyers", label: "Flyers" },
  { id: "billboards", label: "Billboards" },
  { id: "stickers", label: "Stickers" },
  { id: "umbrellas", label: "Umbrellas" },
  { id: "reflector_jackets", label: "Reflector Jackets" },
];

interface PageProps {
  searchParams?: {
    county?: string;
    capability?: string;
  };
}

export const metadata: Metadata = {
  title: "Print Partners Marketplace — Mhesh Kenya 2027",
  description:
    "Find pre-vetted Kenyan printing presses for bulk election campaign posters, banners, and t-shirts. Protected by M-Pesa escrow.",
};

async function getPartners(county?: string, capability?: string): Promise<PrintPartner[]> {
  try {
    const params = new URLSearchParams();
    if (county) params.set("county", county);
    if (capability) params.set("capability", capability);

    const res = await fetch(`${API_BASE}/api/mhesh/partners?${params.toString()}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default async function PrintPartnersDirectoryPage({ searchParams }: PageProps) {
  const selectedCounty = searchParams?.county;
  const selectedCapability = searchParams?.capability;

  const partners = await getPartners(selectedCounty, selectedCapability);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-10 dark:border-white/10 dark:bg-neutral-900">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#0B6E4F] dark:bg-emerald-950/40 dark:text-emerald-300">
              <Printer size={14} />
              <span>Bulk Campaign Production &amp; Escrow</span>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
              Print Partners Marketplace
            </h1>
            <p className="mt-2 text-xs text-neutral-600 sm:text-sm dark:text-neutral-400">
              Find verified printing hubs across all 47 counties. Orders are held in Daraja M-Pesa escrow until photo evidence of delivery is confirmed.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/mhesh/partners/apply"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B6E4F] px-5 py-3 text-xs font-bold text-white shadow transition hover:bg-emerald-800 active:scale-95"
            >
              <PlusCircle size={16} />
              <span>Apply as a Print Partner</span>
            </Link>
          </div>
        </div>

        {/* Filters Section */}
        <div className="mt-8 space-y-4 border-t border-black/5 pt-6 dark:border-white/5">
          {/* Capability Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-2 text-xs font-bold text-neutral-500">Capability:</span>
            <Link
              href={`/mhesh/partners${selectedCounty ? `?county=${selectedCounty}` : ""}`}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                !selectedCapability
                  ? "bg-[#0B6E4F] text-white"
                  : "border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              All Types
            </Link>
            {CAPABILITIES.map((cap) => {
              const isSelected = selectedCapability === cap.id;
              const href = `/mhesh/partners?capability=${cap.id}${selectedCounty ? `&county=${selectedCounty}` : ""}`;
              return (
                <Link
                  key={cap.id}
                  href={href}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    isSelected
                      ? "bg-[#0B6E4F] text-white"
                      : "border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {cap.label}
                </Link>
              );
            })}
          </div>

          {/* County Filter Select */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span className="text-xs font-bold text-neutral-500">Filter by County:</span>
            <div className="flex flex-wrap gap-1.5">
              <Link
                href={`/mhesh/partners${selectedCapability ? `?capability=${selectedCapability}` : ""}`}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  !selectedCounty
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                All Counties
              </Link>
              {KENYA_COUNTIES.slice(0, 8).map((c) => (
                <Link
                  key={c}
                  href={`/mhesh/partners?county=${c}${selectedCapability ? `&capability=${selectedCapability}` : ""}`}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                    selectedCounty === c
                      ? "bg-[#0B6E4F] text-white"
                      : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold text-neutral-500">
            Showing <span className="font-bold text-neutral-900 dark:text-neutral-100">{partners.length}</span> active print partners
          </p>
        </div>

        {partners.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {partners.map((p) => {
              const pricingList = Object.entries(p.pricing || {});
              return (
                <div
                  key={p.id}
                  className="group flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-neutral-900"
                >
                  <div>
                    {/* Top row: Business name + verified badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-[#0B6E4F]">
                          <Link href={`/mhesh/partners/p/${p.slug}`}>
                            {p.business_name}
                          </Link>
                        </h3>
                        <p className="text-xs text-neutral-500">
                          {p.owner_name}
                        </p>
                      </div>

                      {p.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <CheckCircle size={12} />
                          Verified
                        </span>
                      )}
                    </div>

                    {/* Location */}
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                      <MapPin size={13} className="text-[#0B6E4F]" />
                      <span>{p.ward ? `${p.ward}, ` : ""}{p.county} County</span>
                    </div>

                    {/* Metrics: Rating & Orders */}
                    <div className="mt-3 flex items-center gap-3 border-y border-black/5 py-2.5 text-xs text-neutral-600 dark:border-white/5 dark:text-neutral-400">
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Star size={13} className="fill-amber-400 text-amber-400" />
                        <span className="font-bold">{p.rating > 0 ? p.rating.toFixed(1) : "5.0"}</span>
                      </div>
                      <span>•</span>
                      <span>{p.orders_completed} orders completed</span>
                      {p.turnaround_days && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} />
                            {p.turnaround_days}d turnaround
                          </span>
                        </>
                      )}
                    </div>

                    {/* Capabilities Tags */}
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-1.5">
                        {(p.capabilities || []).map((cap) => (
                          <span
                            key={cap}
                            className="rounded-lg bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                          >
                            {cap.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Pricing Preview */}
                    {pricingList.length > 0 && (
                      <div className="mt-4 rounded-xl bg-neutral-50 p-3 text-xs dark:bg-neutral-800/60">
                        <span className="font-semibold text-neutral-500">Starting rates:</span>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          {pricingList.slice(0, 3).map(([item, price]) => (
                            <span key={item} className="text-neutral-800 dark:text-neutral-200">
                              <span className="capitalize">{item}</span>:{" "}
                              <span className="font-bold text-[#0B6E4F]">KES {price}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Order / View Action */}
                  <div className="mt-5 pt-3">
                    <Link
                      href={`/mhesh/partners/p/${p.slug}`}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-neutral-900 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0B6E4F] dark:bg-neutral-800 dark:hover:bg-emerald-700"
                    >
                      <span>View Shop &amp; Request Quote</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <Printer size={40} className="mx-auto text-neutral-400" />
            <h3 className="mt-3 text-base font-bold text-neutral-800 dark:text-neutral-200">
              No print partners match your search
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-neutral-500">
              Are you a printing press owner or billboard operator? Join our verified network to receive escrow-guaranteed bulk orders from aspirants.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/mhesh/partners"
                className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300"
              >
                Clear Filters
              </Link>
              <Link
                href="/mhesh/partners/apply"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B6E4F] px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
              >
                <PlusCircle size={14} />
                <span>Apply as Print Partner</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
