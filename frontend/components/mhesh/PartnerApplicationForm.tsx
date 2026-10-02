"use client";

import React, { useState } from "react";
import { Check, CheckSquare, Loader2, Printer, Square } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import type { PrintPartner } from "@/types/mhesh";

export interface PartnerApplicationFormProps {
  onSuccess?: (partner: PrintPartner) => void;
  className?: string;
}

const AVAILABLE_CAPABILITIES = [
  { id: "posters", label: "Posters & Flyers (A3/A4)", defaultPrice: 25 },
  { id: "banners", label: "Banners & Backdrops", defaultPrice: 1200 },
  { id: "tshirts", label: "Branded T-Shirts & Polos", defaultPrice: 450 },
  { id: "caps", label: "Branded Caps & Berets", defaultPrice: 250 },
  { id: "umbrellas", label: "Branded Campaign Umbrellas", defaultPrice: 850 },
  { id: "billboards", label: "Roadside & Highway Billboards", defaultPrice: 15000 },
  { id: "vehicle_branding", label: "Vehicle Branding & Decals", defaultPrice: 8000 },
];

const KENYAN_COUNTIES = [
  "Nairobi", "Mombasa", "Nakuru", "Kiambu", "Machakos", "Kisumu", "Uasin Gishu",
  "Kilifi", "Meru", "Kakamega", "Nyeri", "Kisii", "Murang'a", "Kajiado",
  "Kericho", "Bungoma", "Homa Bay", "Baringo", "Bomet", "Busia", "Elgeyo-Marakwet",
  "Embu", "Garissa", "Isiolo", "Kitui", "Kwale", "Laikipia", "Lamu", "Mandera",
  "Marsabit", "Migori", "Nandi", "Narok", "Nyamira", "Nyandarua", "Samburu",
  "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans Nzoia",
  "Turkana", "Vihiga", "Wajir", "West Pokot"
];

export function PartnerApplicationForm({
  onSuccess,
  className = "",
}: PartnerApplicationFormProps) {
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [county, setCounty] = useState(KENYAN_COUNTIES[0]);
  const [ward, setWard] = useState("");
  const [selectedCaps, setSelectedCaps] = useState<string[]>(["posters", "tshirts"]);
  const [pricing, setPricing] = useState<Record<string, number>>({
    posters: 25,
    tshirts: 450,
  });
  const [capacityPerDay, setCapacityPerDay] = useState<number>(2000);
  const [turnaroundDays, setTurnaroundDays] = useState<number>(2);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPartner, setCreatedPartner] = useState<PrintPartner | null>(null);

  const toggleCapability = (capId: string, defaultPrice: number) => {
    setSelectedCaps((prev) => {
      const exists = prev.includes(capId);
      if (exists) {
        const next = prev.filter((id) => id !== capId);
        setPricing((p) => {
          const copy = { ...p };
          delete copy[capId];
          return copy;
        });
        return next;
      } else {
        setPricing((p) => ({ ...p, [capId]: defaultPrice }));
        return [...prev, capId];
      }
    });
  };

  const handlePriceChange = (capId: string, val: number) => {
    setPricing((prev) => ({
      ...prev,
      [capId]: isNaN(val) ? 0 : val,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCaps.length === 0) {
      setError("Please select at least one print production capability.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        business_name: businessName.trim(),
        owner_name: ownerName.trim(),
        phone: phone.trim(),
        county,
        ward: ward.trim() || undefined,
        capabilities: selectedCaps,
        pricing,
        capacity_per_day: capacityPerDay || undefined,
        turnaround_days: turnaroundDays || undefined,
      };

      const res = await api.post<PrintPartner>("/api/mhesh/partners/apply", payload);
      setCreatedPartner(res.data);
      onSuccess?.(res.data);
    } catch (err: unknown) {
      setError(errorMessage(err, "Failed to submit partner application. Please check details."));
    } finally {
      setLoading(false);
    }
  };

  if (createdPartner) {
    return (
      <div
        className={`rounded-3xl border border-emerald-500/20 bg-emerald-50/50 p-8 text-center dark:bg-emerald-950/20 ${className}`}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
          <Check size={28} />
        </div>
        <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
          Application Submitted!
        </h3>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Welcome to the Mhesh Print Network. Your business{" "}
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {createdPartner.business_name}
          </span>{" "}
          is now enrolled. An STK push of KSh 1 has been initiated to verify your M-Pesa line for escrow disbursements.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-neutral-900 ${className}`}
    >
      <div className="flex items-center gap-3 border-b border-black/5 pb-4 dark:border-white/5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
          <Printer size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Apply as an Official Print Partner
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Receive prepaid campaign print orders directly from aspirants across Kenya.
          </p>
        </div>
      </div>

      {/* Business & Owner Info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Printing Press / Business Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Horizon Printworks Ltd"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-xs text-neutral-900 outline-none transition focus:border-emerald-600 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Owner / Manager Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. John Kamau"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-xs text-neutral-900 outline-none transition focus:border-emerald-600 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            M-Pesa Business / Payout Phone *
          </label>
          <input
            type="tel"
            required
            placeholder="e.g. 0712345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-xs text-neutral-900 outline-none transition focus:border-emerald-600 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            County Location *
          </label>
          <select
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-xs text-neutral-900 outline-none transition focus:border-emerald-600 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100"
          >
            {KENYAN_COUNTIES.map((c) => (
              <option key={c} value={c}>
                {c} County
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Ward / Neighborhood (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Industrial Area / CBD"
            value={ward}
            onChange={(e) => setWard(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-xs text-neutral-900 outline-none transition focus:border-emerald-600 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Standard Turnaround Time (Days)
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={turnaroundDays}
            onChange={(e) => setTurnaroundDays(parseInt(e.target.value, 10))}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-xs text-neutral-900 outline-none transition focus:border-emerald-600 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
      </div>

      {/* Production Capabilities & Pricing */}
      <div>
        <label className="mb-2 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Production Capabilities & Standard Unit Pricing (KES) *
        </label>
        <p className="mb-3 text-[11px] text-neutral-500">
          Select items your workshop can print and specify your base rate per unit.
        </p>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {AVAILABLE_CAPABILITIES.map((cap) => {
            const isChecked = selectedCaps.includes(cap.id);
            return (
              <div
                key={cap.id}
                className={`flex items-center justify-between rounded-xl border p-3 transition ${
                  isChecked
                    ? "border-emerald-500/40 bg-emerald-50/30 dark:border-emerald-500/30 dark:bg-emerald-950/20"
                    : "border-black/5 bg-neutral-50/50 dark:border-white/5 dark:bg-neutral-800/40"
                }`}
              >
                <div
                  className="flex cursor-pointer items-center gap-2"
                  onClick={() => toggleCapability(cap.id, cap.defaultPrice)}
                >
                  {isChecked ? (
                    <CheckSquare size={16} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Square size={16} className="text-neutral-400" />
                  )}
                  <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                    {cap.label}
                  </span>
                </div>

                {isChecked && (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-neutral-400">KSh</span>
                    <input
                      type="number"
                      min={1}
                      value={pricing[cap.id] ?? cap.defaultPrice}
                      onChange={(e) => handlePriceChange(cap.id, parseInt(e.target.value, 10))}
                      className="w-20 rounded-lg border border-black/10 bg-white px-2 py-1 text-right text-xs font-bold text-neutral-900 outline-none focus:border-emerald-600 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Capacity */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Estimated Daily Capacity (Units / Day)
        </label>
        <input
          type="number"
          min={10}
          step={50}
          value={capacityPerDay}
          onChange={(e) => setCapacityPerDay(parseInt(e.target.value, 10))}
          className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-xs text-neutral-900 outline-none transition focus:border-emerald-600 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Enrolling Partner...
          </>
        ) : (
          "Submit Partner Application"
        )}
      </button>
    </form>
  );
}
