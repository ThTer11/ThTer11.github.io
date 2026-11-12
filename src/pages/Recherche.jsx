import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import "../research.css";
import "../editorial.css";
import {
  ArrowTopRightOnSquareIcon,
  BookmarkIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { FaFilePdf } from "react-icons/fa";
import { useLang } from "../App";
import RichContent from "../components/RichContent";
import {
  RESEARCH_ACCENT_COLORS,
  getPublications,
} from "../data/researchContent";

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

  const publications = getPublications(t, openBib);
  const years = [...new Set(publications.map((publication) => publication.year))]
    .sort((left, right) => right.localeCompare(left));

  const getDescriptionLength = (publication) => {
    const content = publication.descriptionHtml
      ? publication.descriptionHtml.replace(/<[^>]+>/g, " ")
      : publication.description ?? "";

    return content.replace(/\s+/g, " ").trim().length;
  };

  return (
    <div className="research-page editorial-page min-w-screen min-h-screen pb-10">
      <NavBar />

      <div className="research-shell">
        <div className="research-orb research-orb-one" />
        <div className="research-orb research-orb-two" />

        <section className="editorial-heading">
          <div className="research-hero-copy">
            <h1 className="research-title">{t.research.title}</h1>
          </div>
        </section>

        <div className="publication-years">
          {years.map((year) => (
            <section key={year} className="publication-year" aria-labelledby={`publication-year-${year}`}>
              <h2 id={`publication-year-${year}`} className="publication-year-heading">{year}</h2>
              <div className="research-list">
                {publications.filter((publication) => publication.year === year).map((publication) => {
                  const authorsAreLong =
                    publication.authors && publication.authors.length > 170;
                  const isExpanded = Boolean(expandedAuthors[publication.id]);
                  const descriptionIsLong = getDescriptionLength(publication) > 190;
                  const descriptionExpanded = Boolean(expandedDescriptions[publication.id]);
                  const displayedAuthors =
                    authorsAreLong && !isExpanded
                      ? `${publication.authors.split(",").slice(0, 3).join(",")}…`
                      : publication.authors;

                  return (
                    <article
                      key={publication.id}
                      className="research-panel research-card"
                      style={{
                        "--research-accent": RESEARCH_ACCENT_COLORS[publication.accent],
                      }}
                    >
                      <h3 className="research-card-title">{publication.title}</h3>

                      {publication.authors && (
                        <div className="research-authors-block">
                          <p className="research-authors">{displayedAuthors}</p>
                          {authorsAreLong && (
                            <button
                              type="button"
                              className="research-inline-button"
                              onClick={() => toggleAuthors(publication.id)}
                              aria-expanded={isExpanded}
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
                          aria-expanded={descriptionExpanded}
                        >
                          {descriptionExpanded
                            ? t.research.hideDescription
                            : t.research.showDescription}
                        </button>
                      )}

                      {publication.covers?.length > 0 && (
                        <div className="research-actions research-covers">
                          {publication.covers.map((cover) => (
                            <a key={cover.href} href={cover.href} target="_blank" rel="noopener noreferrer" className="research-cover-link">
                              <img src={cover.src} alt={cover.alt} width="131" height="200" loading="lazy" />
                            </a>
                          ))}
                        </div>
                      )}
                      {publication.actions.length > 0 && <div className="research-actions">
                        {publication.actions.map((action) => (
                          <ResourceButton
                            key={`${publication.id}-${action.label}`}
                            action={action}
                            onClick={action.onClick}
                          />
                        ))}
                      </div>}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
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
