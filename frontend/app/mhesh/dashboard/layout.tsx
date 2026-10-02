"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Wand2,
  CheckSquare,
  Package,
  Users,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Vote,
} from "lucide-react";
import { api, getToken, logout, isUnauthorized } from "@/lib/api";

interface AspirantUser {
  id: string;
  slug: string;
  display_name: string;
  office: string;
  county: string;
  photo_url?: string | null;
  verified_mpesa: boolean;
  tier: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Overview", href: "/mhesh/dashboard", icon: LayoutDashboard, exact: true },
  { name: "Profile", href: "/mhesh/dashboard/profile", icon: User },
  { name: "AI Studio", href: "/mhesh/dashboard/studio", icon: Wand2 },
  { name: "Tasks", href: "/mhesh/dashboard/tasks", icon: CheckSquare },
  { name: "Print Orders", href: "/mhesh/dashboard/orders", icon: Package },
  { name: "Followers", href: "/mhesh/dashboard/followers", icon: Users },
];

export default function AspirantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [aspirant, setAspirant] = useState<AspirantUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/mhesh");
      return;
    }

    let active = true;
    async function fetchMe() {
      try {
        const res = await api.get<AspirantUser>("/api/mhesh/aspirants/me");
        if (active) setAspirant(res.data);
      } catch (err) {
        if (isUnauthorized(err)) {
          logout();
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchMe();
    return () => {
      active = false;
    };
  }, [router]);

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 antialiased">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-stone-200 bg-white px-4 md:hidden">
        <div className="flex items-center gap-2">
          <Vote className="h-6 w-6 text-emerald-700" />
          <span className="text-lg font-black tracking-tight text-emerald-950 font-serif">
            MHESH
          </span>
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-900">
            Aspirant
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div className="flex min-h-[calc(100vh-4rem)] md:min-h-screen">
        {/* Desktop Sidebar & Mobile Slide-out */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-stone-200 bg-white transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col">
            {/* Logo */}
            <div className="hidden h-16 items-center justify-between border-b border-stone-100 px-6 md:flex">
              <Link href="/mhesh" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-sm">
                  <Vote className="h-5 w-5" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="font-serif text-lg font-black tracking-tight text-emerald-950">
                    MHESH
                  </span>
                  <span className="text-[10px] font-semibold text-stone-500">
                    CAMPAIGN OS 2027
                  </span>
                </div>
              </Link>
            </div>

            {/* Aspirant Mini Profile Card */}
            <div className="p-4">
              <div className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50/80 p-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-emerald-100 border border-emerald-200">
                  {aspirant?.photo_url ? (
                    <img
                      src={aspirant.photo_url}
                      alt={aspirant.display_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-emerald-800">
                      {aspirant?.display_name ? aspirant.display_name.charAt(0) : "M"}
                    </div>
                  )}
                  {aspirant?.verified_mpesa && (
                    <div className="absolute bottom-0 right-0 rounded-full bg-white p-0.5 shadow">
                      <ShieldCheck className="h-3 w-3 text-emerald-600 fill-emerald-600" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-stone-900">
                    {aspirant?.display_name || (loading ? "Loading..." : "Campaign Office")}
                  </p>
                  <p className="truncate text-xs text-stone-500 capitalize">
                    {aspirant?.office ? `${aspirant.office.replace(/_/g, " ")} • ${aspirant.county}` : "Aspirant Account"}
                  </p>
                </div>
              </div>

              {aspirant?.slug && (
                <Link
                  href={`/mhesh/p/${aspirant.slug}`}
                  target="_blank"
                  className="mt-2 flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
                >
                  <span className="flex items-center gap-1.5">
                    <ExternalLink className="h-3 w-3" />
                    Public Profile
                  </span>
                  <ChevronRight className="h-3 w-3 text-emerald-600" />
                </Link>
              )}
            </div>

            {/* Navigation links */}
            <nav className="mt-2 space-y-1 px-3">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-emerald-800 text-white shadow-sm"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? "text-white" : "text-stone-500"}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom user action & logout */}
          <div className="border-t border-stone-200 p-4">
            <button
              onClick={() => logout()}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs md:hidden"
          />
        )}

        {/* Main Dashboard Content */}
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
