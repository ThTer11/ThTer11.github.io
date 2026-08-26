import { useEffect, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import MathRenderer from "./MathRenderer";
import { localize } from "../../exercises/core/localize";

export default function CourseHintModal({ hint, hints, lang, labels, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const overviewMode = Array.isArray(hints);
  const reminders = overviewMode ? hints.filter(Boolean) : [hint].filter(Boolean);
  const dialogTitle = overviewMode
    ? labels.allCourseReminders
    : localize(reminders[0]?.title, lang);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = [...dialogRef.current.querySelectorAll("button, a, input, [tabindex]:not([tabindex='-1'])")]
        .filter((element) => !element.disabled);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="showcase-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className="showcase-modal exercise-course-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-course-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="showcase-modal-header">
          <div>
            <p className="showcase-modal-kicker">{labels.courseReminder}</p>
            <h2 id="exercise-course-title">
              <MathRenderer as="span" content={dialogTitle} />
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="showcase-icon-button"
            onClick={onClose}
            aria-label={labels.close}
          >
            <XMarkIcon className="exercise-small-icon" />
            <span>{labels.close}</span>
          </button>
        </header>

        <div className="exercise-course-content">
          {overviewMode && <p className="exercise-course-overview-lead">{labels.courseOverviewLead}</p>}
          {reminders.map((reminder) => (
            <article key={reminder.id} className={overviewMode ? "exercise-course-overview-item" : undefined}>
              {overviewMode && (
                <MathRenderer as="h3" className="exercise-course-overview-title" content={localize(reminder.title, lang)} />
              )}
              <div className="exercise-course-overview-blocks">
                {(reminder.blocks ?? [{ content: reminder.content }]).map((block, index) => (
                  <section key={`${reminder.id}-block-${index}`} className={`exercise-course-block exercise-course-block-${block.type ?? "note"}`}>
                    {block.title && <MathRenderer as="h4" content={localize(block.title, lang)} />}
                    <MathRenderer content={localize(block.content, lang)} trustedHtml={Boolean(block.trustedHtml)} />
                  </section>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
