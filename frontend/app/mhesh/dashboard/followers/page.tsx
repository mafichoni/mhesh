"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  Search,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Download,
} from "lucide-react";
import { api, errorMessage, shortDate, isUnauthorized } from "@/lib/api";

interface FollowerItem {
  id: string;
  contact_kind: "email" | "phone";
  verified: boolean;
  contact: string;
  created_at: string;
}

export default function FollowersPage() {
  const [followers, setFollowers] = useState<FollowerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "phone" | "email">("all");

  useEffect(() => {
    async function loadFollowers() {
      try {
        setLoading(true);
        const res = await api.get<FollowerItem[]>("/api/mhesh/aspirants/me/followers");
        setFollowers(res.data || []);
      } catch (err) {
        if (!isUnauthorized(err)) {
          setErrorMsg(errorMessage(err, "Failed to load supporters list"));
        }
      } finally {
        setLoading(false);
      }
    }
    loadFollowers();
  }, []);

  const filtered = followers.filter((f) => {
    const matchesKind = kindFilter === "all" || f.contact_kind === kindFilter;
    const matchesSearch = !searchQuery || f.contact.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesKind && matchesSearch;
  });

  const exportCsv = () => {
    const headers = ["Contact Kind", "Contact", "Verified", "Joined Date"];
    const rows = filtered.map((f) => [
      f.contact_kind,
      f.contact,
      f.verified ? "Yes" : "No",
      f.created_at,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mhesh-supporters-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const verifiedCount = followers.filter((f) => f.verified).length;
  const phoneCount = followers.filter((f) => f.contact_kind === "phone").length;
  const emailCount = followers.filter((f) => f.contact_kind === "email").length;

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900 font-serif">
            Supporter & Voter CRM
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Citizens who opted in to follow your campaign, receive manifesto updates, and rally notices.
          </p>
        </div>

        <button
          onClick={exportCsv}
          disabled={followers.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4 text-emerald-700" />
          <span>Export CSV</span>
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-xs font-semibold text-rose-800 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Total Opted-in
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-stone-900">{followers.length}</span>
            <span className="text-xs text-emerald-700 font-medium">({verifiedCount} confirmed)</span>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            SMS / Mobile Followers
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-stone-900">{phoneCount}</span>
            <span className="text-xs text-stone-400">direct SMS reach</span>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Email Subscribers
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-stone-900">{emailCount}</span>
            <span className="text-xs text-stone-400">newsletters</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search by phone number or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-xs focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setKindFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              kindFilter === "all" ? "bg-emerald-800 text-white font-semibold" : "bg-stone-100 text-stone-600"
            }`}
          >
            All Contacts
          </button>
          <button
            onClick={() => setKindFilter("phone")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              kindFilter === "phone" ? "bg-emerald-800 text-white font-semibold" : "bg-stone-100 text-stone-600"
            }`}
          >
            Phone Only
          </button>
          <button
            onClick={() => setKindFilter("email")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              kindFilter === "email" ? "bg-emerald-800 text-white font-semibold" : "bg-stone-100 text-stone-600"
            }`}
          >
            Email Only
          </button>
        </div>
      </div>

      {/* Followers Table */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No supporters matching your filters.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-200 bg-stone-50/80 uppercase tracking-wider text-stone-500 font-semibold">
              <tr>
                <th className="px-6 py-3.5">Supporter Contact</th>
                <th className="px-6 py-3.5">Channel</th>
                <th className="px-6 py-3.5">Verification</th>
                <th className="px-6 py-3.5">Date Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50/50">
                  <td className="px-6 py-4 font-mono font-medium text-stone-900">
                    {item.contact}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-stone-700 capitalize">
                      {item.contact_kind === "phone" ? (
                        <Phone className="h-3 w-3 text-stone-500" />
                      ) : (
                        <Mail className="h-3 w-3 text-stone-500" />
                      )}
                      <span>{item.contact_kind}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {item.verified ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <Clock className="h-3.5 w-3.5" /> Pending OTP
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-stone-500">{shortDate(item.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
