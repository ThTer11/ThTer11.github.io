import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import "../research.css";
import {
  ArrowTopRightOnSquareIcon,
  BookmarkIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { FaFilePdf } from "react-icons/fa";
import { useLang } from "../App";
import RichContent from "../components/RichContent";

function ResourceButton({ action, onClick }) {
  const icon =
    action.kind === "pdf" ? (
      <FaFilePdf className="w-5 h-5" />
    ) : action.kind === "bibtex" ? (
      <BookmarkIcon className="w-5 h-5" />
    ) : (
      <ArrowTopRightOnSquareIcon className="w-5 h-5" />
    );

  const className = `research-action research-action-${action.kind}`;

  if (action.kind === "bibtex") {
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

export default function Recherche() {
  const { t } = useLang();
  const [bibText, setBibText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [copyState, setCopyState] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedAuthors, setExpandedAuthors] = useState({});
  const [expandedDescriptions, setExpandedDescriptions] = useState({});

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

  const openBib = async (bibfile) => {
    try {
      const response = await fetch(`${process.env.PUBLIC_URL}/bibs/${bibfile}`);
      const text = await response.text();
      setBibText(text);
      setCopyState(false);
      setShowModal(true);
    } catch (error) {
      setBibText("Unable to load BibTeX.");
      setCopyState(false);
      setShowModal(true);
    }
  };

  const copyBibText = async () => {
    if (!bibText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(bibText);
      setCopyState(true);
      window.setTimeout(() => setCopyState(false), 1800);
    } catch (error) {
      setCopyState(false);
    }
  };

  const toggleAuthors = (id) => {
    setExpandedAuthors((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const toggleDescription = (id) => {
    setExpandedDescriptions((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const publications = [
    {
      id: "paper-2026",
      year: "2026",
      type: "research",
      accent: "cobalt",
      title: t.research.pub4Title,
      description: t.research.pub4Description,
      authors: t.research.pub4Info,
      actions: [
        {
          kind: "link",
          label: t.research.actionPreprint,
          href: "https://arxiv.org/abs/2601.05026/",
        },
      ],
    },
    {
      id: "exam-2025",
      year: "2025",
      type: "teaching",
      accent: "gold",
      title: t.research.pub2Title,
      description: t.research.pub2Info,
      authors: null,
      actions: [
        {
          kind: "link",
          label: t.research.actionOpen,
          href: "https://www.h-k.fr/adc.ps.2025PSIm",
        },
      ],
    },
    {
      id: "outreach-2025",
      year: "2025",
      type: "outreach",
      accent: "emerald",
      title: t.research.pub3Title,
      descriptionHtml: t.research.pub3Info,
      authors: null,
      actions: [
        {
          kind: "link",
          label: t.research.actionArticle,
          href: "https://www.calameo.com/read/007886373c61c15d30939/",
        },
      ],
    },
    {
      id: "ryugu-2024",
      year: "2024",
      type: "research",
      accent: "rose",
      title: t.research.pub1Title,
      description: t.research.pub1Info,
      authors: t.research.pub1Authors,
      actions: [
        {
          kind: "pdf",
          label: t.research.actionPdf,
          href: "https://onlinelibrary.wiley.com/doi/epdf/10.1111/maps.14068",
        },
        {
          kind: "bibtex",
          label: t.research.actionBibtex,
          onClick: () => openBib("pericles_1945510059.bib"),
        },
      ],
    },
  ];

  const filters = [
    { key: "all", label: t.research.filtersAll },
    { key: "research", label: t.research.filtersResearch },
    { key: "teaching", label: t.research.filtersTeaching },
    { key: "outreach", label: t.research.filtersOutreach },
  ];

  const filteredPublications =
    activeFilter === "all"
      ? publications
      : publications.filter((publication) => publication.type === activeFilter);

  const typeLabels = {
    research: t.research.typeResearch,
    teaching: t.research.typeTeaching,
    outreach: t.research.typeOutreach,
  };

  const accentColors = {
    cobalt: "#2563eb",
    gold: "#d97706",
    emerald: "#059669",
    rose: "#e11d48",
  };

  const getDescriptionLength = (publication) => {
    const content = publication.descriptionHtml
      ? publication.descriptionHtml.replace(/<[^>]+>/g, " ")
      : publication.description ?? "";

    return content.replace(/\s+/g, " ").trim().length;
  };

  return (
    <div className="research-page min-w-screen min-h-screen pb-10">
      <NavBar />

      <div className="research-shell">
        <div className="research-orb research-orb-one" />
        <div className="research-orb research-orb-two" />

        <section className="research-panel research-hero animate-defil">
          <div className="research-hero-copy">
            <p className="research-eyebrow">2024 - 2026</p>
            <h1 className="research-title">{t.research.title}</h1>
            <p className="research-lead">{t.research.lead}</p>
          </div>
        </section>

        <section className="research-toolbar animate-defil">
          <div className="research-filter-row">
            {filters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={
                  activeFilter === filter.key
                    ? "research-filter research-filter-active"
                    : "research-filter"
                }
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        <section key={activeFilter} className="research-list">
          {filteredPublications.length === 0 && (
            <div className="research-panel research-empty animate-defil">
              {t.research.empty}
            </div>
          )}

          {filteredPublications.map((publication, index) => {
            const authorsAreLong =
              publication.authors && publication.authors.length > 170;
            const isExpanded = Boolean(expandedAuthors[publication.id]);
            const descriptionIsLong = getDescriptionLength(publication) > 190;
            const descriptionExpanded = Boolean(expandedDescriptions[publication.id]);
            const displayedAuthors =
              authorsAreLong && !isExpanded
                ? `${publication.authors.slice(0, 170)}...`
                : publication.authors;

            return (
              <article
                key={`${activeFilter}-${publication.id}`}
                className="research-panel research-card animate-defil"
                style={{
                  animationDelay: `${index * 0.08}s`,
                  "--research-accent": accentColors[publication.accent],
                }}
              >
                <div className="research-card-top">
                  <div className="research-card-badges">
                    <span className="research-year-badge">{publication.year}</span>
                    <span className="research-type-badge">
                      {typeLabels[publication.type]}
                    </span>
                  </div>
                </div>

                <h2 className="research-card-title">{publication.title}</h2>

                {publication.authors && (
                  <div className="research-authors-block">
                    <p className="research-authors-label">{t.research.authorsLabel}</p>
                    <p className="research-authors">{displayedAuthors}</p>
                    {authorsAreLong && (
                      <button
                        type="button"
                        className="research-inline-button"
                        onClick={() => toggleAuthors(publication.id)}
                      >
                        {isExpanded ? t.research.hideAuthors : t.research.showAuthors}
                      </button>
                    )}
                  </div>
                )}

                {publication.description && (
                  <p
                    className={
                      descriptionIsLong && !descriptionExpanded
                        ? "research-description research-description-collapsed"
                        : "research-description"
                    }
                  >
                    {publication.description}
                  </p>
                )}

                {publication.descriptionHtml && (
                  <RichContent
                    as="div"
                    className={
                      descriptionIsLong && !descriptionExpanded
                        ? "research-description research-description-collapsed"
                        : "research-description"
                    }
                    html={publication.descriptionHtml}
                  />
                )}

                {descriptionIsLong && (
                  <button
                    type="button"
                    className="research-inline-button"
                    onClick={() => toggleDescription(publication.id)}
                  >
                    {descriptionExpanded
                      ? t.research.hideDescription
                      : t.research.showDescription}
                  </button>
                )}

                <div className="research-actions">
                  {publication.actions.map((action) => (
                    <ResourceButton
                      key={`${publication.id}-${action.label}`}
                      action={action}
                      onClick={action.onClick}
                    />
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      </div>

      {showModal && (
        <div
          className="research-modal-backdrop"
          onClick={() => setShowModal(false)}
          role="presentation"
        >
          <div
            className="research-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bibtex-title"
          >
            <div className="research-modal-header">
              <div>
                <p className="research-modal-kicker">BibTeX</p>
                <h2 id="bibtex-title">{t.research.bibtexTitle}</h2>
              </div>

              <div className="research-modal-actions">
                <button
                  type="button"
                  onClick={copyBibText}
                  className="research-icon-button"
                >
                  <ClipboardDocumentIcon className="w-5 h-5" />
                  <span>{copyState ? t.research.copied : t.research.copy}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="research-icon-button"
                  aria-label={t.research.close}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <pre className="research-code-block">{bibText}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
