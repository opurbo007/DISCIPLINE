/**
 * components/Notes/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Trading journal / strategy notes with full CRUD.
 *
 * Features:
 *  – Rich textarea with live character count
 *  – Color-coded cards (arc/ember/bull/bear/default)
 *  – Tag support for quick categorization
 *  – Pin notes to keep them at the top
 *  – Inline editing without modal
 *  – Optimistic deletes via SWR
 */

import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import {
  StickyNote, Plus, Pin, PinOff, Pencil, Trash2,
  X, Check, Tag, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import clsx from "clsx";

// ── Color palette options ─────────────────────────────────────────────────────
const COLOR_OPTIONS = [
  { key: "default", label: "Default", cardClass: "glass-card",       dotClass: "bg-white/20" },
  { key: "arc",     label: "Cyan",    cardClass: "glass-card-arc",   dotClass: "bg-[#00d4ff]" },
  { key: "ember",   label: "Gold",    cardClass: "glass-card-ember", dotClass: "bg-[#f59e0b]" },
  { key: "bull",    label: "Green",   cardClass: "glass-card-bull",  dotClass: "bg-emerald-400" },
  { key: "bear",    label: "Red",     cardClass: "glass-card-bear",  dotClass: "bg-red-400" },
];

function getCardClass(color) {
  return COLOR_OPTIONS.find((c) => c.key === color)?.cardClass || "glass-card";
}

// ── Tag input component ───────────────────────────────────────────────────────
function TagInput({ tags, onChange }) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const clean = input.trim().toLowerCase().replace(/\s+/g, "-");
    if (clean && !tags.includes(clean)) {
      onChange([...tags, clean]);
    }
    setInput("");
  };

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag));

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400"
        >
          #{tag}
          <button onClick={() => removeTag(tag)} className="text-slate-600 hover:text-red-400 transition-colors">
            <X size={9} />
          </button>
        </span>
      ))}
      <input
        className="bg-transparent text-xs text-slate-400 placeholder-slate-600 outline-none w-28"
        placeholder="+ add tag"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
          if (e.key === "Backspace" && !input && tags.length) removeTag(tags[tags.length - 1]);
        }}
      />
    </div>
  );
}

// ── Color picker ──────────────────────────────────────────────────────────────
function ColorPicker({ value, onChange }) {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-[11px] text-slate-600 font-mono">Color</span>
      {COLOR_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          title={opt.label}
          onClick={() => onChange(opt.key)}
          className={clsx(
            "w-4 h-4 rounded-full transition-all duration-150",
            opt.dotClass,
            value === opt.key ? "ring-2 ring-white/40 ring-offset-1 ring-offset-transparent scale-125" : "opacity-50 hover:opacity-80"
          )}
        />
      ))}
    </div>
  );
}

// ── Note editor form ──────────────────────────────────────────────────────────
function NoteForm({ initial = {}, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    title:   initial.title   || "",
    content: initial.content || "",
    tags:    initial.tags    || [],
    pinned:  initial.pinned  || false,
    color:   initial.color   || "default",
  });

  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [form.content]);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Title */}
      <input
        className="glass-input text-base font-semibold"
        placeholder="Note title (e.g. Pre-market checklist)"
        value={form.title}
        onChange={set("title")}
        required
      />

      {/* Content */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          className="glass-input resize-none min-h-[100px] leading-relaxed font-mono text-xs"
          placeholder={"Write your trading rules, strategy, or journal entry here…\n\nUse this space to reinforce discipline and track your edge."}
          value={form.content}
          onChange={set("content")}
          required
        />
        <span className="absolute bottom-2 right-2 text-[10px] text-slate-700 font-mono">
          {form.content.length}
        </span>
      </div>

      {/* Tags + Color + Pin */}
      <div className="flex flex-wrap gap-3 items-center justify-between pt-1">
        <div className="flex items-center gap-2 min-w-0">
          <Tag size={11} className="text-slate-600 shrink-0" />
          <TagInput tags={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
        </div>

        <div className="flex gap-3 items-center">
          <ColorPicker value={form.color} onChange={(color) => setForm((f) => ({ ...f, color }))} />
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, pinned: !f.pinned }))}
            className={clsx("transition-colors", form.pinned ? "text-[#f59e0b]" : "text-slate-600 hover:text-slate-400")}
            title={form.pinned ? "Unpin" : "Pin to top"}
          >
            {form.pinned ? <Pin size={13} /> : <PinOff size={13} />}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button type="submit" className="btn-arc" disabled={loading}>
          <Check size={13} />
          {loading ? "Saving…" : "Save Note"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          <X size={13} /> Cancel
        </button>
      </div>
    </form>
  );
}

// ── Single note card ──────────────────────────────────────────────────────────
function NoteCard({ note, onDelete, onUpdate }) {
  const [editing,       setEditing]       = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded,      setExpanded]      = useState(false);

  const isLong = note.content.length > 280;

  const handleUpdate = async (data) => {
    setSaving(true);
    await onUpdate(note._id, data);
    setSaving(false);
    setEditing(false);
  };

  const togglePin = () => onUpdate(note._id, { pinned: !note.pinned });

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr);
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(mins  / 60);
    const days  = Math.floor(hours / 24);
    if (days  > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins  > 0) return `${mins}m ago`;
    return "just now";
  };

  if (editing) {
    return (
      <div className={clsx("p-4", getCardClass(note.color))}>
        <NoteForm
          initial={note}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          loading={saving}
        />
      </div>
    );
  }

  return (
    <div className={clsx("p-4 group flex flex-col gap-2.5 transition-all duration-200 hover:-translate-y-0.5", getCardClass(note.color))}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {note.pinned && <Pin size={11} className="text-[#f59e0b] shrink-0" />}
          <h3 className="text-white font-semibold text-sm leading-tight truncate">{note.title}</h3>
        </div>

        {/* Actions (visible on hover) */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={togglePin}
            className={clsx("p-1.5 rounded-md transition-colors",
              note.pinned ? "text-[#f59e0b] hover:bg-amber-400/10" : "text-slate-600 hover:text-slate-300 hover:bg-white/5"
            )}
            title={note.pinned ? "Unpin" : "Pin"}
          >
            {note.pinned ? <PinOff size={11} /> : <Pin size={11} />}
          </button>
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-md text-slate-600 hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.05)] transition-colors"
          >
            <Pencil size={11} />
          </button>
          {confirmDelete ? (
            <>
              <button onClick={() => onDelete(note._id)} className="p-1.5 rounded-md text-red-400 hover:bg-red-400/10 transition-colors">
                <Check size={11} />
              </button>
              <button onClick={() => setConfirmDelete(false)} className="p-1.5 rounded-md text-slate-500 hover:bg-white/5 transition-colors">
                <X size={11} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="relative">
        <p className={clsx(
          "text-slate-400 text-xs leading-relaxed font-mono whitespace-pre-wrap break-words",
          !expanded && isLong && "line-clamp-5"
        )}>
          {note.content}
        </p>

        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-400 transition-colors"
          >
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {/* ── Tags ───────────────────────────────────────────────────── */}
      {note.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/5 border border-white/8 text-slate-500"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* ── Footer: timestamp ────────────────────────────────────────── */}
      <div className="flex items-center gap-1 text-[10px] text-slate-700 font-mono pt-0.5 border-t border-white/5">
        <Clock size={9} />
        <span>{timeAgo(note.updatedAt)}</span>
        {note.createdAt !== note.updatedAt && <span className="text-slate-800">· edited</span>}
      </div>
    </div>
  );
}

// ── Main Notes component ──────────────────────────────────────────────────────
export default function Notes() {
  const [showForm, setShowForm] = useState(false);
  const [adding,   setAdding]   = useState(false);
  const [search,   setSearch]   = useState("");

  const { data, mutate } = useSWR("/api/notes");
  const notes = data?.data || [];

  // Filter by search query (title or content or tags)
  const filtered = search.trim()
    ? notes.filter((n) => {
        const q = search.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags?.some((t) => t.includes(q))
        );
      })
    : notes;

  // Pinned first
  const sorted = [...filtered].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const handleAdd = async (formData) => {
    setAdding(true);
    try {
      await fetch("/api/notes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(formData),
      });
      await mutate();
      setShowForm(false);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    mutate({ data: notes.filter((n) => n._id !== id) }, { revalidate: false });
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    mutate();
  };

  const handleUpdate = async (id, data) => {
    await fetch(`/api/notes/${id}`, {
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
          <StickyNote size={16} className="text-emerald-400" />
          <h2 className="font-display text-2xl tracking-wider text-white">TRADING NOTES</h2>
          <span className="text-xs font-mono text-slate-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/8">
            {notes.length}
          </span>
        </div>

        <div className="flex gap-2">
          {/* Search */}
          <input
            className="glass-input w-44 text-xs"
            placeholder="Search notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-arc shrink-0" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? "Cancel" : "New Note"}
          </button>
        </div>
      </div>

      {/* ── New note form ────────────────────────────────────────────── */}
      {showForm && (
        <div className="glass-card-arc p-4 mb-4 animate-fade-up">
          <NoteForm
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
            loading={adding}
          />
        </div>
      )}

      {/* ── Notes masonry grid ───────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <div className="glass-card py-14 text-center">
          <StickyNote size={36} className="mx-auto text-slate-800 mb-3" />
          <p className="text-slate-500 text-sm">
            {notes.length === 0
              ? "No notes yet. Start building your trading playbook."
              : "No notes match your search."}
          </p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
          {sorted.map((note, i) => (
            <div
              key={note._id}
              className="break-inside-avoid animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <NoteCard
                note={note}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
