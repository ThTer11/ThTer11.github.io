import ArrowTopRightOnSquareIcon from "@heroicons/react/24/outline/ArrowTopRightOnSquareIcon";
import Mail from "@heroicons/react/24/outline/EnvelopeIcon";
import GoogleScholar from "../Google_Scholar_logo.svg.png";
import Profile from "../profile.png";
import Eco from "../eco.svg";
import { FaLinkedin, FaGithub } from "react-icons/fa";
import NavBar from "../components/NavBar";
import MddGallery from "../components/MddGallery";
import RichContent from "../components/RichContent";
import { useLang } from "../App";
import "../showcase.css";

function HomeLinkCard({ href, icon, label, caption }) {
  return (
    <a
      href={href}
      target={href.startsWith("mailto:") ? undefined : "_blank"}
      rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
      className="home-link-card"
    >
      <div className="home-link-main">
        {icon}
        <div>
          <strong>{label}</strong>
          <span>{caption}</span>
        </div>
      </div>

      <ArrowTopRightOnSquareIcon className="home-link-arrow" />
    </a>
  );
}

export default function Home() {
  const { t } = useLang();

  const profileLinks = [
    {
      href: "mailto:theo.ternier@inria.fr",
      label: t.home.email,
      caption: "theo.ternier@inria.fr",
      icon: <Mail className="w-6 h-6" />,
    },
    {
      href: "https://scholar.google.com/citations?user=3i6-KhIAAAAJ&hl=fr",
      label: t.home.scholar,
      caption: t.home.captionPublications,
      icon: <img src={GoogleScholar} alt="Google Scholar" className="w-6 h-6" />,
    },
    {
      href: "https://fr.linkedin.com/in/th%C3%A9o-ternier-6bab6726a",
      label: t.home.linkedin,
      caption: t.home.captionProfile,
      icon: <FaLinkedin size={24} />,
    },
    {
      href: "https://github.com/ThTer11",
      label: t.home.github,
      caption: t.home.captionCode,
      icon: <FaGithub size={24} />,
    },
  ];

  const subtitle = [t.home.job, t.home.workplace].filter(Boolean).join(" · ");

  return (
    <div className="showcase-page showcase-page-home min-w-screen min-h-screen pb-10">
      <NavBar />

      <div className="showcase-shell">
        <div className="showcase-orb showcase-orb-a" />
        <div className="showcase-orb showcase-orb-b" />
        <img src={Eco} alt="" aria-hidden="true" className="showcase-watermark" />

        <section className="showcase-home-layout">
          <div className="showcase-home-main">
            <section className="showcase-panel showcase-card animate-defil">
              <p className="showcase-eyebrow">{t.home.heroKicker}</p>
              <h1 className="showcase-title">{t.home.name}</h1>
              {subtitle && <p className="showcase-subtitle">{subtitle}</p>}
              <RichContent
                as="p"
                className="showcase-lead"
                html={t.home.description}
              />
            </section>

            <MddGallery
              title={t.home.mddTitle}
              emptyLabel={t.home.mddEmpty}
              diagramLabel={t.home.mddDiagram}
              dualLabel={t.home.mddDual}
              showDualLabel={t.home.mddShowDual}
              hideDualLabel={t.home.mddHideDual}
            />

            <section className="showcase-panel showcase-card animate-defil">
              <h2 className="showcase-section-title">{t.home.educationTitle}</h2>
              <div className="showcase-list">
                {t.home.education.map((education) => (
                  <div
                    key={`${education.year}-${education.title}`}
                    className="showcase-list-item"
                  >
                    <strong>
                      {education.year} · {education.title}
                    </strong>
                    <span>{education.school}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="showcase-panel showcase-card home-profile-card animate-defil">
            <img src={Profile} alt="Profile" className="home-avatar" />
            <h2 className="home-name">{t.home.name}</h2>

            <div className="home-focus-block">
              <p className="home-focus-title">{t.home.focusTitle}</p>
              <div className="showcase-chip-row home-focus-row">
                {t.home.focusAreas.map((item) => (
                  <RichContent
                    key={item}
                    as="span"
                    className="showcase-chip"
                    html={item}
                    enableMathCopy={false}
                  />
                ))}
              </div>
            </div>

            <div className="home-link-grid">
              {profileLinks.map((link) => (
                <HomeLinkCard key={link.label} {...link} />
              ))}
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
