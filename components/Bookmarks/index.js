/**
 * components/Bookmarks/index.js
 * CRUD bookmark manager. Header is rendered by parent; this shows status row + form + list.
 */

import { useState } from "react";
import useSWR from "swr";
import {
  Bookmark, Plus, ExternalLink, Pencil, Trash2,
  X, Check, Globe, Filter,
} from "lucide-react";
import clsx from "clsx";

const CATEGORIES = ["all", "charting", "news", "broker", "data", "education", "tools", "general"];

const CATEGORY_COLOR = {
  charting:  "text-[#009E60] bg-[rgba(0,158,96,0.1)] border-[rgba(0,158,96,0.2)]",
  news:      "text-amber-400 bg-amber-400/10 border-amber-400/20",
  broker:    "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  data:      "text-purple-400 bg-purple-400/10 border-purple-400/20",
  education: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  tools:     "text-orange-400 bg-orange-400/10 border-orange-400/20",
  general:   "text-slate-400 bg-white/5 border-white/10",
};

function getCategoryStyle(cat) {
  return CATEGORY_COLOR[cat] || CATEGORY_COLOR.general;
}

function FaviconImg({ url, size = 16 }) {
  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=32`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      onError={(e) => { e.currentTarget.style.display = "none"; }}
      className="rounded shrink-0"
    />
  );
}

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
    const url = /^https?:\/\//i.test(form.url) ? form.url : `https://${form.url}`;
    onSubmit({ ...form, url });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="text-[10px] text-slate-500 mb-1 block font-mono uppercase tracking-wider">Title *</label>
          <input className="glass-input" placeholder="TradingView" value={form.title} onChange={set("title")} required />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 mb-1 block font-mono uppercase tracking-wider">URL *</label>
          <input className="glass-input" placeholder="https://tradingview.com" value={form.url} onChange={set("url")} required />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="text-[10px] text-slate-500 mb-1 block font-mono uppercase tracking-wider">Description</label>
          <input className="glass-input" placeholder="Advanced charting platform" value={form.description} onChange={set("description")} />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 mb-1 block font-mono uppercase tracking-wider">Category</label>
          <select className="glass-input" value={form.category} onChange={set("category")}>
            {CATEGORIES.filter((c) => c !== "all").map((c) => (
              <option key={c} value={c} className="bg-[#0d1117]">{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-arc" disabled={loading}>
          <Check size={12} />
          {loading ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          <X size={12} /> Cancel
        </button>
      </div>
    </form>
  );
}

function BookmarkCard({ bookmark, onDelete, onEdit, compact }) {
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
      <div className="glass-card p-3 col-span-full">
        <p className="text-[10px] text-slate-500 mb-2 font-mono">
          Editing: <span className="text-white">{bookmark.title}</span>
        </p>
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
    <div className={clsx(
      "glass-card group flex items-center gap-2.5 hover:-translate-y-0.5 transition-all duration-200",
      compact ? "p-2.5" : "p-3.5 flex-col items-stretch gap-2",
    )}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <FaviconImg url={bookmark.url} size={compact ? 14 : 18} />
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white font-semibold text-xs hover:text-[#009E60] transition-colors truncate flex-1"
        >
          {bookmark.title}
        </a>
        <ExternalLink size={10} className="text-slate-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Right side: category + actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={clsx(
          "font-mono uppercase tracking-wider rounded border",
          compact ? "text-[8px] px-1 py-0.5" : "text-[9px] px-1.5 py-0.5",
          getCategoryStyle(bookmark.category)
        )}>
          {bookmark.category}
        </span>

        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(true)}
            className="p-1 rounded text-slate-500 hover:text-[#009E60] hover:bg-white/5 transition-colors"
            title="Edit"
          >
            <Pencil size={10} />
          </button>

          {confirmDelete ? (
            <>
              <button
                onClick={() => onDelete(bookmark._id)}
                className="p-1 rounded text-red-400 hover:bg-red-400/10 transition-colors"
                title="Confirm delete"
              >
                <Check size={10} />
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="p-1 rounded text-slate-500 hover:bg-white/5 transition-colors"
              >
                <X size={10} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Delete"
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Bookmarks({ compact = false }) {
  const [showForm,      setShowForm]      = useState(false);
  const [adding,        setAdding]        = useState(false);
  const [activeFilter,  setActiveFilter]  = useState("all");

  const { data, mutate } = useSWR("/api/bookmarks");
  const bookmarks = data?.data || [];

  const existingCats = ["all", ...new Set(bookmarks.map((b) => b.category))];

  const filtered = activeFilter === "all"
    ? bookmarks
    : bookmarks.filter((b) => b.category === activeFilter);

  const handleAdd = async (formData) => {
    setAdding(true);
    try {
      await fetch("/api/bookmarks", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(formData),
      });
      await mutate();
      setShowForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    mutate(
      { data: bookmarks.filter((b) => b._id !== id) },
      { revalidate: false }
    );
    await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
    mutate();
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
    <div>
      {/* ── Status + actions row (header is in parent page) ────── */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600">
          <span className="uppercase tracking-wider">{bookmarks.length} saved</span>
          {activeFilter !== "all" && (
            <>
              <span className="text-slate-700">·</span>
              <span className="text-[#009E60] uppercase tracking-wider">{activeFilter}</span>
            </>
          )}
        </div>
        <button
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-mono text-[#009E60] border border-[rgba(0,158,96,0.25)] bg-[rgba(0,158,96,0.08)] hover:bg-[rgba(0,158,96,0.15)] transition-colors"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? <X size={10} /> : <Plus size={10} />}
          {showForm ? "Cancel" : "Add"}
        </button>
      </div>

      {showForm && (
        <div className="glass-card-arc p-3 mb-3 animate-fade-up">
          <BookmarkForm
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
            loading={adding}
          />
        </div>
      )}

      {/* Category filter pills */}
      {bookmarks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Filter size={10} className="text-slate-600 self-center" />
          {existingCats.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={clsx(
                "text-[10px] font-mono px-2 py-0.5 rounded-full border transition-all",
                activeFilter === cat
                  ? "border-[#009E60]/50 text-[#009E60] bg-[rgba(0,158,96,0.12)]"
                  : "border-white/8 text-slate-500 hover:text-slate-300 hover:border-white/15"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Bookmarks list */}
      {filtered.length === 0 ? (
        <div className="glass-card py-8 text-center">
          <Globe size={24} className="mx-auto text-slate-700 mb-2" />
          <p className="text-slate-500 text-xs">
            {bookmarks.length === 0
              ? "No bookmarks yet. Add your first trading resource."
              : "No bookmarks in this category."}
          </p>
        </div>
      ) : (
        <div
          className={clsx(
            "grid gap-2",
            compact
              ? "grid-cols-1"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {filtered.map((bm, i) => (
            <div
              key={bm._id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 25}ms` }}
            >
              <BookmarkCard
                bookmark={bm}
                onDelete={handleDelete}
                onEdit={handleEdit}
                compact={compact}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
