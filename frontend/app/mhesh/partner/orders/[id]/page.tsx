"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Printer,
  Package,
  CheckCircle2,
  AlertCircle,
  Truck,
  Loader2,
  ExternalLink,
  Coins,
  ShieldCheck,
  ArrowLeft,
  Camera,
  Upload,
  ImagePlus,
  X,
  Clock,
} from "lucide-react";
import { api, errorMessage, shortDate, isUnauthorized } from "@/lib/api";

interface OrderDetail {
  id: string;
  aspirant_id: string;
  partner_id: string;
  design_url: string;
  quantity: number;
  category: string;
  unit_price_kes: number;
  total_kes: number;
  referral_fee_kes: number;
  status: string;
  delivery_evidence_urls: string[];
  created_at: string;
  delivered_at?: string | null;
  approved_at?: string | null;
}

export default function PartnerOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Delivery photos state
  const [deliveryPhotos, setDeliveryPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const res = await api.get<OrderDetail>(`/api/mhesh/partners/orders/${orderId}`);
      setOrder(res.data);
      if (res.data.delivery_evidence_urls) {
        setDeliveryPhotos(res.data.delivery_evidence_urls);
      }
    } catch (err) {
      if (!isUnauthorized(err)) {
        setErrorMsg(errorMessage(err, "Failed to load order details"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) loadOrder();
  }, [orderId]);

  // 1. Accept Order (moves from funded to in_production)
  const handleAcceptOrder = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.post(`/api/mhesh/partners/orders/${orderId}/accept`);
      setSuccessMsg("Order accepted and marked 'In Production'!");
      await loadOrder();
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to accept order"));
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Mark Shipped
  const handleShipOrder = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.post(`/api/mhesh/partners/orders/${orderId}/ship`);
      setSuccessMsg("Order dispatched and marked 'Shipped'!");
      await loadOrder();
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to mark shipped"));
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Upload delivery proof photos to R2
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    setErrorMsg(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Get presigned URL
        const presignRes = await api.post(`/api/mhesh/partners/orders/${orderId}/delivery-upload-url`);
        const { upload_url, public_url } = presignRes.data;

        // Upload to R2
        await fetch(upload_url, {
          method: "PUT",
          headers: { "Content-Type": file.type || "image/jpeg" },
          body: file,
        });

        setDeliveryPhotos((prev) => [...prev, public_url]);
      }
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to upload delivery photo"));
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const removePhoto = (idx: number) => {
    setDeliveryPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // 4. Mark Delivered
  const handleMarkDelivered = async () => {
    if (deliveryPhotos.length === 0) {
      setErrorMsg("Please upload at least one photo showing printed items or delivery handover.");
      return;
    }

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.post(`/api/mhesh/partners/orders/${orderId}/deliver`, {
        evidence_urls: deliveryPhotos,
      });
      setSuccessMsg("Order marked as Delivered! The candidate has been notified to inspect and release escrow.");
      await loadOrder();
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to mark order as delivered"));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (errorMsg && !order) {
    return (
      <div className="mx-auto mt-16 max-w-lg rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-600" />
        <h3 className="mt-2 text-base font-bold">Order Not Found</h3>
        <p className="mt-1 text-xs">{errorMsg}</p>
        <Link
          href="/mhesh/partner/dashboard"
          className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!order) return null;

  const netPayout = order.total_kes - order.referral_fee_kes;

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
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-stone-800 font-mono">
            {order.status.replace(/_/g, " ")}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-8 space-y-6">
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

        {/* Order Details & Artwork Card */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-900">
                {order.category.toUpperCase()}
              </span>
              <h1 className="mt-3 text-2xl font-black tracking-tight text-stone-900 font-serif">
                {order.quantity.toLocaleString()} x {order.category}
              </h1>
              <p className="text-xs text-stone-500 mt-1">
                Order ID: {order.id} • Created {shortDate(order.created_at)}
              </p>
            </div>

            <div className="text-right">
              <span className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
                Net Payout (Escrow)
              </span>
              <span className="text-2xl font-black text-emerald-800 font-mono">
                KSh {netPayout.toLocaleString()}
              </span>
              <span className="block text-[11px] text-stone-400">
                (KSh {order.unit_price_kes} / item)
              </span>
            </div>
          </div>

          {/* Design Asset Preview */}
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-2">
              High-Resolution Print Artwork
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-stone-300 bg-white">
                <img
                  src={order.design_url}
                  alt="Print Artwork"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-xs text-stone-600">
                  Approved candidate visual design asset generated via Mhesh Studio. Download full resolution file for prepress RIP.
                </p>
                <a
                  href={order.design_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Download Master Print File</span>
                </a>
              </div>
            </div>
          </div>

          {/* Actions Based on State */}
          <div className="border-t border-stone-100 pt-5">
            {order.status === "funded" && (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-stone-900">Escrow Funded & Verified</h4>
                  <p className="text-xs text-stone-500">
                    Payment is held in escrow. Accept the job to start production.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAcceptOrder}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                  <span>Accept Job & Start Printing</span>
                </button>
              </div>
            )}

            {order.status === "in_production" && (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-stone-900">Order in Production</h4>
                  <p className="text-xs text-stone-500">
                    Once items are printed and dispatched for delivery, mark as shipped.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleShipOrder}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                  <span>Dispatch / Mark Shipped</span>
                </button>
              </div>
            )}

            {order.status === "approved" && (
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm bg-emerald-50 p-4 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Order completed and escrow released to your M-Pesa account on {shortDate(order.approved_at)}.</span>
              </div>
            )}
          </div>
        </div>

        {/* Delivery Proof Section (for shipped or in_production orders) */}
        {["in_production", "shipped", "delivered"].includes(order.status) && (
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Camera className="h-5 w-5 text-emerald-700" />
                  <span>Delivery Proof Photos</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Upload photos showing the finished merchandise boxes, delivery note, or recipient handover.
                </p>
              </div>
            </div>

            {/* Photos Preview */}
            {deliveryPhotos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {deliveryPhotos.map((url, idx) => (
                  <div key={idx} className="group relative aspect-video overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                    <img src={url} alt={`Delivery ${idx + 1}`} className="h-full w-full object-cover" />
                    {order.status !== "delivered" && order.status !== "approved" && (
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-rose-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload Input */}
            {order.status !== "delivered" && order.status !== "approved" && (
              <div>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 bg-stone-50/50 p-6 text-center transition hover:border-emerald-600 hover:bg-emerald-50/30">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploadingPhoto}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  {uploadingPhoto ? (
                    <div className="flex items-center gap-2 text-stone-600 text-xs">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                      <span>Uploading to R2...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-stone-600 text-xs">
                      <ImagePlus className="h-6 w-6 text-stone-400" />
                      <span className="font-semibold text-stone-800">
                        Click or drag delivery confirmation photos
                      </span>
                      <span className="text-[11px] text-stone-400">JPG or PNG</span>
                    </div>
                  )}
                </label>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleMarkDelivered}
                    disabled={actionLoading || deliveryPhotos.length === 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    <span>Confirm Delivery & Request Payout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
