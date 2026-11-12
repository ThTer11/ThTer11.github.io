import NavBar from "../components/NavBar";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { FaFilePdf } from "react-icons/fa";
import { useLang } from "../App";
import { getConferenceTalks } from "../data/conferenceContent";
import { RESEARCH_ACCENT_COLORS } from "../data/researchContent";
import "../research.css";
import "../editorial.css";

function TalkAction({ action }) {
  const icon =
    action.kind === "pdf" ? (
      <FaFilePdf className="w-5 h-5" />
    ) : (
      <ArrowTopRightOnSquareIcon className="w-5 h-5" />
    );

  const className =
    action.kind === "pdf"
      ? "research-action research-action-pdf"
      : "research-action research-action-link";

  return (
    <a href={action.href} target="_blank" rel="noopener noreferrer" className={className}>
      {icon}
      <span>{action.label}</span>
    </a>
  );
}

export default function Conferences() {
  const { t } = useLang();

  const talks = getConferenceTalks(t);
  const years = [...new Set(talks.map((talk) => talk.year))].sort((left, right) => right.localeCompare(left));

  return (
    <div className="research-page editorial-page min-w-screen min-h-screen pb-10">
      <NavBar />

      <div className="research-shell">
        <header className="editorial-heading">
          <h1 className="research-title">{t.conferences.title}</h1>
        </header>

        <div className="conference-years">
          {years.map((year) => (
            <section key={year} className="conference-year" aria-labelledby={`conference-year-${year}`}>
              <h2 id={`conference-year-${year}`} className="conference-year-heading">{year}</h2>
              <div className="research-list">
                {talks.filter((talk) => talk.year === year).map((talk) => (
                  <article key={talk.id} className="research-panel research-card"
                    style={{ "--research-accent": RESEARCH_ACCENT_COLORS[talk.accent] }}>
                    <h3 className="research-card-title">{talk.title}</h3>
                    {talk.description && <p className="research-description">{talk.description}</p>}
                    <div className="research-actions">
                      {talk.actions.map((action) => <TalkAction key={`${talk.id}-${action.label}`} action={action} />)}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
