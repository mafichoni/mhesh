"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wand2,
  Sparkles,
  Layers,
  Clock,
  Coins,
  AlertCircle,
  Loader2,
  Check,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { api, errorMessage, isUnauthorized } from "@/lib/api";
import { StyleCard, CAMPAIGN_STYLES } from "@/components/mhesh/StyleCard";
import { StudioGrid, GenerationItem } from "@/components/mhesh/StudioGrid";
import { AiGeneratedTag } from "@/components/mhesh/AiGeneratedTag";

const FORMAT_OPTIONS = [
  { id: "story", label: "Instagram / WhatsApp Story (9:16)" },
  { id: "post", label: "Square Social Post (1:1)" },
  { id: "billboard", label: "Highway Billboard (16:9)" },
  { id: "banner", label: "Rally Stage Banner (3:1)" },
  { id: "tshirt", label: "T-Shirt Print Graphic" },
  { id: "cap", label: "Branded Cap Emblem" },
  { id: "umbrella", label: "Campaign Umbrella" },
  { id: "a3", label: "A3 Poster / Flyer" },
];

export default function StudioPage() {
  const [selectedStyle, setSelectedStyle] = useState<string>("rally_podium");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["post", "story"]);
  const [numImages, setNumImages] = useState<number>(1);

  const [usage, setUsage] = useState<{ used_today: number; daily_limit: number }>({
    used_today: 0,
    daily_limit: 20,
  });
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [hasLora, setHasLora] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudioData() {
      try {
        setLoading(true);
        const [meRes, usageRes, genRes] = await Promise.all([
          api.get("/api/mhesh/aspirants/me"),
          api.get("/api/mhesh/studio/usage").catch(() => ({ data: { used_today: 0, daily_limit: 20 } })),
          api.get("/api/mhesh/studio/generations").catch(() => ({ data: [] })),
        ]);
        setHasLora(Boolean(meRes.data?.lora_key));
        setUsage(usageRes.data);
        setGenerations(genRes.data || []);
      } catch (err) {
        if (!isUnauthorized(err)) {
          setErrorMsg(errorMessage(err, "Failed to load AI Studio data"));
        }
      } finally {
        setLoading(false);
      }
    }
    loadStudioData();
  }, []);

  const toggleFormat = (fmt: string) => {
    if (selectedFormats.includes(fmt)) {
      if (selectedFormats.length === 1) return; // Keep at least one
      setSelectedFormats(selectedFormats.filter((f) => f !== fmt));
    } else {
      setSelectedFormats([...selectedFormats, fmt]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasLora) {
      setErrorMsg("Please train your face model before generating campaign media.");
      return;
    }

    setGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post("/api/mhesh/studio/generate", {
        style_template: selectedStyle,
        custom_prompt: customPrompt.trim() || undefined,
        num_images: numImages,
        output_formats: selectedFormats,
      });

      setSuccessMsg(`Generated ${res.data.output_urls?.length || 1} image(s) successfully!`);
      // Update usage
      setUsage((prev) => ({ ...prev, used_today: prev.used_today + numImages }));

      // Refresh generation history
      const updatedList = await api.get("/api/mhesh/studio/generations");
      setGenerations(updatedList.data || []);
    } catch (err) {
      setErrorMsg(errorMessage(err, "Generation failed. Please check prompt content guidelines."));
    } finally {
      setGenerating(false);
    }
  };

  const remaining = Math.max(0, usage.daily_limit - usage.used_today);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-stone-900 font-serif">
              AI Campaign Studio
            </h1>
            <AiGeneratedTag size="md" showSubtitle />
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Generate authentic Kenyan campaign creative: podium rallies, market barazas, billboards, and branded collateral.
          </p>
        </div>

        {/* Quota counter */}
        <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-2 shadow-sm">
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
              Daily Quota Remaining
            </span>
            <span className="text-sm font-extrabold text-stone-900 font-mono">
              <span className="text-emerald-700">{remaining}</span> / {usage.daily_limit} gens left
            </span>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
            <Clock className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* LoRA Warning Banner if untrained */}
      {!hasLora && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-100 p-2 text-amber-800">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">Custom Face Model Not Trained</h3>
                <p className="mt-1 text-xs text-amber-700 max-w-xl">
                  To produce images featuring your likeness in authentic Kenyan political settings, you must first upload 5–10 reference photos to train your private LoRA model.
                </p>
              </div>
            </div>
            <Link
              href="/mhesh/dashboard/studio/train"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800"
            >
              <span>Train Model Now</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-xs font-semibold text-rose-800 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Generator Form */}
      <form onSubmit={handleGenerate} className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
        {/* Style Selector */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
              1. Choose Campaign Style Setting
            </label>
            <span className="text-xs text-stone-400">10 Kenyan settings available</span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {CAMPAIGN_STYLES.map((style) => (
              <StyleCard
                key={style.id}
                styleOption={style}
                isSelected={selectedStyle === style.id}
                onSelect={(id) => setSelectedStyle(id)}
              />
            ))}
          </div>
        </div>

        {/* Custom Prompt Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
            2. Custom Campaign Prompt or Context (Optional)
          </label>
          <p className="mt-0.5 text-xs text-stone-500">
            Add local context (e.g. wearing green campaign cap, standing with boda boda operators in Kisumu, holding microphone at Baraza).
          </p>
          <textarea
            rows={2}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. Addressing a lively crowd with Kenyan flag colors and youth holding campaign banners..."
            className="mt-2 w-full rounded-lg border border-stone-300 p-3 text-xs focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        {/* Output Formats */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
            3. Target Aspect Ratios & Formats
          </label>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {FORMAT_OPTIONS.map((fmt) => {
              const checked = selectedFormats.includes(fmt.id);
              return (
                <button
                  type="button"
                  key={fmt.id}
                  onClick={() => toggleFormat(fmt.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    checked
                      ? "border-emerald-700 bg-emerald-50 text-emerald-900 font-semibold"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                  }`}
                >
                  <div
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
                      checked ? "border-emerald-700 bg-emerald-700 text-white" : "border-stone-300"
                    }`}
                  >
                    {checked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </div>
                  <span>{fmt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate Button Row */}
        <div className="flex flex-col gap-4 border-t border-stone-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 text-xs text-stone-500">
            <span>
              Image count:{" "}
              <select
                value={numImages}
                onChange={(e) => setNumImages(parseInt(e.target.value, 10))}
                className="ml-1 rounded border border-stone-300 px-2 py-1 text-xs font-bold"
              >
                <option value={1}>1 image</option>
                <option value={2}>2 variations</option>
                <option value={4}>4 variations</option>
              </select>
            </span>
            <span className="flex items-center gap-1 font-mono text-emerald-800">
              <Coins className="h-3.5 w-3.5 text-amber-600" />
              Est. cost: {numImages * 50} KES
            </span>
          </div>

          <button
            type="submit"
            disabled={generating || !hasLora || remaining < numImages}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Synthesizing Campaign Visuals...</span>
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                <span>Generate Campaign Images</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Generated Media Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-stone-900">
            Campaign Media Portfolio ({generations.length})
          </h2>
          <span className="text-xs text-stone-400">High-resolution campaign ready</span>
        </div>

        <StudioGrid generations={generations} />
      </div>
    </div>
  );
}
