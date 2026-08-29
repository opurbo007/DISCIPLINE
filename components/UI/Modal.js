/**
 * components/UI/Modal.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable modal dialog with backdrop, escape-to-close, and focus trap basics.
 */

import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, subtitle, children, maxWidth = "max-w-md" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-up"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} glass-card-arc p-6 space-y-4 max-h-[90vh] overflow-y-auto`}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-3">
            <div>
              {title && (
                <h3 className="font-display text-xl tracking-wider text-white">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs font-mono text-slate-500 mt-1">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-white/5 transition-colors shrink-0"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
