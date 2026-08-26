import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import { useLang } from "../App";
import { exerciseCategories, getToolsForCategory } from "../exercises/registry";
import { localize } from "../exercises/core/localize";
import { getExerciseUiText } from "../exercises/content/uiText";
import "../showcase.css";
import "../exercise.css";

export default function ExerciseCatalog() {
  const { lang } = useLang();
  const labels = getExerciseUiText(lang);

  return (
    <div className="showcase-page showcase-page-teaching exercise-page min-w-screen min-h-screen pb-10">
      <NavBar />
      <main className="showcase-shell">
        <div className="showcase-orb showcase-orb-a" />
        <div className="showcase-orb showcase-orb-b" />

        <section className="showcase-panel showcase-card animate-defil exercise-catalog-hero">
          <p className="showcase-eyebrow">{labels.catalogEyebrow}</p>
          <h1 className="showcase-title">{labels.catalogTitle}</h1>
          <p className="showcase-lead">{labels.catalogLead}</p>
          <div className="exercise-catalog-summary">
            <span><strong>{exerciseCategories.length}</strong> {labels.categories.toLocaleLowerCase()}</span>
            <span><strong>{exerciseCategories.reduce((sum, category) => sum + getToolsForCategory(category.id).length, 0)}</strong> {labels.tools.toLocaleLowerCase()}</span>
          </div>
        </section>

        <section className="showcase-section-block animate-defil">
          <h2 className="showcase-section-title">{labels.categories}</h2>
          <div className="exercise-catalog-grid">
            {exerciseCategories.map((category) => {
              const tools = getToolsForCategory(category.id);
              return (
                <article key={category.id} className={`showcase-panel exercise-category-card exercise-accent-${category.accent}`}>
                  <span className="exercise-category-count">{tools.length} {labels.tools.toLocaleLowerCase()}</span>
                  <h3>{localize(category.title, lang)}</h3>
                  <p>{localize(category.description, lang)}</p>
                  <div className="exercise-card-footer">
                    <span>{category.audience}</span>
                    <Link to={`/${lang}/entrainements/${category.id}`} className="showcase-action showcase-action-link">
                      {labels.openCategory}
                      <ArrowRightIcon className="exercise-small-icon" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
