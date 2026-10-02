"use client";

import React, { useState } from "react";
import { UserPlus, Check, AlertCircle, X, Loader2, Mail, Phone } from "lucide-react";
import { api, errorMessage } from "@/lib/api";

export interface FollowButtonProps {
  slug: string;
  candidateName: string;
  className?: string;
}

export function FollowButton({ slug, candidateName, className = "" }: FollowButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contactKind, setContactKind] = useState<"phone" | "email">("phone");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = contact.trim();
    if (!trimmed) {
      setError("Please enter your contact information");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/api/mhesh/aspirants/${slug}/follow`, {
        contact: trimmed,
        contact_kind: contactKind,
      });

      if (res.data?.already_following) {
        setSuccess(`You are already following ${candidateName}!`);
      } else {
        setSuccess(`Verification link sent! Check your ${contactKind === "email" ? "inbox" : "phone"} to confirm.`);
      }
      setContact("");
    } catch (err) {
      setError(errorMessage(err, "Failed to submit follow request. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setSuccess(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 active:scale-95 ${className}`}
      >
        <UserPlus size={16} />
        <span>Follow Campaign</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900 dark:border dark:border-neutral-800">
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Follow {candidateName}
              </h3>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                Receive official campaign news, upcoming rallies, and direct manifesto updates.
              </p>
            </div>

            {success ? (
              <div className="rounded-xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <div className="flex items-start gap-2.5">
                  <Check size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                  <p className="text-sm font-medium">{success}</p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-4 w-full rounded-lg bg-emerald-700 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Receive Updates Via
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setContactKind("phone")}
                      className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition ${
                        contactKind === "phone"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <Phone size={14} />
                      SMS / Phone
                    </button>
                    <button
                      type="button"
                      onClick={() => setContactKind("email")}
                      className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition ${
                        contactKind === "email"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <Mail size={14} />
                      Email
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="follow-contact" className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {contactKind === "phone" ? "Kenyan Phone Number (07... / +254...)" : "Email Address"}
                  </label>
                  <input
                    id="follow-contact"
                    type={contactKind === "phone" ? "tel" : "email"}
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder={contactKind === "phone" ? "0712345678" : "voter@example.com"}
                    required
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                  <p className="mt-1 text-[11px] text-neutral-500">
                    We will send a one-time verification link. You can unsubscribe at any time.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-1/3 rounded-xl border border-neutral-200 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 py-2.5 text-xs font-semibold text-white shadow hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    <span>Confirm Follow</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
