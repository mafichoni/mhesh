"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Printer,
  Package,
  Coins,
  Star,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  Truck,
  Building,
  Settings,
  ShieldCheck,
  ChevronRight,
  Vote,
} from "lucide-react";
import { api, errorMessage, shortDate, isUnauthorized } from "@/lib/api";

interface PartnerProfile {
  id: string;
  slug: string;
  business_name: string;
  owner_name: string;
  county: string;
  ward?: string | null;
  capabilities: string[];
  pricing: Record<string, number>;
  capacity_per_day?: number | null;
  turnaround_days?: number | null;
  verified: boolean;
  status: string;
  rating: number;
  trust_score: number;
  orders_completed: number;
}

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
}

export default function PartnerDashboardPage() {
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [orders, setOrders] = useState<PrintOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadPartnerData() {
      try {
        setLoading(true);
        const [profRes, ordersRes] = await Promise.all([
          api.get<PartnerProfile>("/api/mhesh/partners/me/profile"),
          api.get<PrintOrder[]>("/api/mhesh/partners/me/orders").catch(() => ({ data: [] })),
        ]);
        setPartner(profRes.data);
        setOrders(ordersRes.data || []);
      } catch (err) {
        if (!isUnauthorized(err)) {
          setErrorMsg(errorMessage(err, "Failed to load print partner dashboard"));
        }
      } finally {
        setLoading(false);
      }
    }
    loadPartnerData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (errorMsg || !partner) {
    return (
      <div className="mx-auto mt-16 max-w-lg rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-600" />
        <h3 className="mt-2 text-base font-bold">Partner Account Required</h3>
        <p className="mt-1 text-xs">{errorMsg || "Print partner profile not found."}</p>
        <Link
          href="/mhesh"
          className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline"
        >
          Return to Mhesh
        </Link>
      </div>
    );
  }

  // Calculate total revenue from approved or completed orders
  const totalRevenue = orders
    .filter((o) => ["in_production", "shipped", "delivered", "approved"].includes(o.status))
    .reduce((acc, o) => acc + (o.total_kes - o.referral_fee_kes), 0);

  const incomingOrders = orders.filter((o) => ["funded", "pending"].includes(o.status));

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 pb-16">
      {/* Top Navbar */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-sm">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <span className="font-serif text-lg font-black tracking-tight text-emerald-950">
                {partner.business_name}
              </span>
              <span className="hidden sm:inline-block ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900 capitalize">
                {partner.county} Print Partner
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/mhesh/partner/profile"
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Shop Profile & Pricing</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 space-y-8">
        {/* Welcome Row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-stone-900 font-serif">
              Print Partner Dashboard
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              Manage campaign merchandise orders, print jobs, and fulfillment payouts.
            </p>
          </div>

          {partner.verified && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              <span>IEBC Certified Print Partner</span>
            </div>
          )}
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Incoming Orders */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-bold uppercase tracking-wider">Incoming Orders</span>
              <Package className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-stone-900 font-mono">
              {incomingOrders.length}
            </div>
            <p className="mt-1 text-xs text-stone-500">Awaiting acceptance & production</p>
          </div>

          {/* Orders Completed */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-bold uppercase tracking-wider">Completed Orders</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-stone-900 font-mono">
              {partner.orders_completed}
            </div>
            <p className="mt-1 text-xs text-stone-500">Delivered & approved</p>
          </div>

          {/* Rating */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-bold uppercase tracking-wider">Customer Rating</span>
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-stone-900 font-mono">
                {partner.rating > 0 ? partner.rating.toFixed(1) : "5.0"}
              </span>
              <span className="text-xs text-stone-400">/ 5.0 stars</span>
            </div>
            <p className="mt-1 text-xs text-stone-500">Based on candidate reviews</p>
          </div>

          {/* Total Revenue */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-bold uppercase tracking-wider">Net Escrow Payouts</span>
              <Coins className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1 text-2xl font-black text-emerald-800 font-mono">
              <span>KSh {totalRevenue.toLocaleString()}</span>
            </div>
            <p className="mt-1 text-xs text-stone-500">Direct to shop M-Pesa</p>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50/70 p-4">
            <h3 className="text-sm font-bold text-stone-900">Print Production Jobs ({orders.length})</h3>
            <span className="text-xs text-stone-500">All campaign orders placed with your shop</span>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-400">
              No orders assigned yet. Candidates in {partner.county} will send print batches to your shop.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between hover:bg-stone-50/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                      <img
                        src={order.design_url}
                        alt={order.category}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm">
                        {order.quantity.toLocaleString()} x {order.category.toUpperCase()}
                      </h4>
                      <p className="text-xs text-stone-500">
                        Order #{order.id.slice(0, 8)} • Placed {shortDate(order.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-right">
                      <span className="block font-mono text-sm font-extrabold text-stone-900">
                        KSh {(order.total_kes - order.referral_fee_kes).toLocaleString()}
                      </span>
                      <span className="block text-[11px] text-stone-400 font-mono">
                        (KSh {order.unit_price_kes} each)
                      </span>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                        order.status === "approved"
                          ? "bg-emerald-100 text-emerald-900"
                          : order.status === "in_production"
                          ? "bg-amber-100 text-amber-900"
                          : order.status === "shipped"
                          ? "bg-purple-100 text-purple-900"
                          : "bg-stone-100 text-stone-800"
                      }`}
                    >
                      {order.status.replace(/_/g, " ")}
                    </span>

                    <Link
                      href={`/mhesh/partner/orders/${order.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      <span>Manage</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
