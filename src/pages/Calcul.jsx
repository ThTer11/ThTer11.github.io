import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import RichContent from "../components/RichContent";
import { useLang } from "../App";
import { checkPracticeAnswer, generatePracticeExercise } from "../utils/practice";
import "../showcase.css";
import "../gauss.css";
import "../practice.css";

function feedbackClass(type) {
  if (type === "correct") {
    return "gauss-status gauss-status-success";
  }

  if (type === "incorrect") {
    return "gauss-status gauss-status-warning";
  }

  return "gauss-status gauss-status-danger";
}

export default function Calcul() {
  const { t } = useLang();
  const [category, setCategory] = useState("linear");
  const [difficulty, setDifficulty] = useState(1);
  const [exercise, setExercise] = useState(() => generatePracticeExercise("linear", 1));
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ attempts: 0, correct: 0 });

  useEffect(() => {
    setExercise(generatePracticeExercise(category, difficulty));
    setAnswer("");
    setFeedback(null);
    setRevealed(false);
  }, [category, difficulty]);

  const categories = [
    { id: "linear", label: t.practice.categories.linear },
    { id: "quadratic", label: t.practice.categories.quadratic },
    { id: "fractions", label: t.practice.categories.fractions },
    { id: "radicals", label: t.practice.categories.radicals },
    { id: "powers", label: t.practice.categories.powers },
  ];

  const difficultyLabels = [
    t.practice.difficultyEasy,
    t.practice.difficultyMedium,
    t.practice.difficultyHard,
  ];

  const answerHelp =
    exercise.answerType === "solutions"
      ? t.practice.answerHelpSolutions
      : exercise.answerType === "radical"
        ? t.practice.answerHelpRadical
        : t.practice.answerHelpSingle;

  const createNewExercise = () => {
    setExercise(generatePracticeExercise(category, difficulty));
    setAnswer("");
    setFeedback(null);
    setRevealed(false);
  };

  const checkAnswer = () => {
    try {
      const isCorrect = checkPracticeAnswer(exercise, answer);

      setStats((current) => ({
        attempts: current.attempts + 1,
        correct: current.correct + (isCorrect ? 1 : 0),
      }));

      if (isCorrect) {
        setFeedback({ type: "correct", message: t.practice.feedbackCorrect });
        setRevealed(true);
        return;
      }

      setFeedback({ type: "incorrect", message: t.practice.feedbackIncorrect });
    } catch (_) {
      setFeedback({ type: "error", message: t.practice.feedbackInvalid });
    }
  };

  const revealAnswer = () => {
    setRevealed(true);

    if (!feedback) {
      setFeedback({ type: "incorrect", message: t.practice.feedbackRevealed });
    }
  };

  return (
    <div className="showcase-page showcase-page-teaching gauss-page practice-page min-w-screen min-h-screen pb-10">
      <NavBar />

      <div className="showcase-shell">
        <div className="showcase-orb showcase-orb-a" />
        <div className="showcase-orb showcase-orb-b" />

        <section className="showcase-panel showcase-card animate-defil">
          <p className="showcase-eyebrow">{t.teaching.sectionResources}</p>
          <h1 className="showcase-title">{t.practice.title}</h1>
          <p className="showcase-lead">{t.practice.lead}</p>
        </section>

        <section className="practice-layout">
          <section className="showcase-panel showcase-card practice-controls-card animate-defil">
            <h2 className="showcase-section-title">{t.practice.settingsTitle}</h2>

            <div className="practice-control-block">
              <p className="practice-label">{t.practice.categoryLabel}</p>
              <div className="practice-choice-grid">
                {categories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className={category === item.id ? "gauss-mode gauss-mode-active" : "gauss-mode"}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="practice-control-block">
              <p className="practice-label">{t.practice.difficultyLabel}</p>
              <div className="gauss-mode-row">
                {difficultyLabels.map((label, index) => {
                  const value = index + 1;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setDifficulty(value)}
                      className={difficulty === value ? "gauss-mode gauss-mode-active" : "gauss-mode"}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="practice-stats">
              <div className="practice-stat-card">
                <strong>{stats.attempts}</strong>
                <span>{t.practice.statsAttempts}</span>
              </div>
              <div className="practice-stat-card">
                <strong>{stats.correct}</strong>
                <span>{t.practice.statsCorrect}</span>
              </div>
            </div>

            <div className="gauss-actions">
              <button
                type="button"
                onClick={createNewExercise}
                className="showcase-action showcase-action-primary"
              >
                {t.practice.newExercise}
              </button>
            </div>
          </section>

          <section className="showcase-panel showcase-card practice-result-card animate-defil">
            <h2 className="showcase-section-title">{t.practice.exerciseTitle}</h2>

            <div className="practice-exercise-card">
              <div className="practice-exercise-head">
                <span className="practice-chip">{categories.find((item) => item.id === category)?.label}</span>
                <span className="practice-chip">{difficultyLabels[difficulty - 1]}</span>
              </div>

              <RichContent
                as="div"
                className="practice-statement"
                html={exercise.statementLatex}
                enableMathCopy={false}
              />
            </div>

            <div className="practice-answer-block">
              <label htmlFor="practice-answer" className="practice-label">
                {t.practice.answerLabel}
              </label>
              <input
                id="practice-answer"
                type="text"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder={t.practice.answerPlaceholder}
                className="practice-answer-input"
                autoComplete="off"
              />
              <p className="gauss-help">{answerHelp}</p>
            </div>

            <div className="gauss-actions">
              <button
                type="button"
                onClick={checkAnswer}
                className="showcase-action showcase-action-primary"
              >
                {t.practice.checkAnswer}
              </button>
              <button
                type="button"
                onClick={revealAnswer}
                className="showcase-action showcase-action-secondary"
              >
                {t.practice.revealAnswer}
              </button>
              <button
                type="button"
                onClick={createNewExercise}
                className="showcase-action showcase-action-link"
              >
                {t.practice.nextExercise}
              </button>
            </div>

            {feedback && (
              <div className="gauss-summary">
                <p className="gauss-summary-label">{t.practice.feedbackTitle}</p>
                <span className={feedbackClass(feedback.type)}>{feedback.message}</span>
              </div>
            )}

            {revealed && (
              <>
                <div className="gauss-block">
                  <h3 className="gauss-block-title">{t.practice.answerTitle}</h3>
                  <div className="gauss-solution-card">
                    <RichContent
                      as="div"
                      className="gauss-math"
                      html={exercise.answerLatex}
                      enableMathCopy={false}
                    />
                  </div>
                </div>

                <div className="gauss-block">
                  <h3 className="gauss-block-title">{t.practice.correctionTitle}</h3>
                  <div className="gauss-solution-card">
                    <RichContent
                      as="div"
                      className="gauss-math practice-correction"
                      html={exercise.correctionLatex}
                      enableMathCopy={false}
                    />
                  </div>
                </div>
              </>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}
