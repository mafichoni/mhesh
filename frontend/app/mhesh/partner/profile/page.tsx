"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Printer,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Coins,
  Clock,
  Layers,
  Camera,
  ImagePlus,
  X,
  Building,
} from "lucide-react";
import { api, errorMessage, isUnauthorized } from "@/lib/api";

const ALL_CAPABILITIES = [
  { id: "posters", label: "A3 / A2 Campaign Posters", defaultPrice: 25 },
  { id: "tshirts", label: "Branded Campaign T-Shirts", defaultPrice: 350 },
  { id: "caps", label: "Embroidered Campaign Caps", defaultPrice: 200 },
  { id: "banners", label: "Outdoor PVC Stage Banners", defaultPrice: 1500 },
  { id: "billboards", label: "Large Format Billboards", defaultPrice: 8500 },
  { id: "flyers", label: "Handout Flyers & Manifestos", defaultPrice: 10 },
  { id: "umbrellas", label: "Branded Campaign Umbrellas", defaultPrice: 600 },
];

interface PartnerData {
  id: string;
  business_name: string;
  owner_name: string;
  county: string;
  ward?: string | null;
  capabilities: string[];
  pricing: Record<string, number>;
  capacity_per_day?: number | null;
  turnaround_days?: number | null;
  sample_urls: string[];
  verified: boolean;
  status: string;
}

export default function PartnerProfilePage() {
  const [partner, setPartner] = useState<PartnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingSample, setUploadingSample] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [selectedCaps, setSelectedCaps] = useState<string[]>([]);
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [capacityPerDay, setCapacityPerDay] = useState<number>(500);
  const [turnaroundDays, setTurnaroundDays] = useState<number>(2);
  const [ward, setWard] = useState<string>("");
  const [samples, setSamples] = useState<string[]>([]);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const res = await api.get<PartnerData>("/api/mhesh/partners/me/profile");
        const p = res.data;
        setPartner(p);
        setSelectedCaps(p.capabilities || ["posters", "tshirts"]);
        setPricing(p.pricing || { posters: 25, tshirts: 350 });
        setCapacityPerDay(p.capacity_per_day || 500);
        setTurnaroundDays(p.turnaround_days || 2);
        setWard(p.ward || "");
        setSamples(p.sample_urls || []);
      } catch (err) {
        if (!isUnauthorized(err)) {
          setErrorMsg(errorMessage(err, "Failed to load partner profile"));
        }
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const toggleCapability = (capId: string) => {
    if (selectedCaps.includes(capId)) {
      if (selectedCaps.length === 1) return;
      setSelectedCaps(selectedCaps.filter((c) => c !== capId));
    } else {
      setSelectedCaps([...selectedCaps, capId]);
      if (!pricing[capId]) {
        const found = ALL_CAPABILITIES.find((c) => c.id === capId);
        setPricing((prev) => ({ ...prev, [capId]: found ? found.defaultPrice : 100 }));
      }
    }
  };

  const updatePrice = (capId: string, val: number) => {
    setPricing((prev) => ({ ...prev, [capId]: val }));
  };

  const handleSampleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (samples.length >= 5) {
      setErrorMsg("You can upload a maximum of 5 sample portfolio photos.");
      return;
    }

    setUploadingSample(true);
    setErrorMsg(null);

    try {
      const presignRes = await api.post("/api/mhesh/partners/me/sample-upload-url");
      const { upload_url, public_url } = presignRes.data;

      await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });

      const updatedSamples = [...samples, public_url];
      setSamples(updatedSamples);
      await api.patch("/api/mhesh/partners/me/profile", { sample_urls: updatedSamples });
      setSuccessMsg("Sample workshop photo added to your portfolio!");
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to upload sample photo"));
    } finally {
      setUploadingSample(false);
      e.target.value = "";
    }
  };

  const removeSample = async (idx: number) => {
    const updated = samples.filter((_, i) => i !== idx);
    setSamples(updated);
    try {
      await api.patch("/api/mhesh/partners/me/profile", { sample_urls: updated });
    } catch {
      // Ignored
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.patch("/api/mhesh/partners/me/profile", {
        capabilities: selectedCaps,
        pricing,
        capacity_per_day: Number(capacityPerDay),
        turnaround_days: Number(turnaroundDays),
        ward: ward.trim() || null,
        sample_urls: samples,
      });
      setSuccessMsg("Print shop capabilities and pricing updated successfully!");
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (!partner) return null;

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 pb-16">
      {/* Top Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link
            href="/mhesh/partner/dashboard"
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Partner Dashboard</span>
          </Link>

          <span className="text-xs font-bold text-stone-500">
            {partner.business_name} • {partner.county}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-8 space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-stone-900 font-serif">
                Shop Capabilities & Pricing
              </h1>
              <p className="mt-1 text-xs text-stone-500">
                Configure your print shop machinery, product pricing per item, daily capacity, and standard lead times.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-xs font-semibold text-rose-800 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Capabilities & Pricing Card */}
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Printer className="h-5 w-5 text-emerald-700" />
              <span>Print Offerings & Unit Pricing (KSh)</span>
            </h3>

            <div className="divide-y divide-stone-100">
              {ALL_CAPABILITIES.map((cap) => {
                const isSelected = selectedCaps.includes(cap.id);
                return (
                  <div
                    key={cap.id}
                    className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`cap-${cap.id}`}
                        checked={isSelected}
                        onChange={() => toggleCapability(cap.id)}
                        className="h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
                      />
                      <label htmlFor={`cap-${cap.id}`} className="text-xs font-semibold text-stone-800 cursor-pointer">
                        {cap.label}
                      </label>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-xs text-stone-400">Unit Price:</span>
                        <div className="relative">
                          <input
                            type="number"
                            min={1}
                            value={pricing[cap.id] ?? cap.defaultPrice}
                            onChange={(e) => updatePrice(cap.id, parseInt(e.target.value, 10) || 0)}
                            className="w-28 rounded-lg border border-stone-300 pl-8 pr-2 py-1 text-xs font-bold font-mono focus:border-emerald-600 focus:outline-none"
                          />
                          <span className="absolute left-2.5 top-1.5 text-xs text-stone-400">KSh</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Production Capacity & Turnaround */}
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-700" />
              <span>Production Throughput & Lead Times</span>
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Daily Capacity (Units / Day)
                </label>
                <input
                  type="number"
                  min={10}
                  max={100000}
                  value={capacityPerDay}
                  onChange={(e) => setCapacityPerDay(parseInt(e.target.value, 10) || 0)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs font-mono font-bold focus:border-emerald-600 focus:outline-none"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">Maximum units your workshop can output daily</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Standard Turnaround (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={turnaroundDays}
                  onChange={(e) => setTurnaroundDays(parseInt(e.target.value, 10) || 1)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs font-mono font-bold focus:border-emerald-600 focus:outline-none"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">Average time from proof to delivery dispatch</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Workshop Ward / Locality
                </label>
                <input
                  type="text"
                  placeholder="e.g. Industrial Area / River Road"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">Assists candidates with local delivery logistics</span>
              </div>
            </div>
          </div>

          {/* Workshop Sample Photos */}
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Camera className="h-5 w-5 text-emerald-700" />
                <span>Workshop Samples Portfolio ({samples.length} / 5)</span>
              </h3>
              <span className="text-xs text-stone-400">Photos of past campaign prints</span>
            </div>

            {samples.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {samples.map((url, idx) => (
                  <div key={idx} className="group relative aspect-square overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                    <img src={url} alt={`Sample ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeSample(idx)}
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-rose-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {samples.length < 5 && (
              <div>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 bg-stone-50/50 p-6 text-center transition hover:border-emerald-600 hover:bg-emerald-50/30">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingSample}
                    onChange={handleSampleUpload}
                    className="hidden"
                  />
                  {uploadingSample ? (
                    <div className="flex items-center gap-2 text-stone-600 text-xs">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                      <span>Uploading workshop photo...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-stone-600 text-xs">
                      <ImagePlus className="h-6 w-6 text-stone-400" />
                      <span className="font-semibold text-stone-800">
                        Upload sample past campaign merchandise
                      </span>
                      <span className="text-[11px] text-stone-400">Up to 5 images • JPG/PNG</span>
                    </div>
                  )}
                </label>
              </div>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
