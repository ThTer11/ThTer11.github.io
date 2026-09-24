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

export default function Home() {
  const { t } = useLang();
  const profileLinks = [
    { href: "mailto:theo.ternier@inria.fr", label: t.home.email, icon: <Mail /> },
    { href: "https://scholar.google.com/citations?user=3i6-KhIAAAAJ&hl=fr", label: t.home.scholar, icon: <img src={GoogleScholar} alt="" /> },
    { href: "https://fr.linkedin.com/in/th%C3%A9o-ternier-6bab6726a", label: t.home.linkedin, icon: <FaLinkedin /> },
    { href: "https://github.com/ThTer11", label: t.home.github, icon: <FaGithub /> },
  ];

  return (
    <div className="showcase-page showcase-page-home min-w-screen min-h-screen pb-10">
      <NavBar />
      <div className="showcase-shell">
        <div className="showcase-orb showcase-orb-a" />
        <div className="showcase-orb showcase-orb-b" />
        <img src={Eco} alt="" aria-hidden="true" className="showcase-watermark" />
        <div className="showcase-home-layout">
          <aside className="showcase-panel showcase-card home-profile-card animate-defil">
            <img src={Profile} alt={t.home.name} className="home-avatar" />
            <h1 className="home-name">{t.home.name}</h1>
            <div className="home-social-links">
              {profileLinks.map(({ href, label, icon }) => (
                <a
                  key={href}
                  href={href}
                  target={href.startsWith("mailto:") ? undefined : "_blank"}
                  rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                  aria-label={label}
                  title={label}
                >
                  <span aria-hidden="true">{icon}</span>
                </a>
              ))}
            </div>
            <section className="home-education">
              <h2>{t.home.educationTitle}</h2>
              <div className="showcase-list">
                {t.home.education.map((education) => (
                  <div key={`${education.year}-${education.title}`} className="showcase-list-item">
                    <span className="home-education-year">{education.year}</span>
                    <strong>{education.title}</strong>
                    <span>{education.school}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <main className="showcase-home-main">
            <div className="showcase-panel showcase-card home-intro animate-defil">
              <RichContent as="p" className="showcase-lead" html={t.home.description} />
            </div>
            <MddGallery
              title={t.home.mddTitle}
              emptyLabel={t.home.mddEmpty}
              diagramLabel={t.home.mddDiagram}
              dualLabel={t.home.mddDual}
              galleryLabels={t.home.mddGallery}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
