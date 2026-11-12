import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CalculatorIcon, ChartBarIcon, ChevronDownIcon, TableCellsIcon, VariableIcon, WrenchScrewdriverIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Link, useLocation } from "react-router-dom";
import NavBar from "../components/NavBar";
import ExerciseEngine from "../components/exercises/ExerciseEngine";
import MathRenderer from "../components/exercises/MathRenderer";
import { useLang } from "../App";
import { courseHintsById, getExerciseTool } from "../exercises/registry";
import { getExerciseUiText } from "../exercises/content/uiText";
import { localize } from "../exercises/core/localize";
import { getPracticeGroups } from "../practice/catalog";
import "../showcase.css";
import "../exercise.css";
import "../practice.css";

const groupIcons = {
  "calcul-elementaire": CalculatorIcon,
  analyse: ChartBarIcon,
  matrices: TableCellsIcon,
  "equations-differentielles": VariableIcon,
  outils: WrenchScrewdriverIcon,
};

function useColumnCount() {
  const [columns, setColumns] = useState(() => typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(min-width:1200px)").matches ? 3 : window.matchMedia("(min-width:760px)").matches ? 2 : 1
    : 1);
  useEffect(() => {
    const tablet = window.matchMedia("(min-width:760px)");
    const desktop = window.matchMedia("(min-width:1200px)");
    const update = () => setColumns(desktop.matches ? 3 : tablet.matches ? 2 : 1);
    update();
    tablet.addEventListener("change", update);
    desktop.addEventListener("change", update);
    return () => { tablet.removeEventListener("change", update); desktop.removeEventListener("change", update); };
  }, []);
  return columns;
}

export default function ExerciseCatalog() {
  const { t, lang } = useLang();
  const location = useLocation();
  const groups = getPracticeGroups(t, lang);
  const labels = getExerciseUiText(lang);
  const columns = useColumnCount();
  const [selected, setSelected] = useState(null);
  const [phase, setPhase] = useState("setup");
  const [setupRequest, setSetupRequest] = useState(0);
  const catalogueScroll = useRef(0);
  const engineInSession = useRef(false);
  const wasInSession = useRef(false);
  const selectedTool = selected && getExerciseTool(selected.groupId, selected.toolId);
  const sessionVisible = Boolean(selectedTool) && phase !== "setup";
  const disclosureId = selected ? `practice-setup-${selected.groupId}-${selected.toolId}` : "";

  useLayoutEffect(() => {
    if (!location.hash) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [location.pathname, location.hash, lang]);

  const handlePhaseChange = useCallback((nextPhase) => {
    const nextSession = nextPhase !== "setup";
    if (nextSession && !engineInSession.current) catalogueScroll.current = window.scrollY;
    engineInSession.current = nextSession;
    setPhase(nextPhase);
  }, []);

  useLayoutEffect(() => {
    if (sessionVisible) window.scrollTo({ top: 0, behavior: "auto" });
    else if (wasInSession.current) window.scrollTo({ top: catalogueScroll.current, behavior: "auto" });
    wasInSession.current = sessionVisible;
  }, [sessionVisible]);

  const closeSelection = () => {
    const previous = selected;
    setSelected(null);
    setPhase("setup");
    if (previous) requestAnimationFrame(() => {
      document.getElementById(`practice-trigger-${previous.groupId}-${previous.toolId}`)?.focus({ preventScroll: true });
    });
  };
  const toggleSelection = (groupId, toolId) => {
    if (selected?.groupId === groupId && selected?.toolId === toolId) closeSelection();
    else {
      setPhase("setup");
      setSetupRequest(0);
      setSelected({ groupId, toolId });
    }
  };

  return (
    <div className={`showcase-page showcase-page-teaching exercise-page practice-page${sessionVisible ? " exercise-page-session" : ""}`}>
      {!sessionVisible && <NavBar />}
      <main className={`showcase-shell ${sessionVisible ? "exercise-tool-shell" : "practice-shell"}`}>
        {sessionVisible && phase !== "complete" && (
          <button type="button" className="exercise-back-link" onClick={() => setSetupRequest((value) => value + 1)}>
            <ArrowLeftIcon className="exercise-small-icon" aria-hidden="true" />
            {labels.backToTool} {localize(selectedTool.title, lang)}
          </button>
        )}
        <header className="practice-heading" hidden={sessionVisible}>
          <h1>{t.practice.title}</h1>
        </header>
        <div className={`practice-groups${sessionVisible ? " practice-session-contents" : ""}`}>
          {groups.map((group) => {
            const Icon = groupIcons[group.id] ?? CalculatorIcon;
            const selectedIndex = group.entries.findIndex((entry) => selected?.groupId === group.id && selected?.toolId === entry.id);
            const hasSelection = selectedIndex !== -1;
            const panelOrder = (Math.floor(selectedIndex / columns) + 1) * columns * 2 - 1;
            return (
              <section key={group.id} id={group.id}
                hidden={sessionVisible && !hasSelection}
                className={`practice-group practice-accent-${group.accent}${sessionVisible && hasSelection ? " practice-session-contents" : ""}`}
                aria-labelledby={`practice-title-${group.id}`}>
                <header className="practice-group-heading" hidden={sessionVisible}>
                  <span className="practice-group-icon"><Icon aria-hidden="true" /></span>
                  <div><h2 id={`practice-title-${group.id}`}>{group.title}</h2></div>
                </header>
                <div className={`practice-card-grid${sessionVisible ? " practice-session-contents" : ""}`}>
                  {group.entries.map((entry, index) => {
                    const expanded = selected?.groupId === group.id && selected?.toolId === entry.id;
                    const contents = <>
                      <MathRenderer as="h3" content={entry.title} />
                      <MathRenderer as="p" content={entry.description} />
                      <span className="practice-entry-action" aria-hidden="true">
                        {entry.kind === "tool" ? t.practice.openTool : expanded ? t.practice.hideExercises : t.practice.chooseExercise}
                        {entry.kind === "tool" ? <ArrowRightIcon /> : <ChevronDownIcon />}
                      </span>
                    </>;
                    return entry.kind === "tool" ? (
                      <Link key={entry.id} to={entry.to} hidden={sessionVisible} className="practice-entry" aria-label={entry.title} style={{ order: index * 2 }}>{contents}</Link>
                    ) : (
                      <button key={entry.id} id={`practice-trigger-${group.id}-${entry.id}`} type="button"
                        hidden={sessionVisible} className="practice-entry" style={{ order: index * 2 }}
                        aria-label={entry.title} aria-expanded={expanded} aria-controls={`practice-setup-${group.id}-${entry.id}`}
                        onClick={() => toggleSelection(group.id, entry.id)}>{contents}</button>
                    );
                  })}
                  {hasSelection && selectedTool && (
                    <div id={disclosureId} className={`practice-disclosure${sessionVisible ? " practice-session-contents" : ""}`}
                      style={{ order: panelOrder }} role="region" aria-label={localize(selectedTool.title, lang)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape" && !sessionVisible && !document.querySelector('[role="dialog"]')) closeSelection();
                      }}>
                      <header className="practice-disclosure-heading" hidden={sessionVisible}>
                        <h3 tabIndex={-1}>{localize(selectedTool.title, lang)}</h3>
                        <button type="button" className="practice-disclosure-close" onClick={closeSelection} aria-label={t.practice.closeSelection}>
                          <XMarkIcon aria-hidden="true" />
                        </button>
                      </header>
                      <ExerciseEngine key={`${selected.groupId}/${selected.toolId}`} tool={selectedTool} lang={lang}
                        courseHints={courseHintsById} onPhaseChange={handlePhaseChange} setupRequest={setupRequest} />
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
