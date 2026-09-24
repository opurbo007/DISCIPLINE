/**
 * components/Bookmarks/index.js
 * Modern bookmark list.
 */

import { useState } from "react";
import useSWR from "swr";
import { Plus, ExternalLink, Pencil, Trash2, X, Check, Compass } from "lucide-react";
import clsx from "clsx";

const CATEGORIES = ["all", "charting", "news", "broker", "data", "education", "tools", "general"];

function FaviconImg({ url, size = 16 }) {
  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=64`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      onError={(e) => { e.currentTarget.style.display = "none"; }}
      className="shrink-0 rounded-md"
    />
  );
}

function BookmarkForm({ initial = {}, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    title: initial.title || "",
    url: initial.url || "",
    description: initial.description || "",
    category: initial.category || "general",
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) return;
    const url = /^https?:\/\//i.test(form.url) ? form.url : `https://${form.url}`;
    onSubmit({ ...form, url });
  };
  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-2.5 border-b border-white/[0.06] bg-white/[0.02]">
      <input className="glass-input !py-2 !text-[13px]" placeholder="Title — e.g. TradingView" value={form.title} onChange={set("title")} required />
      <input className="glass-input !py-2 !text-[13px]" placeholder="https://…" value={form.url} onChange={set("url")} required />
      <div className="grid grid-cols-2 gap-2">
        <input className="glass-input !py-2 !text-[13px]" placeholder="Note (optional)" value={form.description} onChange={set("description")} />
        <select className="glass-input !py-2 !text-[13px]" value={form.category} onChange={set("category")}>
          {CATEGORIES.filter((c) => c !== "all").map((c) => (
            <option key={c} value={c} className="bg-[#10141d] capitalize">{c}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="btn-primary flex-1 !py-2 !text-[12.5px]">
          <Check size={13} /> {loading ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 !py-2 !text-[12.5px]">
          <X size={13} /> Cancel
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
        onSubmit={async (data) => { await onEdit(bookmark._id, data); setEditing(false); }}
        onCancel={() => setEditing(false)}
        loading={saving}
      />
    );
  }
  return (
    <div className="group flex items-center gap-2.5 px-4 py-2.5 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03] transition-colors">
      <span className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.07] flex items-center justify-center shrink-0 overflow-hidden">
        <FaviconImg url={bookmark.url} size={14} />
      </span>
      <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
        <span className="block text-[13px] font-medium text-zinc-100 group-hover:text-emerald-300 transition-colors truncate">
          {bookmark.title}
        </span>
        <span className="block text-[11px] text-zinc-600 truncate">{bookmark.url.replace(/^https?:\/\//, "")}</span>
      </a>
      <ExternalLink size={12} className="text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-300 hover:bg-white/[0.06] transition-colors" title="Edit">
          <Pencil size={12} />
        </button>
        {confirmDelete ? (
          <>
            <button onClick={() => onDelete(bookmark._id)} className="p-1.5 rounded-lg text-red-300 hover:bg-red-400/10" title="Confirm"><Check size={12} /></button>
            <button onClick={() => setConfirmDelete(false)} className="p-1.5 rounded-lg text-zinc-500 hover:bg-white/[0.06]"><X size={12} /></button>
          </>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-300 hover:bg-red-400/10 transition-colors" title="Delete">
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function Bookmarks() {
  const [showForm, setShowForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data, mutate } = useSWR("/api/bookmarks");
  const bookmarks = data?.data || [];
  const existingCats = ["all", ...new Set(bookmarks.map((b) => b.category))];
  const filtered = activeFilter === "all" ? bookmarks : bookmarks.filter((b) => b.category === activeFilter);

  const handleAdd = async (formData) => {
    setAdding(true);
    try {
      await fetch("/api/bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      await mutate();
      setShowForm(false);
    } finally { setAdding(false); }
  };
  const handleDelete = async (id) => {
    mutate({ data: bookmarks.filter((b) => b._id !== id) }, { revalidate: false });
    await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
    mutate();
  };
  const handleEdit = async (id, formData) => {
    setSaving(true);
    await fetch(`/api/bookmarks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
    await mutate();
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[12px] text-zinc-500 font-medium num">{bookmarks.length} saved</span>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={clsx("inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all", showForm ? "bg-white/[0.07] text-white" : "bg-emerald-400 text-[#04120c] hover:bg-emerald-300")}
        >
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? "Close" : "Add link"}
        </button>
      </div>

      {showForm && <BookmarkForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} loading={adding} />}

      {bookmarks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {existingCats.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={clsx(
                "text-[11.5px] font-medium px-2.5 py-1 rounded-full border transition-all capitalize",
                activeFilter === cat
                  ? "bg-white text-zinc-950 border-white"
                  : "bg-white/[0.04] text-zinc-500 border-white/[0.07] hover:text-white hover:border-white/15"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <span className="mx-auto w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-3">
            <Compass size={17} className="text-zinc-600" />
          </span>
          <p className="text-[13px] text-zinc-500">{bookmarks.length === 0 ? "No links yet — save your favorite tools." : "Nothing in this category."}</p>
        </div>
      ) : (
        <div className="pb-1">{filtered.map((bm) => (
          <BookmarkRow key={bm._id} bookmark={bm} onDelete={handleDelete} onEdit={handleEdit} editing={editingId === bm._id} setEditing={(v) => setEditingId(v ? bm._id : null)} saving={saving} />
        ))}</div>
      )}
    </div>
  );
}
