import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import NavBar from "../components/NavBar";
import {
  ArrowTopRightOnSquareIcon,
  BookmarkIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { FaFilePdf } from "react-icons/fa";
import { useLang } from "../App";
import RichContent from "../components/RichContent";
import "../showcase.css";

function TeachingActionButton({ action, onClick }) {
  if (action.kind === "internal") {
    return (
      <Link to={action.to} className="showcase-action showcase-action-link">
        <ArrowTopRightOnSquareIcon className="w-5 h-5" />
        <span>{action.label}</span>
      </Link>
    );
  }

  const icon =
    action.kind === "pdf" ? (
      <FaFilePdf className="w-5 h-5" />
    ) : action.kind === "package" ? (
      <BookmarkIcon className="w-5 h-5" />
    ) : (
      <ArrowTopRightOnSquareIcon className="w-5 h-5" />
    );

  const className = `showcase-action showcase-action-${action.kind}`;

  if (action.kind === "package") {
    return (
      <button type="button" onClick={onClick} className={className}>
        {icon}
        <span>{action.label}</span>
      </button>
    );
  }

  return (
    <a
      href={action.href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {icon}
      <span>{action.label}</span>
    </a>
  );
}

export default function Enseignements() {
  const { t, lang } = useLang();
  const location = useLocation();
  const [texText, setTexText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [copyState, setCopyState] = useState(false);

  useEffect(() => {
    if (!showModal) {
      return undefined;
    }

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setShowModal(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showModal]);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const target = document.getElementById(location.hash.slice(1));
    if (target) {
      window.setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 20);
    }
  }, [location.hash]);

  const openTeX = async (texfile) => {
    try {
      const response = await fetch(`${process.env.PUBLIC_URL}/tex/${texfile}`);
      const text = await response.text();
      setTexText(text);
      setCopyState(false);
      setShowModal(true);
    } catch (error) {
      setTexText("Unable to load package.");
      setCopyState(false);
      setShowModal(true);
    }
  };

  const copyTexText = async () => {
    if (!texText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(texText);
      setCopyState(true);
      window.setTimeout(() => setCopyState(false), 1800);
    } catch (error) {
      setCopyState(false);
    }
  };

  const teachingYears = [
    {
      year: "2025-",
      accent: "gold",
      items: [
        {
          title: t.teaching.teach1.title4,
          descriptionHtml: t.teaching.teach1.desc4,
          actions: [],
        },
      ],
    },
    {
      year: "2025-2026",
      accent: "emerald",
      items: [
        {
          title: t.teaching.teach1.title,
          subtitle: t.teaching.teach1.desc1,
          descriptionHtml: t.teaching.teach1.desc11,
          actions: [],
        },
        {
          title: t.teaching.teach1.title2,
          subtitle: t.teaching.teach1.desc2,
          descriptionHtml: t.teaching.teach1.desc21,
          actions: [],
        },
        {
          title: t.teaching.teach1.title3,
          subtitle: t.teaching.teach1.desc3,
          actions: [],
        },
      ],
    },
    {
      year: "2024-2025",
      accent: "cobalt",
      items: [
        {
          title: t.teaching.teach2.title,
          subtitle: t.teaching.teach2.desc1,
          actions: [],
        },
        {
          title: t.teaching.teach2.title2,
          subtitle: t.teaching.teach2.desc2,
          actions: [],
        },
        {
          title: t.teaching.teach2.title3,
          actions: [],
        },
      ],
    },
  ];

  const resourceCards = [
    {
      id: "tikz",
      title: t.teaching.resourceTikzTitle,
      description: t.teaching.resourceTikzText,
      audience: "LaTeX",
      actions: [
        {
          kind: "internal",
          label: t.teaching.resourceActionOpen,
          to: `/${lang}/tikz`,
        },
      ],
    },
    {
      id: "linear-map",
      title: t.teaching.resourceLinearMapTitle,
      description: t.teaching.resourceLinearMapText,
      audience: "L1-L2",
      actions: [
        {
          kind: "internal",
          label: t.teaching.resourceActionOpen,
          to: `/${lang}/application-lineaire`,
        },
      ],
    },
    {
      id: "gauss",
      title: t.teaching.resourceGaussTitle,
      description: t.teaching.resourceGaussText,
      audience: "L1",
      actions: [
        {
          kind: "internal",
          label: t.teaching.resourceActionOpen,
          to: `/${lang}/gauss`,
        },
      ],
    },
    {
      id: "inverse",
      title: t.teaching.resourceInverseTitle,
      description: t.teaching.resourceInverseText,
      audience: "L1",
      actions: [
        {
          kind: "internal",
          label: t.teaching.resourceActionOpen,
          to: `/${lang}/inverse`,
        },
      ],
    },
    {
      id: "terminale",
      title: t.teaching.resourceTerminaleTitle,
      description: t.teaching.teach2.desc3,
      audience: "Terminale",
      actions: [
        {
          kind: "pdf",
          label: t.teaching.resourceActionPdf,
          href: `${process.env.PUBLIC_URL}/docs/exercicesterminale.pdf`,
        },
      ],
    },
    {
      id: "agreg",
      title: t.teaching.resourceAgregTitle,
      descriptionHtml: t.teaching.teach3.desc,
      audience: t.teaching.teach3.title,
      actions: [
        {
          kind: "pdf",
          label: t.teaching.agreg.algebre,
          href: `${process.env.PUBLIC_URL}/docs/metaplansalgebre.pdf`,
        },
        {
          kind: "pdf",
          label: t.teaching.agreg.analyse,
          href: `${process.env.PUBLIC_URL}/docs/metaplansanalyse.pdf`,
        },
        {
          kind: "package",
          label: t.teaching.resourceActionPackage,
          onClick: () => openTeX("packageagreg.tex"),
        },
      ],
    },
  ];

  return (
    <div className="showcase-page showcase-page-teaching min-w-screen min-h-screen pb-10">
      <NavBar />

      <div className="showcase-shell">
        <div className="showcase-orb showcase-orb-a" />
        <div className="showcase-orb showcase-orb-b" />

        <section className="showcase-panel showcase-card animate-defil">
          <p className="showcase-eyebrow">{t.teaching.title}</p>
          <h1 className="showcase-title">{t.teaching.title}</h1>
          <p className="showcase-lead">{t.teaching.lead}</p>
        </section>

        {teachingYears.length > 0 && (
          <section id="activities" className="showcase-section-block animate-defil">
            <h2 className="showcase-section-title">{t.teaching.timelineTitle}</h2>

            <div className="timeline-grid">
              {teachingYears.map((yearBlock) => (
                <article
                  key={yearBlock.year}
                  className={`showcase-panel timeline-card timeline-accent-${yearBlock.accent}`}
                >
                  <span className="timeline-year">{yearBlock.year}</span>

                  <div className="timeline-items">
                    {yearBlock.items.map((item) => (
                      <div key={`${yearBlock.year}-${item.title}`} className="timeline-item">
                        <h3 className="timeline-item-title">{item.title}</h3>
                        {item.subtitle && (
                          <p className="timeline-item-subtitle">{item.subtitle}</p>
                        )}
                        {item.description && (
                          <p className="timeline-item-desc">{item.description}</p>
                        )}
                        {item.descriptionHtml && (
                          <RichContent
                            as="p"
                            className="timeline-item-desc"
                            html={item.descriptionHtml}
                          />
                        )}

                        {item.actions.length > 0 && (
                          <div className="resource-actions">
                            {item.actions.map((action) => (
                              <TeachingActionButton
                                key={`${item.title}-${action.label}`}
                                action={action}
                                onClick={action.onClick}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section id="resources" className="showcase-section-block animate-defil">
          <h2 className="showcase-section-title">{t.teaching.resourcesTitle}</h2>

          <div className="resource-grid">
            {resourceCards.map((resource) => (
              <article
                key={resource.id}
                className={`showcase-panel resource-card ${resource.empty ? "resource-empty" : ""}`}
              >
                <h3 className="showcase-card-title">{resource.title}</h3>

                {resource.description && (
                  <p className="showcase-card-lead">{resource.description}</p>
                )}
                {resource.descriptionHtml && (
                  <RichContent
                    as="p"
                    className="showcase-card-lead"
                    html={resource.descriptionHtml}
                  />
                )}

                <div className="resource-meta">
                  <span className="resource-meta-chip">
                    {t.teaching.resourceAudience}: {resource.audience}
                  </span>
                </div>

                {resource.actions.length > 0 && (
                  <div className="resource-actions">
                    {resource.actions.map((action) => (
                      <TeachingActionButton
                        key={`${resource.id}-${action.label}`}
                        action={action}
                        onClick={action.onClick}
                      />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>

      {showModal && (
        <div
          className="showcase-modal-backdrop"
          onClick={() => setShowModal(false)}
          role="presentation"
        >
          <div
            className="showcase-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="package-title"
          >
            <div className="showcase-modal-header">
              <div>
                <p className="showcase-modal-kicker">TeX</p>
                <h2 id="package-title">{t.teaching.packageTitle}</h2>
              </div>

              <div className="showcase-modal-actions">
                <button
                  type="button"
                  onClick={copyTexText}
                  className="showcase-icon-button"
                >
                  <ClipboardDocumentIcon className="w-5 h-5" />
                  <span>{copyState ? t.teaching.copied : t.teaching.copy}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="showcase-icon-button"
                  aria-label={t.teaching.close}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <pre className="showcase-code-block">{texText}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
