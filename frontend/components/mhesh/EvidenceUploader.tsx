"use client";

import React, { useState } from "react";
import { Camera, Check, Loader2, MapPin, Upload, X } from "lucide-react";
import { api, errorMessage } from "@/lib/api";

export interface EvidenceUploaderProps {
  taskId: string;
  onSuccess?: (evidenceUrls: string[]) => void;
  className?: string;
}

interface UploadItem {
  file: File;
  previewUrl: string;
}

export function EvidenceUploader({
  taskId,
  onSuccess,
  className = "",
}: EvidenceUploaderProps) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);

    const newItems: UploadItem[] = selectedFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setUploads((prev) => [...prev, ...newItems]);
    setError(null);
  };

  const removePhoto = (idx: number) => {
    setUploads((prev) => {
      const removed = prev[idx];
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setError(`Failed to capture GPS coordinates: ${err.message}`);
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploads.length === 0) {
      setError("Please attach at least one photo as proof of completed work.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const uploadedUrls: string[] = [];

      // 1. Upload each photo using presigned URLs
      for (const item of uploads) {
        const presignRes = await api.post<{
          upload_url: string;
          key: string;
          public_url: string;
        }>(`/api/mhesh/tasks/${taskId}/evidence-upload-url`);

        const { upload_url, public_url: pubUrl } = presignRes.data;

        const uploadFetch = await fetch(upload_url, {
          method: "PUT",
          headers: {
            "Content-Type": item.file.type || "image/jpeg",
          },
          body: item.file,
        });

        if (!uploadFetch.ok) {
          throw new Error(`Failed to upload photo ${item.file.name}`);
        }

        uploadedUrls.push(pubUrl);
      }

      // 2. Submit evidence record
      await api.post(`/api/mhesh/tasks/${taskId}/submit-evidence`, {
        evidence_urls: uploadedUrls,
        note: note.trim() || undefined,
        lat: coords?.lat,
        lng: coords?.lng,
      });

      setSuccess(true);
      onSuccess?.(uploadedUrls);
    } catch (err: unknown) {
      setError(errorMessage(err, "Failed to submit evidence. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div
        className={`rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-6 text-center dark:bg-emerald-950/20 ${className}`}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
          <Check size={24} />
        </div>
        <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
          Work Evidence Submitted!
        </h4>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
          The candidate and Mhesh verification engine will review your proof. Once verified, KSh reward will be released directly to your M-Pesa phone.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Submit Work Proof & Photos
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Upload clear photos demonstrating task completion on the ground.
          </p>
        </div>
        <Camera size={20} className="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Upload Drop Zone / Input */}
      <div>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-6 transition hover:border-emerald-500 hover:bg-neutral-100/50 dark:border-neutral-700 dark:bg-neutral-800/40">
          <Upload size={24} className="mb-2 text-neutral-400" />
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
            Click or drag photos to upload
          </span>
          <span className="text-[11px] text-neutral-400">
            Supports JPG, PNG up to 10MB each
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Photo Previews */}
      {uploads.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {uploads.map((item, idx) => (
            <div
              key={`${item.previewUrl}-${idx}`}
              className="relative aspect-square overflow-hidden rounded-xl border border-black/10 bg-neutral-100 dark:border-white/10 dark:bg-neutral-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt={`Preview ${idx + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* GPS Location Capture */}
      <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-3 text-xs dark:bg-neutral-800/60">
        <div className="flex items-center gap-2">
          <MapPin size={15} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-neutral-700 dark:text-neutral-300">
            {coords
              ? `GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
              : "Geotag verification (optional)"}
          </span>
        </div>
        <button
          type="button"
          onClick={captureLocation}
          disabled={locating}
          className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
        >
          {locating ? "Locating..." : coords ? "Re-tag GPS" : "Attach GPS"}
        </button>
      </div>

      {/* Completion Note */}
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
          Supporter Notes / Comments (Optional)
        </label>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Distributed 200 posters along Market Street and Bunge bus stage..."
          className="w-full rounded-xl border border-black/10 bg-white p-3 text-xs text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-emerald-600 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || uploads.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Uploading Evidence & Submitting...
          </>
        ) : (
          `Submit ${uploads.length} Evidence Photo${uploads.length === 1 ? "" : "s"}`
        )}
      </button>
    </form>
  );
}
