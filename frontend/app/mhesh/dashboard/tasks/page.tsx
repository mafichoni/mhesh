"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Plus,
  Filter,
  Loader2,
  AlertCircle,
  Clock,
  Layers,
  Search,
} from "lucide-react";
import { api, errorMessage, isUnauthorized } from "@/lib/api";
import { TaskCard, TaskItem } from "@/components/mhesh/TaskCard";

const STATUS_FILTERS = [
  { id: "all", label: "All Tasks" },
  { id: "draft", label: "Drafts" },
  { id: "funded", label: "Funded (Escrow)" },
  { id: "published", label: "Open Applications" },
  { id: "assigned", label: "In Progress" },
  { id: "completed", label: "Evidence Submitted" },
  { id: "approved", label: "Approved & Paid" },
  { id: "disputed", label: "Disputed" },
];

export default function AspirantTasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadTasks() {
      try {
        setLoading(true);
        const res = await api.get<TaskItem[]>("/api/mhesh/tasks");
        setTasks(res.data || []);
      } catch (err) {
        if (!isUnauthorized(err)) {
          setErrorMsg(errorMessage(err, "Failed to load campaign tasks"));
        }
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = selectedStatus === "all" || t.status === selectedStatus;
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.county.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.ward && t.ward.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

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
            Ground Campaign Tasks
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Mobilize grassroots youth and supporters with M-Pesa escrow-backed tasks: poster distribution, event staffing, and barazas.
          </p>
        </div>

        <Link
          href="/mhesh/dashboard/tasks/new"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Task</span>
        </Link>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-xs font-semibold text-rose-800 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search by title, county, or ward..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-xs focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedStatus(f.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                selectedStatus === f.id
                  ? "bg-emerald-800 text-white shadow-xs font-semibold"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Grid */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white/50 p-12 text-center">
          <CheckSquare className="h-10 w-10 text-stone-300" />
          <h3 className="mt-3 text-base font-semibold text-stone-900">No tasks found</h3>
          <p className="mt-1 text-xs text-stone-500 max-w-sm">
            {selectedStatus !== "all"
              ? `There are no tasks with status "${selectedStatus}".`
              : "You haven't created any campaign tasks yet. Launch your first task to engage local youth."}
          </p>
          <Link
            href="/mhesh/dashboard/tasks/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create First Task</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              role="aspirant"
              href={`/mhesh/dashboard/tasks/${task.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
