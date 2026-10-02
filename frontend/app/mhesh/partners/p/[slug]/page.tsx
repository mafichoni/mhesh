import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Printer,
  ChevronLeft,
  MapPin,
  Star,
  CheckCircle2,
  Clock,
  Gauge,
  Phone,
  ShieldCheck,
  Package,
  Layers,
  ExternalLink,
  Info,
} from "lucide-react";
import type { PrintPartner } from "@/types/mhesh";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PageProps {
  params: {
    slug: string;
  };
}

async function getPartner(slug: string): Promise<PrintPartner | null> {
  try {
    const res = await fetch(`${API_BASE}/api/mhesh/partners/${slug}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch partner: ${res.status}`);
    }
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const partner = await getPartner(params.slug);
  if (!partner) {
    return { title: "Partner Not Found — Mhesh" };
  }
  return {
    title: `${partner.business_name} — Print Partner (${partner.county}) | Mhesh`,
    description: `Order campaign posters, PVC banners, and t-shirts in bulk from ${partner.business_name} in ${partner.county} County. Verified M-Pesa escrow protection.`,
  };
}

export default async function PartnerDetailPage({ params }: PageProps) {
  const partner = await getPartner(params.slug);

  if (!partner) {
    notFound();
  }

  const pricingEntries = Object.entries(partner.pricing || {});

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <div>
        <Link
          href="/mhesh/partners"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-[#0B6E4F] dark:text-neutral-400 dark:hover:text-emerald-400"
        >
          <ChevronLeft size={16} />
          <span>Back to Print Marketplace</span>
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-neutral-900">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#0B6E4F] shadow-inner dark:bg-emerald-950/40 dark:text-emerald-400">
              <Printer size={32} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl dark:text-neutral-50">
                  {partner.business_name}
                </h1>
                {partner.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle2 size={13} />
                    M-Pesa Verified
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-neutral-500">
                Operated by <span className="font-semibold text-neutral-700 dark:text-neutral-300">{partner.owner_name}</span>
              </p>

              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                <MapPin size={14} className="text-[#0B6E4F]" />
                <span>{partner.ward ? `${partner.ward}, ` : ""}{partner.county} County, Kenya</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
            <div className="rounded-2xl border border-black/5 bg-neutral-50 px-4 py-3 text-center dark:border-white/5 dark:bg-neutral-800">
              <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                <span className="text-lg font-black">{partner.rating > 0 ? partner.rating.toFixed(1) : "5.0"}</span>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Rating
              </p>
            </div>

            <div className="rounded-2xl border border-black/5 bg-neutral-50 px-4 py-3 text-center dark:border-white/5 dark:bg-neutral-800">
              <span className="text-lg font-black text-neutral-900 dark:text-neutral-100">
                {partner.orders_completed}
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Orders Completed
              </p>
            </div>

            <div className="rounded-2xl border border-black/5 bg-neutral-50 px-4 py-3 text-center dark:border-white/5 dark:bg-neutral-800">
              <span className="text-lg font-black text-[#0B6E4F]">
                {partner.trust_score}
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Trust Score
              </p>
            </div>
          </div>
        </div>

        {/* Operational turnaround badges */}
        <div className="mt-6 flex flex-wrap gap-4 border-t border-black/5 pt-6 text-xs text-neutral-600 dark:border-white/5 dark:text-neutral-400">
          {partner.turnaround_days && (
            <div className="flex items-center gap-1.5 rounded-xl bg-neutral-100 px-3 py-1.5 font-medium dark:bg-neutral-800">
              <Clock size={15} className="text-neutral-500" />
              <span>Turnaround: <strong className="text-neutral-900 dark:text-neutral-100">{partner.turnaround_days} Days</strong></span>
            </div>
          )}

          {partner.capacity_per_day && (
            <div className="flex items-center gap-1.5 rounded-xl bg-neutral-100 px-3 py-1.5 font-medium dark:bg-neutral-800">
              <Gauge size={15} className="text-neutral-500" />
              <span>Production Capacity: <strong className="text-neutral-900 dark:text-neutral-100">{partner.capacity_per_day.toLocaleString()} items / day</strong></span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Capabilities, Pricing Table, Samples */}
        <div className="space-y-8 lg:col-span-2">
          {/* Capabilities */}
          <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Production Capabilities
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Types of campaign collateral this workshop prints on-site.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {(partner.capabilities || []).map((cap) => (
                <span
                  key={cap}
                  className="rounded-xl border border-emerald-600/20 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  {cap.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>

          {/* Pricing Table */}
          <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Bulk Production Price Sheet
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Baseline rates in Kenya Shillings (KES). Final quote depends on volume and finishing.
            </p>

            {pricingEntries.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-neutral-200 bg-neutral-50 font-bold uppercase tracking-wider text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-300">
                    <tr>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Unit Price (KES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {pricingEntries.map(([category, price]) => (
                      <tr key={category} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                        <td className="px-4 py-3 font-semibold text-neutral-900 capitalize dark:text-neutral-100">
                          {category.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-[#0B6E4F] dark:text-emerald-400">
                          KES {price.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-xs text-neutral-500">No custom pricing posted. Contact for quote.</p>
            )}
          </div>

          {/* Sample Gallery */}
          {partner.sample_urls && partner.sample_urls.length > 0 && (
            <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Sample Work Gallery
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                Photographs of past campaign printing, posters, banners, and merchandise.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {partner.sample_urls.map((url, i) => (
                  <div
                    key={i}
                    className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${partner.business_name} sample ${i + 1}`}
                      className="h-full w-full object-cover transition hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Order / Escrow Action Card */}
        <div className="space-y-6">
          <div className="sticky top-20 rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Place a Print Order
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Aspirants can submit bulk orders directly with designs from the Mhesh AI Studio.
            </p>

            <div className="mt-6 space-y-3">
              <Link
                href="/mhesh/dashboard"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B6E4F] py-3 text-xs font-bold text-white shadow transition hover:bg-emerald-800 active:scale-95"
              >
                <Package size={16} />
                <span>Order as Aspirant (Login)</span>
              </Link>

              {partner.phone && (
                <a
                  href={`tel:${partner.phone}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 py-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200"
                >
                  <Phone size={15} />
                  <span>Call Workshop: {partner.phone}</span>
                </a>
              )}
            </div>

            {/* Escrow Protection Guarantee */}
            <div className="mt-6 rounded-xl border border-emerald-900/10 bg-emerald-50/60 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={18} className="flex-shrink-0 text-[#0B6E4F]" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Mhesh Escrow Guarantee
                  </h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-emerald-800/80 dark:text-emerald-300/80">
                    Your campaign payment is held safely in Daraja M-Pesa escrow. The printer is only paid once they upload photo evidence of delivery and you approve the batch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
