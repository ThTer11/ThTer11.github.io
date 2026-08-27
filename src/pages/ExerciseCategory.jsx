import { ArrowLeftIcon, ArrowRightIcon, ClockIcon } from "@heroicons/react/24/outline";
import { Link, useParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import MathRenderer from "../components/exercises/MathRenderer";
import { useLang } from "../App";
import { getExerciseCategory, getToolsForCategory } from "../exercises/registry";
import { localize } from "../exercises/core/localize";
import { getExerciseUiText } from "../exercises/content/uiText";
import "../showcase.css";
import "../exercise.css";

export default function ExerciseCategory() {
  const { categoryId } = useParams();
  const { lang } = useLang();
  const labels = getExerciseUiText(lang);
  const category = getExerciseCategory(categoryId);
  const tools = getToolsForCategory(categoryId);

  return (
    <div className="showcase-page showcase-page-teaching exercise-page min-w-screen min-h-screen pb-10">
      <NavBar />
      <main className="showcase-shell">
        <Link to={`/${lang}/entrainements`} className="exercise-back-link">
          <ArrowLeftIcon className="exercise-small-icon" />
          {labels.backCatalog}
        </Link>

        {category ? (
          <>
            <section className="showcase-panel showcase-card animate-defil exercise-category-hero">
              <p className="showcase-eyebrow">{labels.catalogEyebrow}</p>
              <h1 className="showcase-title">{localize(category.title, lang)}</h1>
              <p className="showcase-lead">{localize(category.description, lang)}</p>
            </section>

            <section className="showcase-section-block animate-defil">
              <h2 className="showcase-section-title">{labels.tools}</h2>
              <div className="exercise-tool-grid">
                {tools.map((tool) => (
                  <article key={tool.id} className="showcase-panel exercise-tool-card">
                    <div className="exercise-tool-meta">
                      <span>{localize(tool.audience ?? category.audience, lang)}</span>
                      {tool.timer && tool.timer.enabled !== false}
                      {tool.mode === "study" && <span>{labels.studyMode}</span>}
                    </div>
                    <MathRenderer as="h3" content={localize(tool.title, lang)} />
                    <MathRenderer as="p" content={localize(tool.description, lang)} />
                    {tool.tags?.length > 0 && (
                      <div className="exercise-tags">
                        {tool.tags.map((tag) => <span key={localize(tag, lang)}>{localize(tag, lang)}</span>)}
                      </div>
                    )}
                    <Link to={`/${lang}/entrainements/${category.id}/${tool.id}`} className="showcase-action showcase-action-link">
                      {labels.openTool}
                      <ArrowRightIcon className="exercise-small-icon" />
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="showcase-panel showcase-card exercise-empty-state">
            <h1 className="showcase-section-title">{labels.unavailable}</h1>
          </section>
        )}
      </main>
    </div>
  );
}
