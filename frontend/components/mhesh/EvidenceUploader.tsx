"use client";

import React, { useState, useEffect } from "react";
import { Upload, MapPin, CheckCircle2, AlertCircle, Loader2, ImagePlus, X } from "lucide-react";
import { api, errorMessage } from "@/lib/api";

interface EvidenceUploaderProps {
  taskId: string;
  onSuccess: (result: { score?: number; reason?: string }) => void;
}

export function EvidenceUploader({ taskId, onSuccess }: EvidenceUploaderProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Request browser geolocation on mount
  useEffect(() => {
    captureLocation();
  }, []);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocating(false);
      },
      (err) => {
        setLocationError(`Location capture failed: ${err.message}. Please enable GPS.`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    setSubmitError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // 1. Get presigned upload URL
        const presignRes = await api.post(`/api/mhesh/tasks/${taskId}/evidence-upload-url`);
        const { upload_url, public_url } = presignRes.data;

        // 2. Upload file directly to R2
        await fetch(upload_url, {
          method: "PUT",
          headers: { "Content-Type": file.type || "image/jpeg" },
          body: file,
        });

        setPhotos((prev) => [...prev, public_url]);
      }
    } catch (err: unknown) {
      setSubmitError(errorMessage(err, "Failed to upload photo"));
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photos.length === 0) {
      setSubmitError("Please upload at least one evidence photo.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await api.post(`/api/mhesh/tasks/${taskId}/submit-evidence`, {
        evidence_urls: photos,
        note: note.trim() || undefined,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });

      const verification = res.data?.verification || {};
      onSuccess({
        score: verification.score,
        reason: verification.reason,
      });
    } catch (err: unknown) {
      setSubmitError(errorMessage(err, "Evidence submission failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="border-b border-stone-100 pb-4">
        <h3 className="text-lg font-bold text-stone-900">Submit Task Evidence</h3>
        <p className="mt-1 text-xs text-stone-500">
          Upload geotagged photos and field verification details. AI checks image authenticity and geolocation.
        </p>
      </div>

      {submitError && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Geolocation Section */}
      <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className={`h-4 w-4 ${coords ? "text-emerald-600" : "text-stone-400"}`} />
            <span className="text-xs font-semibold text-stone-800">Field Geotag</span>
          </div>
          <button
            type="button"
            onClick={captureLocation}
            disabled={locating}
            className="text-xs font-medium text-emerald-700 hover:underline disabled:opacity-50"
          >
            {locating ? "Acquiring GPS..." : coords ? "Re-tag GPS" : "Capture GPS"}
          </button>
        </div>

        {coords ? (
          <div className="mt-2 text-xs font-mono text-emerald-800">
            Latitude: {coords.lat.toFixed(5)}, Longitude: {coords.lng.toFixed(5)}
            <span className="ml-2 inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-900 font-sans">
              GPS Verified
            </span>
          </div>
        ) : locationError ? (
          <p className="mt-2 text-xs text-rose-600">{locationError}</p>
        ) : (
          <p className="mt-2 text-xs text-stone-500">Acquiring current GPS coordinates...</p>
        )}
      </div>

      {/* Photo Uploader */}
      <div className="mt-5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
          Field Photos ({photos.length} uploaded)
        </label>

        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((url, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                <img src={url} alt={`Evidence ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-90 transition hover:bg-rose-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 bg-stone-50/50 p-6 text-center transition hover:border-emerald-600 hover:bg-emerald-50/30">
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploadingPhoto}
              onChange={handleFileChange}
              className="hidden"
            />
            {uploadingPhoto ? (
              <div className="flex flex-col items-center gap-2 text-stone-600">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <span className="text-xs">Uploading photo to R2 storage...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-stone-600">
                <ImagePlus className="h-6 w-6 text-stone-400" />
                <span className="text-xs font-medium text-stone-800">
                  Click or drag to upload verification photos
                </span>
                <span className="text-[11px] text-stone-400">JPG, PNG up to 10MB</span>
              </div>
            )}
          </label>
        </div>
      </div>

      {/* Field Notes */}
      <div className="mt-5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
          Field Notes & Summary (Optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="E.g. Put up 150 posters along Kibera Olympic stage and bus stop. High pedestrian visibility."
          className="mt-1 w-full rounded-lg border border-stone-300 p-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
      </div>

      <div className="mt-6">
        <button
          type="submit"
          disabled={submitting || uploadingPhoto || photos.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying with AI & Submitting...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>Submit Evidence for Approval</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
