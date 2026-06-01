import NavBar from "../components/NavBar";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { FaFilePdf } from "react-icons/fa";
import { useLang } from "../App";
import { getConferenceTalks } from "../data/conferenceContent";
import "../showcase.css";

function TalkAction({ action }) {
  const icon =
    action.kind === "pdf" ? (
      <FaFilePdf className="w-5 h-5" />
    ) : (
      <ArrowTopRightOnSquareIcon className="w-5 h-5" />
    );

  const className =
    action.kind === "pdf"
      ? "showcase-action showcase-action-pdf"
      : "showcase-action showcase-action-link";

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

  return (
    <div className="showcase-page showcase-page-conferences min-w-screen min-h-screen pb-10">
      <NavBar />

      <div className="showcase-shell">
        <div className="showcase-orb showcase-orb-a" />
        <div className="showcase-orb showcase-orb-b" />

        <section className="showcase-panel showcase-card animate-defil">
          <p className="showcase-eyebrow">{t.conferences.title}</p>
          <h1 className="showcase-title">{t.conferences.title}</h1>
          <p className="showcase-lead">{t.conferences.lead}</p>
        </section>

        <section className="talk-grid">
          {talks.map((talk, index) => (
            <article
              key={talk.id}
              className={`showcase-panel talk-card talk-accent-${talk.accent} animate-defil`}
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="talk-top">
                <span className="talk-badge talk-badge-year">{talk.year}</span>
                <span className="talk-badge talk-badge-type">{talk.type}</span>
              </div>

              <h2 className="talk-title">{talk.title}</h2>
              <p className="talk-desc">{talk.description}</p>

              <div className="resource-actions">
                {talk.actions.map((action) => (
                  <TalkAction key={`${talk.id}-${action.label}`} action={action} />
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
