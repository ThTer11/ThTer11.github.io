import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpenIcon, ClockIcon } from "@heroicons/react/24/outline";
import AnswerInput, { emptyAnswerValue } from "./AnswerInput";
import CourseHintModal from "./CourseHintModal";
import ExerciseQuestionPrompt from "./ExerciseQuestionPrompt";
import FeedbackPanel from "./FeedbackPanel";
import ExerciseSummary from "./ExerciseSummary";
import MathRenderer from "./MathRenderer";
import ParabolaDiagram from "./ParabolaDiagram";
import ScorePanel from "./ScorePanel";
import Timer, { resolveTimerSeconds } from "./Timer";
import { createQuestionAvoidingDuplicates, pickStudyExercise } from "../../exercises/core/source";
import { resolveAnswerSpec } from "../../exercises/core/answerSpec";
import { localize } from "../../exercises/core/localize";
import { createSession, recordAttempt } from "../../exercises/core/session";
import { formatExpectedAnswer, validateAnswer } from "../../exercises/core/validators";
import { getExerciseUiText } from "../../exercises/content/uiText";
import { collectToolCourseHints } from "../../exercises/core/courseHints";
import {
  getExerciseVariants,
  normalizeExerciseLevels,
  resolveExerciseColor,
  resolveExerciseLevelId,
  resolveExerciseLevelValue,
  resolveExerciseVariantId,
} from "../../exercises/core/exerciseOptions";

function resolveDifficulty(tool) {
  return resolveExerciseVariantId(tool);
}

function resolveQuestionCount(tool) {
  if (tool.series === false) {
    return 1;
  }

  return tool.series?.questionCount ?? 10;
}

function resolveQuestionCountRange(tool) {
  const defaultCount = resolveQuestionCount(tool);
  const configuredChoices = [...new Set((tool.series?.choices ?? [])
    .map(Number)
    .filter((choice) => Number.isInteger(choice) && choice > 0))]
    .sort((left, right) => left - right);
  const mode = tool.series?.questionCountMode ?? (configuredChoices.length > 0 ? "choices" : "continuous");
  const configuredMinimum = Number(tool.series?.minQuestions);
  const configuredMaximum = Number(tool.series?.maxQuestions);
  const configuredStep = Number(tool.series?.questionStep);
  const minimum = Number.isInteger(configuredMinimum) && configuredMinimum > 0
    ? configuredMinimum
    : 1;
  const choicesMaximum = configuredChoices.length > 0
    ? Math.max(...configuredChoices)
    : Math.max(defaultCount, 20);
  const maximum = Number.isInteger(configuredMaximum) && configuredMaximum >= minimum
    ? configuredMaximum
    : Math.max(minimum, choicesMaximum, defaultCount);
  const step = Number.isInteger(configuredStep) && configuredStep > 0 ? configuredStep : 1;

  return { choices: configuredChoices, minimum, maximum, mode, step };
}

function settingsStorageKey(tool) {
  return typeof tool.persistSettings === "string"
    ? tool.persistSettings
    : `exercise-settings:${tool.id}`;
}

function resolveInitialSettings(tool) {
  const defaultDifficulty = resolveDifficulty(tool);
  const defaults = {
    difficulty: defaultDifficulty,
    exerciseLevel: resolveExerciseLevelId(tool, defaultDifficulty),
    questionCount: resolveQuestionCount(tool),
  };

  if (!tool.persistSettings || typeof localStorage === "undefined") {
    return defaults;
  }

  try {
    const stored = JSON.parse(localStorage.getItem(settingsStorageKey(tool)) ?? "null");
    if (!stored || typeof stored !== "object") {
      return defaults;
    }

    const variantIds = getExerciseVariants(tool).map((variant) => variant.id);
    const difficulty = variantIds.includes(stored.difficulty)
      ? stored.difficulty
      : defaults.difficulty;
    const exerciseLevel = resolveExerciseLevelId(tool, difficulty, stored.exerciseLevel);
    const storedCount = Number(stored.questionCount);
    const countRange = resolveQuestionCountRange(tool);
    const countInRange = storedCount >= countRange.minimum && storedCount <= countRange.maximum;
    const countMatchesStep = (storedCount - countRange.minimum) % countRange.step === 0;
    const countIsAllowed = countRange.mode === "choices" && countRange.choices.length > 0
      ? countRange.choices.includes(storedCount)
      : countInRange && countMatchesStep;
    const questionCount = Number.isInteger(storedCount) && countIsAllowed
      ? storedCount
      : defaults.questionCount;

    return { difficulty, exerciseLevel, questionCount };
  } catch (_) {
    return defaults;
  }
}

function answerIsEmpty(value) {
  if (Array.isArray(value)) {
    return value.flat(Infinity).every((item) => String(item ?? "").trim() === "");
  }

  if (value && typeof value === "object") {
    return Object.values(value).every((item) => String(item ?? "").trim() === "");
  }

  return String(value ?? "").trim() === "";
}

function getExerciseTimerSetting(tool, exerciseId) {
  return getExerciseVariants(tool).find((variant) => variant.id === exerciseId)?.timer;
}

function getTimer(tool, question, exerciseId) {
  if (question?.timer === false) {
    return false;
  }

  const exerciseTimer = getExerciseTimerSetting(tool, exerciseId);
  if (exerciseTimer === false && !question?.timer) {
    return false;
  }

  if (!tool.timer && !exerciseTimer && !question?.timer) {
    return false;
  }

  return {
    enabled: true,
    mode: "per-question",
    strict: false,
    show: true,
    ...(tool.timer || {}),
    ...(exerciseTimer && typeof exerciseTimer === "object" ? exerciseTimer : {}),
    ...(question?.timer || {}),
  };
}

function exerciseHasTimer(tool, variant) {
  if (variant.timer === false) {
    return false;
  }

  const timer = getTimer(tool, null, variant.id);
  if (!timer || timer.enabled === false || timer.show === false) {
    return false;
  }

  const levels = normalizeExerciseLevels(variant);
  if (levels.length === 0) {
    return resolveTimerSeconds(timer, variant.id) > 0;
  }

  return levels.some((level) => resolveTimerSeconds(timer, variant.id, level.value) > 0);
}

function SetupPanel({
  tool,
  lang,
  labels,
  difficulty,
  exerciseLevel,
  onSelectExercise,
  questionCount,
  setQuestionCount,
  onStart,
  onOpenCourseOverview,
  courseReminderCount = 0,
}) {
  const countRange = resolveQuestionCountRange(tool);
  const exerciseVariants = getExerciseVariants(tool);
  const usesExerciseVariants = Array.isArray(tool.exercises);
  const usesCompactOptionGrid = exerciseVariants.length >= 5;
  const usesDiscreteQuestionCounts = countRange.mode === "choices" && countRange.choices.length > 0;
  const selectedCountIndex = usesDiscreteQuestionCounts
    ? Math.max(0, countRange.choices.indexOf(questionCount))
    : 0;
  const sliderMinimum = usesDiscreteQuestionCounts ? 0 : countRange.minimum;
  const sliderMaximum = usesDiscreteQuestionCounts ? countRange.choices.length - 1 : countRange.maximum;
  const sliderStep = usesDiscreteQuestionCounts ? 1 : countRange.step;
  const sliderValue = usesDiscreteQuestionCounts ? selectedCountIndex : questionCount;
  const displayedMinimum = usesDiscreteQuestionCounts ? countRange.choices[0] : countRange.minimum;
  const displayedMaximum = usesDiscreteQuestionCounts
    ? countRange.choices[countRange.choices.length - 1]
    : countRange.maximum;
  const countProgress = sliderMaximum === sliderMinimum
    ? 100
    : ((sliderValue - sliderMinimum) / (sliderMaximum - sliderMinimum)) * 100;
  const countInputId = `exercise-question-count-${tool.id}`;
  const updateQuestionCount = (rawValue) => {
    const nextValue = Number(rawValue);
    setQuestionCount(usesDiscreteQuestionCounts ? countRange.choices[nextValue] : nextValue);
  };

  return (
    
    <section className="showcase-panel showcase-card exercise-setup">
      {exerciseVariants.length > 0 ? (
        <fieldset className="exercise-settings-group">
          <legend>{usesExerciseVariants ? labels.exerciseChoice : labels.level}</legend>
          <div className={usesCompactOptionGrid ? "exercise-level-grid exercise-level-grid-compact" : "exercise-level-grid"}>
            {exerciseVariants.map((variant) => {
              const selected = difficulty === variant.id;
              const levels = normalizeExerciseLevels(variant);
              const timed = exerciseHasTimer(tool, variant);
              const cardClassName = [
                "exercise-option-card",
                selected ? "exercise-option-card-active" : "",
                levels.length > 0 ? "exercise-option-card-with-levels" : "exercise-option-card-no-levels",
              ].filter(Boolean).join(" ");

              return (
                <div
                  key={variant.id}
                  className={cardClassName}
                  style={{ "--exercise-option-accent": resolveExerciseColor(variant.color) }}
                >
                  <button
                    type="button"
                    className={[
                      "exercise-level",
                      selected ? "exercise-level-active" : "",
                      timed ? "exercise-level-timed" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => onSelectExercise(variant.id)}
                    aria-pressed={selected}
                  >
                    {timed && (
                      <span className="exercise-option-timer" aria-label={labels.timed} title={labels.timed}>
                        <ClockIcon />
                      </span>
                    )}
                    <MathRenderer as="strong" content={localize(variant.label, lang)} />
                    {variant.description && <MathRenderer as="span" content={localize(variant.description, lang)} />}
                  </button>

                  {levels.length > 0 && (
                    <div className="exercise-option-levels" role="group" aria-label={`${labels.level} — ${localize(variant.label, lang)}`}>
                      <span>{labels.level}</span>
                      <div className="exercise-option-level-dots">
                        {levels.map((level) => {
                          const levelSelected = selected && String(exerciseLevel) === level.id;
                          return (
                            <button
                              key={level.id}
                              type="button"
                              className={levelSelected ? "exercise-option-level-dot exercise-option-level-dot-active" : "exercise-option-level-dot"}
                              onClick={() => onSelectExercise(variant.id, level.id)}
                              aria-pressed={levelSelected}
                              aria-label={`${labels.level} ${localize(level.label, lang)}`}
                            >
                              {localize(level.label, lang)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <p className="exercise-muted">{labels.noLevel}</p>
      )}

      {tool.series !== false && (
        <div className={usesDiscreteQuestionCounts ? "exercise-count-selector exercise-count-selector-discrete" : "exercise-count-selector"}>
          <div className="exercise-count-heading">
            <label htmlFor={countInputId}>{labels.questions}</label>
            <output htmlFor={countInputId}>{questionCount}</output>
          </div>
          <div className="exercise-count-range-row">
            <span aria-hidden="true">{displayedMinimum}</span>
            <div className="exercise-count-slider-shell">
              <input
                id={countInputId}
                className="exercise-count-range"
                type="range"
                min={sliderMinimum}
                max={sliderMaximum}
                step={sliderStep}
                value={sliderValue}
                style={{ "--exercise-count-progress": `${countProgress}%` }}
                onChange={(event) => updateQuestionCount(event.target.value)}
                disabled={tool.series?.allowQuestionCount === false || sliderMinimum === sliderMaximum}
                aria-label={labels.questions}
                aria-valuetext={String(questionCount)}
              />
              {usesDiscreteQuestionCounts && (
                <div className="exercise-count-ticks" aria-hidden="true">
                  {countRange.choices.map((choice) => (
                    <span
                      key={choice}
                      className={choice === questionCount ? "exercise-count-tick-active" : undefined}
                      data-value={choice}
                    >
                      |
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span aria-hidden="true">{displayedMaximum}</span>
          </div>
        </div>
      )}

      <div className="exercise-setup-actions">
        <button type="button" className="showcase-action showcase-action-primary exercise-primary-action" onClick={onStart}>
          {labels.start}
        </button>
        {courseReminderCount > 0 && (
          <button type="button" className="showcase-action showcase-action-secondary exercise-course-overview-button" onClick={onOpenCourseOverview}>
            <BookOpenIcon className="exercise-small-icon" />
            {labels.viewCourseReminders}
            <span className="exercise-course-overview-count">{courseReminderCount}</span>
          </button>
        )}
      </div>
    </section>
  );
}

function StudyEngine({ tool, lang, courseHints }) {
  const labels = getExerciseUiText(lang);
  const [difficulty, setDifficulty] = useState(resolveDifficulty(tool));
  const [exerciseLevel, setExerciseLevel] = useState(() => resolveExerciseLevelId(tool, resolveDifficulty(tool)));
  const [started, setStarted] = useState(false);
  const [exercise, setExercise] = useState(null);
  const [hintCount, setHintCount] = useState(0);
  const [solutionVisible, setSolutionVisible] = useState(false);
  const [openHint, setOpenHint] = useState(null);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const overviewHints = useMemo(
    () => collectToolCourseHints(tool, courseHints),
    [courseHints, tool],
  );

  const chooseExercise = useCallback(() => {
    const selectedLevel = resolveExerciseLevelValue(tool, difficulty, exerciseLevel);
    setExercise(pickStudyExercise(tool, difficulty, Math.random, selectedLevel));
    setHintCount(0);
    setSolutionVisible(false);
    setStarted(true);
  }, [difficulty, exerciseLevel, tool]);
  const selectExercise = useCallback((variantId, levelId) => {
    setDifficulty(variantId);
    setExerciseLevel(levelId !== undefined
      ? resolveExerciseLevelId(tool, variantId, levelId)
      : resolveExerciseLevelId(tool, variantId));
  }, [tool]);

  if (!started || !exercise) {
    return (
      <>
        <SetupPanel
          tool={{ ...tool, series: false }}
          lang={lang}
          labels={labels}
          difficulty={difficulty}
          exerciseLevel={exerciseLevel}
          onSelectExercise={selectExercise}
          questionCount={1}
          setQuestionCount={() => {}}
          onStart={chooseExercise}
          onOpenCourseOverview={() => setOverviewOpen(true)}
          courseReminderCount={overviewHints.length}
        />
        {overviewOpen && (
          <CourseHintModal hints={overviewHints} lang={lang} labels={labels} onClose={() => setOverviewOpen(false)} />
        )}
      </>
    );
  }

  const hints = exercise.hints ?? [];
  const exerciseVariant = getExerciseVariants(tool).find((variant) => variant.id === difficulty);
  const questionPromptUi = exercise.promptUi ?? exerciseVariant?.promptUi ?? tool.promptUi;

  return (
    <section className="showcase-panel showcase-card exercise-workspace">
      <div className="exercise-question-heading">
        <span className="exercise-mode-badge">{labels.studyMode}</span>
      </div>
      <div className="exercise-question-frame">
        <ExerciseQuestionPrompt
          content={localize(exercise.statement ?? exercise.prompt, lang)}
          lang={lang}
          promptUi={questionPromptUi}
          trustedHtml={Boolean(exercise.trustedHtml)}
        />
      </div>
      {exercise.diagram?.type === "parabola" && <ParabolaDiagram diagram={exercise.diagram} />}

      {hintCount > 0 && (
        <div className="exercise-study-hints">
          {hints.slice(0, hintCount).map((hint, index) => (
            <div key={index} className="exercise-study-hint">
              <strong>{labels.hint} {index + 1}</strong>
              <MathRenderer content={localize(hint, lang)} />
            </div>
          ))}
        </div>
      )}

      {solutionVisible && (
        <div className="exercise-study-solution">
          <h3>{labels.correction}</h3>
          <MathRenderer content={localize(exercise.solution, lang)} trustedHtml={Boolean(exercise.solutionTrustedHtml)} />
          {exercise.insight && (
            <div className="exercise-insight">
              <h3>{labels.insight}</h3>
              <MathRenderer content={localize(exercise.insight, lang)} />
            </div>
          )}
        </div>
      )}

      <div className="exercise-action-row">
        {hintCount < hints.length && (
          <button type="button" className="showcase-action showcase-action-secondary" onClick={() => setHintCount((count) => count + 1)}>
            {hintCount === 0 ? labels.hint : labels.nextHint}
          </button>
        )}
        <button type="button" className="showcase-action showcase-action-primary" onClick={() => setSolutionVisible((visible) => !visible)}>
          {solutionVisible ? labels.hideSolution : labels.showSolution}
        </button>
        <button type="button" className="showcase-action showcase-action-link" onClick={chooseExercise}>
          {labels.anotherExercise}
        </button>
      </div>

      {(exercise.courseHintIds ?? []).length > 0 && (
        <button type="button" className="exercise-course-link" onClick={() => setOpenHint(exercise.courseHintIds[0])}>
          {labels.courseReminder}
        </button>
      )}

      {openHint && courseHints[openHint] && (
        <CourseHintModal hint={courseHints[openHint]} lang={lang} labels={labels} onClose={() => setOpenHint(null)} />
      )}
    </section>
  );
}

export default function ExerciseEngine({
  tool,
  lang = "fr",
  courseHints = {},
  onPhaseChange,
}) {
  const labels = getExerciseUiText(lang);
  const [initialSettings] = useState(() => resolveInitialSettings(tool));
  const [phase, setPhase] = useState("setup");
  const [difficulty, setDifficulty] = useState(initialSettings.difficulty);
  const [exerciseLevel, setExerciseLevel] = useState(initialSettings.exerciseLevel);
  const [questionCount, setQuestionCount] = useState(initialSettings.questionCount);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [outcome, setOutcome] = useState(null);
  const [inputError, setInputError] = useState("");
  const [session, setSession] = useState(() => createSession(resolveQuestionCount(tool)));
  const [questionStartedAt, setQuestionStartedAt] = useState(0);
  const [timerExpired, setTimerExpired] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [openHint, setOpenHint] = useState(null);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const submittingRef = useRef(false);
  const deadlineRef = useRef(null);
  const seriesDeadlineRef = useRef(null);
  const questionSignaturesRef = useRef(new Set());

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [onPhaseChange, phase]);

  const answerSpec = useMemo(
    () => resolveAnswerSpec(tool.answer, question?.answer),
    [question?.answer, tool.answer],
  );
  const timer = getTimer(tool, question, difficulty);
  const scoreEnabled = tool.score !== false && tool.score?.enabled !== false;
  const statisticsEnabled = tool.statistics === true || tool.statistics?.enabled === true || (
    tool.statistics === undefined && scoreEnabled
  );
  const autoNext = tool.feedback?.autoNext ?? tool.series?.autoAdvance;
  const overviewHints = useMemo(
    () => collectToolCourseHints(tool, courseHints),
    [courseHints, tool],
  );
  const selectedExerciseLevel = useMemo(
    () => resolveExerciseLevelValue(tool, difficulty, exerciseLevel),
    [difficulty, exerciseLevel, tool],
  );
  const selectedExerciseVariant = useMemo(
    () => getExerciseVariants(tool).find((variant) => variant.id === difficulty),
    [difficulty, tool],
  );
  const selectExercise = useCallback((variantId, levelId) => {
    setExerciseLevel((currentLevel) => {
      if (levelId !== undefined) {
        return resolveExerciseLevelId(tool, variantId, levelId);
      }

      return difficulty === variantId
        ? currentLevel
        : resolveExerciseLevelId(tool, variantId);
    });
    setDifficulty(variantId);
  }, [difficulty, tool]);

  const prepareQuestion = useCallback(() => {
    try {
      const generated = createQuestionAvoidingDuplicates(
        tool,
        difficulty,
        Math.random,
        selectedExerciseLevel,
        questionSignaturesRef.current,
      );
      const nextQuestion = generated.question;
      const nextSpec = resolveAnswerSpec(tool.answer, nextQuestion.answer);
      setQuestion(nextQuestion);
      setAnswer(emptyAnswerValue(nextSpec, nextQuestion));
      setOutcome(null);
      setInputError("");
      setTimerExpired(false);
      setHintCount(0);
      const startedAt = Date.now();
      const nextTimer = getTimer(tool, nextQuestion, difficulty);
      const durationMs = resolveTimerSeconds(nextTimer, difficulty, selectedExerciseLevel) * 1000;

      if (nextTimer?.mode === "series") {
        if (!seriesDeadlineRef.current && durationMs > 0) {
          seriesDeadlineRef.current = startedAt + durationMs;
        }
        deadlineRef.current = seriesDeadlineRef.current;
      } else {
        deadlineRef.current = durationMs > 0 ? startedAt + durationMs : null;
      }

      setQuestionStartedAt(startedAt);
      setGenerationError("");
      submittingRef.current = false;
      questionSignaturesRef.current.add(generated.signature);
      return true;
    } catch (error) {
      setGenerationError(error.message);
      return false;
    }
  }, [difficulty, selectedExerciseLevel, tool]);

  const start = () => {
    const newSession = createSession(questionCount);
    deadlineRef.current = null;
    seriesDeadlineRef.current = null;
    questionSignaturesRef.current = new Set();
    setSession(newSession);
    if (prepareQuestion()) {
      setPhase("active");
    }

    if (tool.persistSettings) {
      try {
        localStorage.setItem(settingsStorageKey(tool), JSON.stringify({ difficulty, exerciseLevel, questionCount }));
      } catch (_) {
        // Training remains fully usable when storage is unavailable.
      }
    }
  };

  const advance = useCallback(() => {
    if (session.completed >= questionCount) {
      setPhase("complete");
      return;
    }

    if (prepareQuestion()) {
      setPhase("active");
    }
  }, [prepareQuestion, questionCount, session.completed]);

  const commitOutcome = useCallback((nextOutcome) => {
    const elapsed = questionStartedAt ? Date.now() - questionStartedAt : 0;
    setOutcome(nextOutcome);
    setSession((current) => recordAttempt(current, nextOutcome, elapsed, {
      prompt: question?.prompt,
      trustedHtml: Boolean(question?.trustedHtml),
      submittedAnswer: answer,
      expectedAnswer: formatExpectedAnswer(question?.expected, answerSpec, question, lang),
    }));
    setPhase("feedback");
    submittingRef.current = true;
  }, [answer, answerSpec, lang, question, questionStartedAt]);

  const submit = (event) => {
    event?.preventDefault();

    if (phase === "feedback") {
      advance();
      return;
    }

    if (phase !== "active" || submittingRef.current) {
      return;
    }

    if (answerIsEmpty(answer)) {
      setInputError(labels.answerPlaceholder);
      return;
    }

    const submittedAt = Date.now();
    const timing = deadlineRef.current
      ? (submittedAt < deadlineRef.current ? "on-time" : "late")
      : "untimed";
    let nextOutcome = validateAnswer(answer, answerSpec, question.expected, question, lang);
    if (nextOutcome.status === "invalid") {
      setInputError(nextOutcome.message);
      return;
    }

    nextOutcome = {
      ...nextOutcome,
      submitted: true,
      timing,
      timedOut: timing === "late",
      status: nextOutcome.correct && timing === "late" ? "late-correct" : nextOutcome.status,
      message: nextOutcome.correct && timing === "late"
        ? labels.correctButLate
        : nextOutcome.message,
      timingMessage: !nextOutcome.correct && timing === "late"
        ? labels.incorrectAndLate
        : undefined,
    };

    setInputError("");
    commitOutcome(nextOutcome);
  };

  const handleExpire = useCallback(() => {
    if (!timer || !["active", "feedback"].includes(phase)) {
      return;
    }

    if (timer.mode === "series" && phase === "feedback") {
      if (timer.strict) {
        setPhase("complete");
      }
      return;
    }

    if (phase !== "active" || submittingRef.current) {
      return;
    }

    setTimerExpired(true);

    if (!timer.strict) {
      return;
    }

    const expiredOutcome = {
      correct: false,
      status: "timeout",
      message: labels.timeExpiredNoAnswer,
      submitted: false,
      timing: "expired",
      timedOut: true,
      unanswered: true,
    };
    commitOutcome(expiredOutcome);

    if (timer.mode === "series") {
      window.setTimeout(() => setPhase("complete"), 0);
    }
  }, [commitOutcome, labels.timeExpiredNoAnswer, phase, timer]);

  useEffect(() => {
    const autoNextConfig = autoNext === true ? { enabled: true } : autoNext;

    if (phase !== "feedback" || !autoNextConfig?.enabled) {
      return undefined;
    }

    const onlyCorrect = autoNextConfig.onlyCorrect !== false;
    if (onlyCorrect && !outcome?.correct) {
      return undefined;
    }

    const timeout = window.setTimeout(advance, autoNextConfig.delayMs ?? 800);
    return () => window.clearTimeout(timeout);
  }, [advance, autoNext, outcome?.correct, phase]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === "Enter" &&
        phase === "feedback" &&
        !event.shiftKey &&
        !openHint &&
        event.target?.tagName !== "BUTTON"
      ) {
        event.preventDefault();
        advance();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [advance, openHint, phase]);

  if (tool.mode === "study") {
    return <StudyEngine tool={tool} lang={lang} courseHints={courseHints} />;
  }

  if (phase === "setup") {
    return (
      <>
        <SetupPanel
          tool={tool}
          lang={lang}
          labels={labels}
          difficulty={difficulty}
          exerciseLevel={exerciseLevel}
          onSelectExercise={selectExercise}
          questionCount={questionCount}
          setQuestionCount={setQuestionCount}
          onStart={start}
          onOpenCourseOverview={() => setOverviewOpen(true)}
          courseReminderCount={overviewHints.length}
        />
        {generationError && <p className="exercise-inline-error">{generationError}</p>}
        {overviewOpen && (
          <CourseHintModal hints={overviewHints} lang={lang} labels={labels} onClose={() => setOverviewOpen(false)} />
        )}
      </>
    );
  }

  if (phase === "complete") {
    return (
      <ExerciseSummary
        session={session}
        labels={labels}
        lang={lang}
        toolTitle={localize(tool.title, lang)}
        onReturn={() => setPhase("setup")}
        onRestart={start}
        allowRestart={tool.series?.allowRestart !== false}
      />
    );
  }

  if (!question) {
    return <p className="exercise-inline-error">{generationError || labels.unavailable}</p>;
  }

  const progress = Math.min(questionCount, session.completed + (phase === "active" ? 1 : 0));
  const currentQuestionNumber = phase === "feedback"
    ? session.completed
    : session.completed + 1;
  const timerResetKey = timer?.mode === "series" ? "series" : questionStartedAt;
  const timerPaused = timer?.mode === "series"
    ? !["active", "feedback"].includes(phase)
    : phase !== "active";
  const liveScorePanel = (scoreEnabled || statisticsEnabled) && (
    <div className="exercise-live-score">
      <h2>{scoreEnabled ? labels.score : labels.statistics}</h2>
      {statisticsEnabled ? (
        <ScorePanel session={session} labels={labels} compact />
      ) : (
        <p className="exercise-running-score">{session.correct} / {session.completed}</p>
      )}
    </div>
  );

  return (
    <>
      {liveScorePanel && (
        <section className="showcase-panel exercise-session-scorebar">
          {liveScorePanel}
        </section>
      )}

      <div className="exercise-session-layout">
        <section className="showcase-panel showcase-card exercise-workspace">
          <header className="exercise-question-heading">
            <div className="exercise-question-progress">
              <div className="exercise-question-counter">
                <span>{labels.question}</span>
                <strong>{Math.min(currentQuestionNumber, questionCount)}</strong>
                <span>/ {questionCount}</span>
              </div>
            <div
              className="exercise-progress-track"
              role="progressbar"
              aria-label={labels.progress}
              aria-valuemin="0"
              aria-valuemax={questionCount}
              aria-valuenow={progress}
            >
              <span style={{ width: `${(progress / questionCount) * 100}%` }} />
            </div>
            </div>
            {timer && (
              <Timer
                timer={timer}
                difficulty={difficulty}
                level={selectedExerciseLevel}
                resetKey={timerResetKey}
                paused={timerPaused}
                onExpire={handleExpire}
                labels={labels}
              />
            )}
          </header>

          <div className="exercise-question-frame">
            <ExerciseQuestionPrompt
              content={localize(question.prompt, lang)}
              lang={lang}
              promptUi={question.promptUi ?? selectedExerciseVariant?.promptUi ?? tool.promptUi}
              trustedHtml={Boolean(question.trustedHtml)}
            />
          </div>
          {question.diagram?.type === "parabola" && <ParabolaDiagram diagram={question.diagram} />}

          {tool.feedback?.showHints !== false && hintCount > 0 && (question.hints ?? []).slice(0, hintCount).map((hint, index) => (
            <div key={index} className="exercise-study-hint">
              <strong>{labels.hint} {index + 1}</strong>
              <MathRenderer content={localize(hint, lang)} />
            </div>
          ))}

          <form className="exercise-answer-form" onSubmit={submit}>
            <AnswerInput
              spec={answerSpec}
              question={question}
              value={answer}
              onChange={setAnswer}
              disabled={phase === "feedback"}
              lang={lang}
              labels={labels}
              focusKey={session.completed}
              onCommit={submit}
            />

            {timerExpired && timer?.strict !== true && phase === "active" && (
              <p className="exercise-answer-expired-note" role="status">
                <ClockIcon aria-hidden="true" />
                {labels.timeExpiredCanAnswer}
              </p>
            )}

            {inputError && <p className="exercise-inline-error" role="alert">{inputError}</p>}

            {phase === "active" && tool.feedback?.showHints !== false && hintCount < (question.hints ?? []).length && (
              <button type="button" className="exercise-hint-button" onClick={() => setHintCount((count) => count + 1)}>
                {hintCount === 0 ? labels.hint : labels.nextHint}
              </button>
            )}

            {phase === "active" && (
              <button type="submit" className="showcase-action showcase-action-primary exercise-primary-action">
                {labels.validate}
              </button>
            )}
          </form>
        </section>

        <aside className={`exercise-response-column${phase === "feedback" ? " exercise-response-column-feedback" : ""}`}>
          {phase === "feedback" ? (
            <FeedbackPanel
              outcome={outcome}
              question={question}
              answerSpec={answerSpec}
              lang={lang}
              labels={labels}
              feedback={tool.feedback}
              onOpenCourse={setOpenHint}
              onNext={advance}
              showNext={tool.feedback?.showNextButton !== false && tool.feedback?.nextQuestion !== false}
              session={session}
            />
          ) : (
            <div className="showcase-panel showcase-card exercise-response-placeholder">
              <span aria-hidden="true">✓</span>
              <p>{labels.feedbackPlaceholder}</p>
            </div>
          )}
        </aside>
      </div>

      {openHint && courseHints[openHint] && (
        <CourseHintModal hint={courseHints[openHint]} lang={lang} labels={labels} onClose={() => setOpenHint(null)} />
      )}
    </>
  );
}
