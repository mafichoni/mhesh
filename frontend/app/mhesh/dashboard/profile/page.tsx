"use client";

import React, { useEffect, useState } from "react";
import {
  User,
  Camera,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone,
  Building,
  MapPin,
  Award,
  BookOpen,
} from "lucide-react";
import { api, errorMessage, isUnauthorized } from "@/lib/api";

const COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo Marakwet", "Embu", "Garissa", "Homa Bay",
  "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii",
  "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
  "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi",
  "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita Taveta", "Tana River",
  "Tharaka Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
];

const OFFICES = [
  { value: "president", label: "President of Kenya" },
  { value: "governor", label: "County Governor" },
  { value: "senator", label: "Senator" },
  { value: "woman_rep", label: "Woman Representative" },
  { value: "mp", label: "Member of Parliament (National Assembly)" },
  { value: "mca", label: "Member of County Assembly (MCA)" },
];

interface ManifestoEntry {
  title: string;
  description: string;
}

interface AchievementEntry {
  title: string;
  description: string;
  year?: number | null;
}

interface ProfileFormState {
  display_name: string;
  official_name: string;
  title_prefix: string;
  party: string;
  office: string;
  county: string;
  constituency: string;
  ward: string;
  whatsapp_public: string;
  manifesto: ManifestoEntry[];
  achievements: AchievementEntry[];
  photo_url?: string | null;
}

export default function EditProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<ProfileFormState>({
    display_name: "",
    official_name: "",
    title_prefix: "",
    party: "",
    office: "mp",
    county: "Nairobi",
    constituency: "",
    ward: "",
    whatsapp_public: "",
    manifesto: [],
    achievements: [],
  });

  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const res = await api.get("/api/mhesh/aspirants/me");
        const d = res.data;
        setForm({
          display_name: d.display_name || "",
          official_name: d.official_name || "",
          title_prefix: d.title_prefix || "",
          party: d.party || "",
          office: d.office || "mp",
          county: d.county || "Nairobi",
          constituency: d.constituency || "",
          ward: d.ward || "",
          whatsapp_public: d.whatsapp_public || "",
          manifesto: Array.isArray(d.manifesto) ? d.manifesto : [],
          achievements: Array.isArray(d.achievements) ? d.achievements : [],
          photo_url: d.photo_url || null,
        });
      } catch (err: unknown) {
        const errorObj = err as { response?: { status?: number } };
        if (errorObj?.response?.status === 404) {
          setIsNew(true);
          try {
            const userRes = await api.get<{ full_name?: string }>("/api/auth/me");
            if (userRes.data?.full_name) {
              setForm((prev) => ({ ...prev, display_name: userRes.data.full_name || "" }));
            }
          } catch {
            // ignore
          }
        } else if (!isUnauthorized(err)) {
          setErrorMsg(errorMessage(err, "Failed to load profile details"));
        }
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Get presigned R2 upload URL
      const presignRes = await api.post("/api/mhesh/aspirants/me/photo-upload-url");
      const { upload_url, key } = presignRes.data;

      // 2. Upload file to R2
      await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });

      // 3. Save photo key to profile
      const patchRes = await api.patch("/api/mhesh/aspirants/me", { photo_r2_key: key });
      setForm((prev) => ({ ...prev, photo_url: patchRes.data.photo_url }));
      setSuccessMsg("Profile photo updated successfully!");
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to upload photo"));
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isNew) {
        const createPayload = {
          display_name: form.display_name.trim(),
          official_name: form.official_name.trim() || null,
          title_prefix: form.title_prefix.trim() || null,
          party: form.party.trim() || null,
          office: form.office,
          county: form.county,
          constituency: form.constituency.trim() || null,
          ward: form.ward.trim() || null,
          whatsapp_public: form.whatsapp_public.trim() || null,
        };
        const createRes = await api.post("/api/mhesh/aspirants/me", createPayload);
        setIsNew(false);

        // If user also added manifesto or achievements, patch them now
        const hasExtra = (form.manifesto.some((m) => m.title.trim() && m.description.trim())) ||
                         (form.achievements.some((a) => a.title.trim() && a.description.trim()));
        if (hasExtra) {
          const patchPayload = {
            manifesto: form.manifesto.filter((m) => m.title.trim() && m.description.trim()),
            achievements: form.achievements.filter((a) => a.title.trim() && a.description.trim()),
          };
          const patchRes = await api.patch("/api/mhesh/aspirants/me", patchPayload);
          setForm((prev) => ({
            ...prev,
            manifesto: patchRes.data.manifesto || [],
            achievements: patchRes.data.achievements || [],
          }));
        }
        setSuccessMsg("Candidate campaign profile successfully created!");
      } else {
        const payload = {
          display_name: form.display_name.trim(),
          official_name: form.official_name.trim() || null,
          title_prefix: form.title_prefix.trim() || null,
          party: form.party.trim() || null,
          office: form.office,
          county: form.county,
          constituency: form.constituency.trim() || null,
          ward: form.ward.trim() || null,
          whatsapp_public: form.whatsapp_public.trim() || null,
          manifesto: form.manifesto.filter((m) => m.title.trim() && m.description.trim()),
          achievements: form.achievements.filter((a) => a.title.trim() && a.description.trim()),
        };

        const res = await api.patch("/api/mhesh/aspirants/me", payload);
        setForm((prev) => ({
          ...prev,
          display_name: res.data.display_name,
          official_name: res.data.official_name || "",
          title_prefix: res.data.title_prefix || "",
          party: res.data.party || "",
          office: res.data.office,
          county: res.data.county,
          constituency: res.data.constituency || "",
          ward: res.data.ward || "",
          whatsapp_public: res.data.whatsapp_public || "",
          manifesto: res.data.manifesto || [],
          achievements: res.data.achievements || [],
        }));
        setSuccessMsg("Candidate profile saved successfully!");
      }
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to save profile changes"));
    } finally {
      setSaving(false);
    }
  };

  const addManifestoItem = () => {
    setForm((prev) => ({
      ...prev,
      manifesto: [...prev.manifesto, { title: "", description: "" }],
    }));
  };

  const updateManifestoItem = (index: number, field: "title" | "description", val: string) => {
    setForm((prev) => {
      const updated = [...prev.manifesto];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, manifesto: updated };
    });
  };

  const removeManifestoItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      manifesto: prev.manifesto.filter((_, i) => i !== index),
    }));
  };

  const addAchievementItem = () => {
    setForm((prev) => ({
      ...prev,
      achievements: [...prev.achievements, { title: "", description: "", year: new Date().getFullYear() }],
    }));
  };

  const updateAchievementItem = (
    index: number,
    field: "title" | "description" | "year",
    val: string | number | null
  ) => {
    setForm((prev) => {
      const updated = [...prev.achievements];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, achievements: updated };
    });
  };

  const removeAchievementItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8 pb-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900 font-serif">
            Candidate Profile & Manifesto
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Keep your official candidacy, electoral boundaries, manifesto pledges, and track record up to date.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || uploadingPhoto}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{saving ? "Saving Changes..." : "Save Profile"}</span>
        </button>
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

      {/* Photo & Basic Details */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <User className="h-4 w-4 text-emerald-700" />
          <span>Identity & Candidate Photo</span>
        </h2>

        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-2 border-stone-200 bg-stone-100 shadow-inner">
            {form.photo_url ? (
              <img src={form.photo_url} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-stone-400">
                <User className="h-12 w-12" />
              </div>
            )}
            {uploadingPhoto && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>

          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50">
              <Camera className="h-4 w-4 text-emerald-700" />
              <span>{uploadingPhoto ? "Uploading to R2..." : "Upload High-Res Portrait"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png"
                disabled={uploadingPhoto}
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
            <p className="mt-2 text-[11px] text-stone-500">
              Recommended: 1000x1000px JPG or PNG. Used on public profile, ballot mockups, and AI studio models.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700">Honorific / Title Prefix</label>
            <input
              type="text"
              placeholder="Hon. / Dr. / Eng."
              value={form.title_prefix}
              onChange={(e) => setForm({ ...form, title_prefix: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700">Campaign / Ballot Display Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Hon. John Kamau"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700">Official / Legal ID Name</label>
            <input
              type="text"
              placeholder="As per National ID / Passport"
              value={form.official_name}
              onChange={(e) => setForm({ ...form, official_name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Electoral Office & Boundaries */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <Building className="h-4 w-4 text-emerald-700" />
          <span>Electoral Office & Geography</span>
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700">Contested Office *</label>
            <select
              value={form.office}
              onChange={(e) => setForm({ ...form, office: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
            >
              {OFFICES.map((off) => (
                <option key={off.value} value={off.value}>
                  {off.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700">Political Party / Coalition</label>
            <input
              type="text"
              placeholder="e.g. Independent / UDA / ODM / Jubilee"
              value={form.party}
              onChange={(e) => setForm({ ...form, party: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700">County *</label>
            <select
              value={form.county}
              onChange={(e) => setForm({ ...form, county: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
            >
              {COUNTIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700">Constituency</label>
            <input
              type="text"
              placeholder="e.g. Kibra, Dagoretti North"
              value={form.constituency}
              onChange={(e) => setForm({ ...form, constituency: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700">Ward</label>
            <input
              type="text"
              placeholder="e.g. Sarang'ombe, Kilimani"
              value={form.ward}
              onChange={(e) => setForm({ ...form, ward: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700">Public Campaign WhatsApp</label>
            <div className="relative mt-1">
              <input
                type="tel"
                placeholder="07XXXXXXXX or +254..."
                value={form.whatsapp_public}
                onChange={(e) => setForm({ ...form, whatsapp_public: e.target.value })}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
              />
              <Phone className="absolute right-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Manifesto Items */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-700" />
            <span>Manifesto & Key Pillars ({form.manifesto.length})</span>
          </h2>
          <button
            type="button"
            onClick={addManifestoItem}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            <Plus className="h-3.5 w-3.5 text-emerald-700" />
            <span>Add Pillar</span>
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {form.manifesto.length === 0 ? (
            <p className="text-xs text-stone-400 italic">
              No manifesto items added yet. Click &apos;Add Pillar&apos; to showcase your core agenda (e.g. Youth Empowerment, Clean Water, Healthcare).
            </p>
          ) : (
            form.manifesto.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-stone-200 bg-stone-50/50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-900 font-mono">Pillar #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeManifestoItem(idx)}
                    className="text-stone-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    placeholder="Pillar Title (e.g. Modernizing Local Markets)"
                    value={item.title}
                    onChange={(e) => updateManifestoItem(idx, "title", e.target.value)}
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold focus:border-emerald-600 focus:outline-none"
                  />
                  <textarea
                    rows={2}
                    placeholder="Detailed commitment to voters (min 20 characters)..."
                    value={item.description}
                    onChange={(e) => updateManifestoItem(idx, "description", e.target.value)}
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Achievements / Track Record */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-700" />
            <span>Track Record & Past Achievements ({form.achievements.length})</span>
          </h2>
          <button
            type="button"
            onClick={addAchievementItem}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            <Plus className="h-3.5 w-3.5 text-emerald-700" />
            <span>Add Achievement</span>
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {form.achievements.length === 0 ? (
            <p className="text-xs text-stone-400 italic">
              Highlight verifiable past community projects, leadership accomplishments, or bursary programs.
            </p>
          ) : (
            form.achievements.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-stone-200 bg-stone-50/50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-900 font-mono">Item #{idx + 1}</span>
                    <input
                      type="number"
                      placeholder="Year"
                      value={item.year || ""}
                      onChange={(e) =>
                        updateAchievementItem(
                          idx,
                          "year",
                          e.target.value ? parseInt(e.target.value, 10) : null
                        )
                      }
                      className="w-20 rounded border border-stone-300 bg-white px-2 py-0.5 text-xs font-mono focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAchievementItem(idx)}
                    className="text-stone-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    placeholder="Achievement Title (e.g. Solar Streetlighting Project)"
                    value={item.title}
                    onChange={(e) => updateAchievementItem(idx, "title", e.target.value)}
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold focus:border-emerald-600 focus:outline-none"
                  />
                  <textarea
                    rows={2}
                    placeholder="Description of impact and beneficiary count..."
                    value={item.description}
                    onChange={(e) => updateAchievementItem(idx, "description", e.target.value)}
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </form>
  );
}
