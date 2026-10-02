"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Wand2,
  Upload,
  ImagePlus,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Info,
  ShieldCheck,
} from "lucide-react";
import { api, errorMessage, shortDate, isUnauthorized } from "@/lib/api";

interface UploadedRef {
  key: string;
  previewUrl: string;
}

interface LoraStatusResponse {
  status: "trained" | "training" | "untrained" | "failed";
  error?: string | null;
  lora_trained_at?: string | null;
}

export default function TrainLoraPage() {
  const [refs, setRefs] = useState<UploadedRef[]>([]);
  const [uploading, setUploading] = useState(false);
  const [training, setTraining] = useState(false);
  const [loraStatus, setLoraStatus] = useState<LoraStatusResponse>({ status: "untrained" });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get<LoraStatusResponse>("/api/mhesh/studio/lora-status");
      setLoraStatus(res.data);
      if (res.data.status === "trained") {
        setTraining(false);
        setSuccessMsg("LoRA training complete! Your personalized campaign AI model is active.");
      } else if (res.data.status === "failed") {
        setTraining(false);
        setErrorMsg(res.data.error || "Training failed on the GPU worker. Please re-try with clearer photos.");
      } else if (res.data.status === "training") {
        setTraining(true);
      }
    } catch {
      // Ignored during background polling
    }
  };

  useEffect(() => {
    fetchStatus();

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Poll when in training state
  useEffect(() => {
    if (training || loraStatus.status === "training") {
      pollTimerRef.current = setInterval(fetchStatus, 8000);
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [training, loraStatus.status]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (refs.length + files.length > 10) {
      setErrorMsg("You can upload a maximum of 10 reference photos.");
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 1. Get presigned R2 reference upload URL
        const presignRes = await api.post("/api/mhesh/studio/upload-reference-url");
        const { upload_url, key } = presignRes.data;

        // 2. Direct upload to R2
        await fetch(upload_url, {
          method: "PUT",
          headers: { "Content-Type": file.type || "image/jpeg" },
          body: file,
        });

        // 3. Store reference
        const previewUrl = URL.createObjectURL(file);
        setRefs((prev) => [...prev, { key, previewUrl }]);
      }
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to upload reference photo"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeRef = (idx: number) => {
    setRefs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleStartTraining = async () => {
    if (refs.length < 5) {
      setErrorMsg("Please upload at least 5 clear reference photos (up to 10).");
      return;
    }

    setTraining(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const keys = refs.map((r) => r.key);
      await api.post("/api/mhesh/studio/train-lora", { reference_keys: keys });
      setLoraStatus({ status: "training" });
      setSuccessMsg("LoRA training started! This typically takes 8 to 15 minutes on our GPU cluster.");
    } catch (err) {
      setTraining(false);
      setErrorMsg(errorMessage(err, "Failed to start training"));
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <Link
          href="/mhesh/dashboard/studio"
          className="text-xs font-semibold text-emerald-800 hover:underline flex items-center gap-1 mb-2"
        >
          ← Back to Campaign Studio
        </Link>
        <h1 className="text-2xl font-black tracking-tight text-stone-900 font-serif">
          Train Custom Candidate Face Model (LoRA)
        </h1>
        <p className="mt-1 text-xs text-stone-500">
          Upload 5 to 10 high-quality photos to tune our visual generator to your likeness for all campaign materials.
        </p>
      </div>

      {/* Current Status Box */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-full p-2.5 ${
                loraStatus.status === "trained"
                  ? "bg-emerald-100 text-emerald-800"
                  : loraStatus.status === "training"
                  ? "bg-amber-100 text-amber-800"
                  : loraStatus.status === "failed"
                  ? "bg-rose-100 text-rose-800"
                  : "bg-stone-100 text-stone-700"
              }`}
            >
              {loraStatus.status === "training" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : loraStatus.status === "trained" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              ) : (
                <Wand2 className="h-5 w-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-900">Current Model Status:</h3>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide ${
                    loraStatus.status === "trained"
                      ? "bg-emerald-100 text-emerald-900"
                      : loraStatus.status === "training"
                      ? "bg-amber-100 text-amber-900"
                      : loraStatus.status === "failed"
                      ? "bg-rose-100 text-rose-900"
                      : "bg-stone-100 text-stone-800"
                  }`}
                >
                  {loraStatus.status}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-stone-500">
                {loraStatus.status === "trained" && loraStatus.lora_trained_at
                  ? `Active model trained on ${shortDate(loraStatus.lora_trained_at)}.`
                  : loraStatus.status === "training"
                  ? "GPU worker is currently fine-tuning weights. Please wait a few minutes."
                  : "No custom face weights active. Upload photos below to begin."}
              </p>
            </div>
          </div>

          {loraStatus.status === "trained" && (
            <Link
              href="/mhesh/dashboard/studio"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              <span>Launch Studio</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Guidelines Card */}
      <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-5">
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-800">
          <Info className="h-4 w-4 text-emerald-700" />
          <span>Photo Guidelines for Best AI Likeness</span>
        </h4>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs text-stone-600">
          <div className="flex items-start gap-2">
            <span className="text-emerald-700 font-bold">✓</span>
            <span>5 to 10 close-up and waist-up portraits with clear facial lighting.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-700 font-bold">✓</span>
            <span>Different angles (front-facing, slight 3/4 turn, smiling and serious).</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-rose-600 font-bold">✕</span>
            <span>Avoid sunglasses, hats covering the face, or heavy filters.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-rose-600 font-bold">✕</span>
            <span>No group photos where other people appear in the crop.</span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-xs font-semibold text-rose-800 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Grid */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-900">
            Selected Reference Photos ({refs.length} / 10)
          </h3>
          <span className="text-xs text-stone-400">Min 5 required</span>
        </div>

        {refs.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {refs.map((ref, idx) => (
              <div
                key={ref.key}
                className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
              >
                <img src={ref.previewUrl} alt={`Ref ${idx + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeRef(idx)}
                  disabled={training}
                  className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-rose-600 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white font-mono">
                  #{idx + 1}
                </span>
              </div>
            ))}
          </div>
        )}

        {refs.length < 10 && (
          <div className="mt-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-stone-50/50 p-8 text-center transition hover:border-emerald-600 hover:bg-emerald-50/30">
              <input
                type="file"
                accept="image/jpeg,image/png"
                multiple
                disabled={uploading || training}
                onChange={handleFileChange}
                className="hidden"
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-2 text-stone-600">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  <span className="text-xs font-semibold">Uploading reference photos to private R2 storage...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-stone-600">
                  <ImagePlus className="h-8 w-8 text-stone-400" />
                  <span className="text-xs font-semibold text-stone-800">
                    Click to browse or drop candidate photos
                  </span>
                  <span className="text-[11px] text-stone-400">
                    JPG or PNG formats • Secure private storage
                  </span>
                </div>
              )}
            </label>
          </div>
        )}

        {/* Start Training Button */}
        <div className="mt-6 border-t border-stone-100 pt-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Private training weights • Never shared or used elsewhere</span>
          </div>

          <button
            type="button"
            onClick={handleStartTraining}
            disabled={refs.length < 5 || training || uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
          >
            {training ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Training in Progress...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Start LoRA Training</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
