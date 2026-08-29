/**
 * components/Bookmarks/index.js
 * Terminal-style bookmark manager. Right-rail list of compact rows.
 */

import { useState } from "react";
import useSWR from "swr";
import { Plus, ExternalLink, Pencil, Trash2, X, Check, Globe } from "lucide-react";
import clsx from "clsx";

const CATEGORIES = ["all", "charting", "news", "broker", "data", "education", "tools", "general"];

function FaviconImg({ url, size = 12 }) {
  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=32`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      onError={(e) => { e.currentTarget.style.display = "none"; }}
      className="shrink-0 grayscale opacity-70"
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
    <form onSubmit={handleSubmit} className="p-3 space-y-2 border-b border-white/10 bg-white/[0.02]">
      <input
        className="w-full bg-black border border-white/10 px-2 py-1.5 text-[11px] font-mono text-white placeholder-slate-600 focus:border-[#009E60] focus:outline-none"
        placeholder="Title"
        value={form.title}
        onChange={set("title")}
        required
      />
      <input
        className="w-full bg-black border border-white/10 px-2 py-1.5 text-[11px] font-mono text-white placeholder-slate-600 focus:border-[#009E60] focus:outline-none"
        placeholder="https://..."
        value={form.url}
        onChange={set("url")}
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          className="w-full bg-black border border-white/10 px-2 py-1.5 text-[11px] font-mono text-white placeholder-slate-600 focus:border-[#009E60] focus:outline-none"
          placeholder="Description"
          value={form.description}
          onChange={set("description")}
        />
        <select
          className="w-full bg-black border border-white/10 px-2 py-1.5 text-[11px] font-mono text-white focus:border-[#009E60] focus:outline-none"
          value={form.category}
          onChange={set("category")}
        >
          {CATEGORIES.filter((c) => c !== "all").map((c) => (
            <option key={c} value={c} className="bg-black">{c}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-1.5">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 font-mono text-[10px] uppercase tracking-widest text-[#009E60] border border-[#009E60]/40 bg-[#009E60]/10 hover:bg-[#009E60]/20 px-2 py-1.5 flex items-center justify-center gap-1.5 transition-colors"
        >
          <Check size={10} /> {loading ? "Saving" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 font-mono text-[10px] uppercase tracking-widest text-slate-400 border border-white/10 hover:text-white hover:border-white/20 px-2 py-1.5 flex items-center justify-center gap-1.5 transition-colors"
        >
          <X size={10} /> Cancel
        </button>
      </div>
    </form>
  );
}

function BookmarkRow({ bookmark, onDelete, onEdit, editing, setEditing, saving }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (editing) {
    return (
      <BookmarkForm
        initial={bookmark}
        onSubmit={async (data) => {
          await onEdit(bookmark._id, data);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
        loading={saving}
      />
    );
  }

  return (
    <div className="group flex items-center gap-2 px-4 py-2 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <FaviconImg url={bookmark.url} size={12} />
      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 font-mono text-[11px] text-white hover:text-[#009E60] transition-colors truncate flex items-center gap-1.5"
      >
        {bookmark.title}
        <ExternalLink size={9} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </a>
      <span className="font-mono text-[8px] uppercase tracking-widest text-slate-500 px-1 border border-white/10 shrink-0">
        {bookmark.category.slice(0, 4)}
      </span>

      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-1 text-slate-500 hover:text-[#009E60] transition-colors"
          title="Edit"
        >
          <Pencil size={10} />
        </button>
        {confirmDelete ? (
          <>
            <button
              onClick={() => onDelete(bookmark._id)}
              className="p-1 text-red-400 hover:text-red-300 transition-colors"
              title="Confirm"
            >
              <Check size={10} />
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="p-1 text-slate-500 hover:text-white transition-colors"
            >
              <X size={10} />
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function Bookmarks() {
  const [showForm,     setShowForm]     = useState(false);
  const [adding,       setAdding]       = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [editingId,    setEditingId]    = useState(null);
  const [saving,       setSaving]       = useState(false);

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

  const handleEdit = async (id, formData) => {
    setSaving(true);
    await fetch(`/api/bookmarks/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(formData),
    });
    await mutate();
    setSaving(false);
  };

  return (
    <div>
      {/* ── Status bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/[0.01]">
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-slate-500">
          <span>{bookmarks.length} items</span>
          {activeFilter !== "all" && (
            <>
              <span className="text-slate-700">·</span>
              <span className="text-[#009E60]">{activeFilter}</span>
            </>
          )}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="font-mono text-[9px] uppercase tracking-widest text-[#009E60] hover:text-white border border-[#009E60]/40 hover:border-white/20 px-2 py-1 flex items-center gap-1 transition-colors"
        >
          {showForm ? <X size={9} /> : <Plus size={9} />}
          {showForm ? "Cancel" : "Add"}
        </button>
      </div>

      {/* ── Add form ────────────────────────────────────────────── */}
      {showForm && (
        <BookmarkForm
          onSubmit={handleAdd}
          onCancel={() => setShowForm(false)}
          loading={adding}
        />
      )}

      {/* ── Filter pills ────────────────────────────────────────── */}
      {bookmarks.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-white/5 bg-black">
          {existingCats.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={clsx(
                "font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border transition-colors",
                activeFilter === cat
                  ? "border-[#009E60] text-[#009E60] bg-[#009E60]/10"
                  : "border-white/10 text-slate-500 hover:text-white hover:border-white/20"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── List ────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <Globe size={20} className="mx-auto text-slate-700 mb-2" />
          <p className="font-mono text-[10px] text-slate-600 uppercase tracking-widest">
            {bookmarks.length === 0 ? "No bookmarks yet" : "Empty category"}
          </p>
        </div>
      ) : (
        filtered.map((bm) => (
          <BookmarkRow
            key={bm._id}
            bookmark={bm}
            onDelete={handleDelete}
            onEdit={handleEdit}
            editing={editingId === bm._id}
            setEditing={(v) => setEditingId(v ? bm._id : null)}
            saving={saving}
          />
        ))
      )}
    </div>
  );
}
