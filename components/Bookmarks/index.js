/**
 * components/Bookmarks/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Full CRUD bookmark manager. Persists data to MongoDB via API routes.
 *
 * Features:
 *  – Add bookmarks with title, URL, description, and category
 *  – Google Favicon auto-fetch
 *  – Filter by category
 *  – Edit / delete in-place
 *  – Optimistic UI updates via SWR mutate
 */

import { useState } from "react";
import useSWR from "swr";
import {
  Bookmark, Plus, ExternalLink, Pencil, Trash2,
  X, Check, Globe, Tag, Filter,
} from "lucide-react";
import clsx from "clsx";

// ── Suggested categories ──────────────────────────────────────────────────────
const CATEGORIES = ["all", "charting", "news", "broker", "data", "education", "tools", "general"];

const CATEGORY_COLOR = {
  charting:  "text-[#00d4ff]  bg-[rgba(0,212,255,0.08)]  border-[rgba(0,212,255,0.15)]",
  news:      "text-amber-400  bg-amber-400/10             border-amber-400/20",
  broker:    "text-emerald-400 bg-emerald-400/10          border-emerald-400/20",
  data:      "text-purple-400 bg-purple-400/10            border-purple-400/20",
  education: "text-sky-400    bg-sky-400/10               border-sky-400/20",
  tools:     "text-orange-400 bg-orange-400/10            border-orange-400/20",
  general:   "text-slate-400  bg-white/5                  border-white/10",
};

function getCategoryStyle(cat) {
  return CATEGORY_COLOR[cat] || CATEGORY_COLOR.general;
}

// ── Favicon image with fallback ───────────────────────────────────────────────
function FaviconImg({ url, size = 20 }) {
  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=32`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      onError={(e) => { e.currentTarget.style.display = "none"; }}
      className="rounded"
    />
  );
}

// ── Add / Edit form ───────────────────────────────────────────────────────────
function BookmarkForm({ initial = {}, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    title:       initial.title       || "",
    url:         initial.url         || "",
    description: initial.description || "",
    category:    initial.category    || "general",
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) return;
    // Auto-prefix https:// if missing
    const url = /^https?:\/\//i.test(form.url) ? form.url : `https://${form.url}`;
    onSubmit({ ...form, url });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-slate-500 mb-1 block font-mono uppercase tracking-wider">Title *</label>
          <input
            className="glass-input"
            placeholder="TradingView"
            value={form.title}
            onChange={set("title")}
            required
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-500 mb-1 block font-mono uppercase tracking-wider">URL *</label>
          <input
            className="glass-input"
            placeholder="https://tradingview.com"
            value={form.url}
            onChange={set("url")}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-slate-500 mb-1 block font-mono uppercase tracking-wider">Description</label>
          <input
            className="glass-input"
            placeholder="Advanced charting platform"
            value={form.description}
            onChange={set("description")}
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-500 mb-1 block font-mono uppercase tracking-wider">Category</label>
          <select
            className="glass-input"
            value={form.category}
            onChange={set("category")}
          >
            {CATEGORIES.filter((c) => c !== "all").map((c) => (
              <option key={c} value={c} className="bg-[#0d1117]">{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-arc" disabled={loading}>
          <Check size={13} />
          {loading ? "Saving…" : "Save Bookmark"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          <X size={13} /> Cancel
        </button>
      </div>
    </form>
  );
}

// ── Single bookmark card ──────────────────────────────────────────────────────
function BookmarkCard({ bookmark, onDelete, onEdit }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [saving,  setSaving]    = useState(false);

  const handleEdit = async (data) => {
    setSaving(true);
    await onEdit(bookmark._id, data);
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="glass-card p-4 col-span-full">
        <p className="text-xs text-slate-500 mb-3 font-mono">Editing: <span className="text-white">{bookmark.title}</span></p>
        <BookmarkForm
          initial={bookmark}
          onSubmit={handleEdit}
          onCancel={() => setEditing(false)}
          loading={saving}
        />
      </div>
    );
  }

  return (
    <div className="glass-card p-3.5 group flex flex-col gap-2.5 hover:-translate-y-0.5 transition-all duration-200">
      {/* ── Top row ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FaviconImg url={bookmark.url} />
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white font-semibold text-sm hover:text-[#00d4ff] transition-colors truncate"
          >
            {bookmark.title}
          </a>
          <ExternalLink size={10} className="text-slate-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Action buttons (visible on hover) */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-md text-slate-500 hover:text-[#00d4ff] hover:bg-white/5 transition-colors"
            title="Edit"
          >
            <Pencil size={11} />
          </button>

          {confirmDelete ? (
            <div className="flex gap-1 items-center">
              <button
                onClick={() => onDelete(bookmark._id)}
                className="p-1.5 rounded-md text-red-400 hover:bg-red-400/10 transition-colors text-xs"
                title="Confirm delete"
              >
                <Check size={11} />
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="p-1.5 rounded-md text-slate-500 hover:bg-white/5 transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Delete"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── Description ─────────────────────────────────────────────── */}
      {bookmark.description && (
        <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{bookmark.description}</p>
      )}

      {/* ── Category badge ───────────────────────────────────────────── */}
      <span className={clsx(
        "self-start text-[10px] font-mono px-1.5 py-0.5 rounded border",
        getCategoryStyle(bookmark.category)
      )}>
        {bookmark.category}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Bookmarks() {
  const [showForm,      setShowForm]      = useState(false);
  const [adding,        setAdding]        = useState(false);
  const [activeFilter,  setActiveFilter]  = useState("all");

  const { data, mutate } = useSWR("/api/bookmarks");
  const bookmarks = data?.data || [];

  // Derived: unique categories that actually exist in the data
  const existingCats = ["all", ...new Set(bookmarks.map((b) => b.category))];

  // Filtered list
  const filtered = activeFilter === "all"
    ? bookmarks
    : bookmarks.filter((b) => b.category === activeFilter);

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const handleAdd = async (formData) => {
    setAdding(true);
    try {
      await fetch("/api/bookmarks", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(formData),
      });
      await mutate(); // Revalidate SWR cache
      setShowForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    // Optimistic: remove from local state immediately
    mutate(
      { data: bookmarks.filter((b) => b._id !== id) },
      { revalidate: false }
    );
    await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
    mutate(); // Sync with server
  };

  const handleEdit = async (id, data) => {
    await fetch(`/api/bookmarks/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
    mutate();
  };

  return (
    <section>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Bookmark size={16} className="text-[#f59e0b]" />
          <h2 className="font-display text-2xl tracking-wider text-white">QUICK ACCESS</h2>
          <span className="text-xs font-mono text-slate-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/8">
            {bookmarks.length}
          </span>
        </div>

        <button className="btn-arc" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={13} /> : <Plus size={13} />}
          {showForm ? "Cancel" : "Add Bookmark"}
        </button>
      </div>

      {/* ── Add form ────────────────────────────────────────────────── */}
      {showForm && (
        <div className="glass-card-arc p-4 mb-4 animate-fade-up">
          <BookmarkForm
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
            loading={adding}
          />
        </div>
      )}

      {/* ── Category filter pills ────────────────────────────────────── */}
      {bookmarks.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Filter size={12} className="text-slate-600 self-center" />
          {existingCats.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={clsx(
                "text-[11px] font-mono px-2.5 py-1 rounded-full border transition-all",
                activeFilter === cat
                  ? "border-[#00d4ff]/40 text-[#00d4ff] bg-[rgba(0,212,255,0.1)]"
                  : "border-white/8 text-slate-500 hover:text-slate-300 hover:border-white/15"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Bookmarks grid ───────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="glass-card py-12 text-center">
          <Globe size={32} className="mx-auto text-slate-700 mb-3" />
          <p className="text-slate-500 text-sm">
            {bookmarks.length === 0
              ? "No bookmarks yet. Add your first trading resource."
              : "No bookmarks in this category."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((bm, i) => (
            <div
              key={bm._id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <BookmarkCard
                bookmark={bm}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
