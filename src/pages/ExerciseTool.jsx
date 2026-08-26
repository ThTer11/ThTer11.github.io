import { useState } from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Link, useParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import ExerciseEngine from "../components/exercises/ExerciseEngine";
import MathRenderer from "../components/exercises/MathRenderer";
import { useLang } from "../App";
import { courseHintsById, getExerciseCategory, getExerciseTool } from "../exercises/registry";
import { localize } from "../exercises/core/localize";
import { getExerciseUiText } from "../exercises/content/uiText";
import "../showcase.css";
import "../exercise.css";

export default function ExerciseTool() {
  const { categoryId, toolId } = useParams();
  const { lang } = useLang();
  const labels = getExerciseUiText(lang);
  const category = getExerciseCategory(categoryId);
  const tool = getExerciseTool(categoryId, toolId);
  const [enginePhase, setEnginePhase] = useState("setup");
  const [engineRun, setEngineRun] = useState(0);
  const trainingInProgress = Boolean(tool) && enginePhase !== "setup";
  const practiceSetupVisible = Boolean(tool) && tool.mode !== "study" && enginePhase === "setup";
  const returnToToolSetup = () => {
    setEnginePhase("setup");
    setEngineRun((run) => run + 1);
  };

  return (
    <div className={`showcase-page showcase-page-teaching exercise-page min-w-screen min-h-screen pb-10${trainingInProgress ? " exercise-page-session" : ""}${practiceSetupVisible ? " exercise-page-setup" : ""}`}>
      <NavBar />
      <main className="showcase-shell exercise-tool-shell">
        {enginePhase === "complete" ? null : trainingInProgress ? (
          <button type="button" className="exercise-back-link" onClick={returnToToolSetup}>
            <ArrowLeftIcon className="exercise-small-icon" />
            {labels.backToTool} {localize(tool.title, lang)}
          </button>
        ) : (
          <Link to={`/${lang}/entrainements/${categoryId}`} className="exercise-back-link">
            <ArrowLeftIcon className="exercise-small-icon" />
            {category
              ? `${labels.backToTool} ${localize(category.title, lang)}`
              : labels.backCategory}
          </Link>
        )}

        {tool && category ? (
          <>
            {enginePhase === "setup" && (
              <section className="showcase-panel showcase-card animate-defil exercise-tool-hero">
                <p className="showcase-eyebrow">{localize(category.title, lang)}</p>
                <MathRenderer as="h1" className="showcase-title" content={localize(tool.title, lang)} />
                <MathRenderer as="p" className="showcase-lead" content={localize(tool.description, lang)} />
              </section>
            )}
            <ExerciseEngine
              key={`${tool.id}-${engineRun}`}
              tool={tool}
              lang={lang}
              courseHints={courseHintsById}
              onPhaseChange={setEnginePhase}
            />
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
