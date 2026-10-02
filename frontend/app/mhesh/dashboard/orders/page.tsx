"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Loader2,
  ExternalLink,
  Coins,
  ShieldCheck,
  ShoppingBag,
  Phone,
} from "lucide-react";
import { api, errorMessage, shortDate, isUnauthorized } from "@/lib/api";

interface PrintOrder {
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

const ORDER_STEPS = ["pending", "funded", "in_production", "shipped", "delivered", "approved"];

const STATUS_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  pending: { label: "Payment Pending", color: "bg-stone-100 text-stone-700", desc: "Awaiting M-Pesa escrow funding" },
  funded: { label: "Escrow Funded", color: "bg-blue-50 text-blue-700", desc: "Funds held in escrow; partner notified" },
  in_production: { label: "In Production", color: "bg-amber-50 text-amber-700", desc: "Partner is printing items in workshop" },
  shipped: { label: "Dispatched / Shipped", color: "bg-purple-50 text-purple-700", desc: "Order is in transit to destination" },
  delivered: { label: "Delivered", color: "bg-emerald-50 text-emerald-800", desc: "Partner uploaded delivery proof photos" },
  approved: { label: "Approved & Paid", color: "bg-emerald-100 text-emerald-900", desc: "Escrow released to printer partner" },
  disputed: { label: "Disputed", color: "bg-rose-50 text-rose-700", desc: "Under review by Mhesh operations" },
};

export default function AspirantOrdersPage() {
  const [orders, setOrders] = useState<PrintOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fund modal state
  const [fundOrderId, setFundOrderId] = useState<string | null>(null);
  const [fundPhone, setFundPhone] = useState("");

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get<PrintOrder[]>("/api/mhesh/partners/orders/mine");
      setOrders(res.data || []);
    } catch (err) {
      if (!isUnauthorized(err)) {
        setErrorMsg(errorMessage(err, "Failed to load print orders"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleFundOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundOrderId || !fundPhone) return;

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.post(`/api/mhesh/partners/orders/${fundOrderId}/fund`, { phone: fundPhone });
      setSuccessMsg("STK push initiated! Enter M-Pesa PIN on your phone to fund print escrow.");
      setFundOrderId(null);
      setFundPhone("");
      await loadOrders();
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to fund print order"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveDelivery = async (orderId: string) => {
    if (!window.confirm("Approve delivery and release escrow payment to printer?")) return;

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post(`/api/mhesh/partners/orders/${orderId}/approve`);
      setSuccessMsg(`Order approved! Payout of KSh ${res.data.payout_kes} released to printing partner.`);
      await loadOrders();
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to approve order"));
    } finally {
      setActionLoading(false);
    }
  };

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
      <div>
        <h1 className="text-2xl font-black tracking-tight text-stone-900 font-serif">
          Merchandise & Print Orders
        </h1>
        <p className="mt-1 text-xs text-stone-500">
          Track production and delivery of campaign posters, t-shirts, banners, and flyers with certified local Kenyan printers.
        </p>
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

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white/50 p-12 text-center">
          <Package className="h-10 w-10 text-stone-300" />
          <h3 className="mt-3 text-base font-semibold text-stone-900">No print orders yet</h3>
          <p className="mt-1 text-xs text-stone-500 max-w-sm">
            Generate your campaign collateral in AI Studio, then send production batches directly to vetted print partners.
          </p>
          <Link
            href="/mhesh/dashboard/studio"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Open Studio</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const statusInfo = STATUS_LABELS[order.status] || {
              label: order.status,
              color: "bg-stone-100 text-stone-700",
              desc: "",
            };
            const currentStepIdx = ORDER_STEPS.indexOf(order.status);

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
              >
                {/* Header row */}
                <div className="flex flex-col gap-3 border-b border-stone-100 bg-stone-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                      <img
                        src={order.design_url}
                        alt={order.category}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 text-sm">
                        {order.quantity.toLocaleString()} x {order.category.toUpperCase()}
                      </h3>
                      <span className="text-xs text-stone-400">Order ID: {order.id.slice(0, 8)} • Placed {shortDate(order.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                    <span className="font-mono text-base font-extrabold text-stone-900">
                      KSh {order.total_kes.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Status Stepper */}
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-6 text-center text-xs">
                    {ORDER_STEPS.map((stepName, sIdx) => {
                      const isComplete = currentStepIdx >= sIdx;
                      const isCurrent = currentStepIdx === sIdx;

                      return (
                        <div key={stepName} className="flex flex-col items-center">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                              isComplete
                                ? "bg-emerald-700 text-white"
                                : "bg-stone-100 text-stone-400"
                            } ${isCurrent ? "ring-2 ring-emerald-500 ring-offset-2" : ""}`}
                          >
                            {isComplete ? "✓" : sIdx + 1}
                          </div>
                          <span
                            className={`mt-1.5 text-[11px] capitalize ${
                              isComplete ? "font-bold text-stone-800" : "text-stone-400"
                            }`}
                          >
                            {stepName.replace(/_/g, " ")}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Delivery proof photos if delivered */}
                  {order.delivery_evidence_urls && order.delivery_evidence_urls.length > 0 && (
                    <div className="mt-5 border-t border-stone-100 pt-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-2">
                        Delivery Proof Photos from Print Partner
                      </span>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {order.delivery_evidence_urls.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative aspect-video overflow-hidden rounded-lg border border-stone-200"
                          >
                            <img src={url} alt={`Delivery ${i + 1}`} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 text-white text-xs font-semibold">
                              <ExternalLink className="h-4 w-4 mr-1" /> View
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action row */}
                  <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-stone-100 pt-4">
                    {order.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => setFundOrderId(order.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800"
                      >
                        <Coins className="h-3.5 w-3.5" />
                        <span>Fund via M-Pesa (KSh {order.total_kes.toLocaleString()})</span>
                      </button>
                    )}

                    {order.status === "delivered" && (
                      <button
                        type="button"
                        onClick={() => handleApproveDelivery(order.id)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approve Delivery & Release Escrow</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fund Modal */}
      {fundOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleFundOrder}
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center gap-2 text-stone-900 font-bold text-base">
              <Coins className="h-5 w-5 text-emerald-700" />
              <span>Fund Print Escrow</span>
            </div>
            <p className="text-xs text-stone-600">
              Enter your M-Pesa phone number to receive the prompt and deposit payment into escrow.
            </p>
            <div>
              <label className="block text-xs font-semibold text-stone-700">M-Pesa Mobile Number</label>
              <div className="relative mt-1">
                <input
                  type="tel"
                  required
                  placeholder="07XXXXXXXX or 254..."
                  value={fundPhone}
                  onChange={(e) => setFundPhone(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 pl-9 pr-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
                <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFundOrderId(null)}
                className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !fundPhone}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {actionLoading ? "Sending STK..." : "Deposit Escrow"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
