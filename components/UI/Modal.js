/**
 * components/UI/Modal.js
 * Modern modal.
 */

import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, subtitle, children, maxWidth = "max-w-md" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-up" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} rounded-2xl bg-[#10141d] border border-white/10 shadow-pop p-6 space-y-4 max-h-[90vh] overflow-y-auto`}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-3">
            <div>
              {title && <h3 className="text-[16px] font-bold tracking-tight text-white">{title}</h3>}
              {subtitle && <p className="text-[13px] text-zinc-500 mt-1 leading-relaxed">{subtitle}</p>}
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/[0.07] transition-colors shrink-0" aria-label="Close">
              <X size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
