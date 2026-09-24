import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";

// Keep the desktop correction beside the question; give it the viewport on mobile.
export default function ResponsiveFeedback({ children, labels, lang, nestedModalOpen = false, Icon, tone}) {
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 860px)").matches);
  const [open, setOpen] = useState(true);
  const dialogRef = useRef(null);
  const reopenRef = useRef(null);
  const close = () => setOpen(false);
  const dialogLabel = lang === "en" ? "Answer and explanation" : "Réponse et explication";
  const reopenLabel = lang === "en" ? "Show correction" : "Revoir la correction";

  useEffect(() => {
    const media = window.matchMedia("(max-width: 860px)");
    const update = () => {
      setMobile(media.matches);
      setOpen(true);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!mobile || !open) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      const target = reopenRef.current ?? previousFocus;
      if (target?.isConnected && !target.disabled) target.focus({ preventScroll: true });
    };
  }, [mobile, open]);

  useEffect(() => {
    if (!mobile || !open || nestedModalOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key !== "Tab") return;
      const focusable = [...dialogRef.current.querySelectorAll(
        "button:not(:disabled), a[href], input:not(:disabled), [tabindex='0']"
      )].filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) {
        event.preventDefault();
        dialogRef.current.focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobile, open, nestedModalOpen]);

  if (!mobile) return children;

  return (
    <>
      <button ref={reopenRef} type="button" className="exercise-feedback-reopen" onClick={() => setOpen(true)}>
        {reopenLabel}
      </button>
      {open && createPortal(
        <div className="exercise-feedback-overlay" onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}>
          <section
            ref={dialogRef}
            className="exercise-feedback-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={dialogLabel}
            tabIndex={-1}
          >
            <header className="exercise-feedback-dialog-header">
              {Icon && (
                <span className={`exercise-feedback-mobile-icon exercise-feedback-mobile-icon-${tone}`}>
                  <Icon aria-hidden="true" />
                </span>
              )}
            </header>
            {children}
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
