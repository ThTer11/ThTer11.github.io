import { useEffect, useRef, useState } from "react";
import { CheckIcon, XMarkIcon, ClockIcon, FireIcon } from "@heroicons/react/24/solid";
import { sessionSummary } from "../../exercises/core/session";

function formatTime(milliseconds) {
  return `${(milliseconds / 1000).toFixed(1)} s`;
}

function StreakValue({ value, lost = false }) {
  const showsFlame = value > 0 || lost;

  return (
    <strong className={`exercise-score-value${showsFlame ? " exercise-score-value-with-flame" : ""}`}>
      <span className="exercise-score-value-number">{value}</span>
      <span className="exercise-streak-flame-slot" aria-hidden="true">
        {value > 0 && <FireIcon className="exercise-streak-flame" />}
        {lost && value === 0 && (
          <FireIcon className="exercise-streak-flame exercise-streak-flame-lost" />
        )}
      </span>
    </strong>
  );
}

export default function ScorePanel({ session, labels, compact = false, final = false }) {
  const summary = sessionSummary(session);
  const isTimed = session.isTimed || summary.timedCompleted > 0;
  const previousStreak = useRef(summary.streak);
  const [streakLost, setStreakLost] = useState(false);

  useEffect(() => {
    const hasJustLostStreak = previousStreak.current > 0 && summary.streak === 0;
    previousStreak.current = summary.streak;

    if (!hasJustLostStreak) {
      setStreakLost(false);
      return undefined;
    }

    setStreakLost(true);
    const timeout = window.setTimeout(() => setStreakLost(false), 700);
    return () => window.clearTimeout(timeout);
  }, [summary.streak]);

  if (compact) {
    const counters = [
      { kind: "correct", value: summary.correct, label: labels.correct, Icon: CheckIcon },
      { kind: "streak", value: final ? summary.bestStreak : summary.streak, label: final ? labels.bestStreak : labels.streak, Icon: FireIcon },
      { kind: "error", value: summary.incorrect, label: labels.errors, Icon: XMarkIcon },
      ...(isTimed ? [{ kind: "timeout", value: summary.timedOut, label: labels.outOfTime, Icon: ClockIcon }] : []),
    ];
    return (
      <div className="exercise-score-grid exercise-score-grid-compact" style={{ "--exercise-score-columns": counters.length }}>
        {counters.map(({ kind, value, label, Icon }) => (
          <div
            key={kind}
            className={`exercise-score-item exercise-score-item-${kind}${kind === "streak" && streakLost ? " exercise-score-item-streak-lost" : ""}`}
            role="group"
            aria-label={`${label} : ${value}`}
            title={label}
          >
            <strong aria-hidden="true">{value}</strong>
            <Icon className={`exercise-score-counter-icon${kind === "streak" ? " exercise-streak-flame" : ""}`} aria-hidden="true" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="exercise-score-grid">
      <div className="exercise-score-item exercise-score-item-correct">
        <strong>{summary.correct}</strong>
        <span>{labels.correct}</span>
      </div>

      {isTimed && (
        <div className="exercise-score-item exercise-score-item-on-time">
          <strong>{summary.correctOnTime}</strong>
          <span>{labels.correctOnTime}</span>
        </div>
      )}

      <div className="exercise-score-item exercise-score-item-error">
        <strong>{summary.incorrect}</strong>
        <span>{labels.errors}</span>
      </div>

      {isTimed && (
        <div className="exercise-score-item exercise-score-item-timeout">
          <strong>{summary.timedOut}</strong>
          <span>{labels.outOfTime}</span>
        </div>
      )}

      {/* <div className="exercise-score-item">
        <strong>{summary.successRate}%</strong>
        <span>{labels.successRate}</span>
      </div> */}

      <div className="exercise-score-item exercise-score-item-streak">
        <StreakValue value={summary.bestStreak} />
        <span>{labels.bestStreak}</span>
      </div>

      {summary.totalAnswerTimeMs > 0 && (
        <div className="exercise-score-item">
          <strong>{formatTime(summary.averageTimeMs)}</strong>
          <span>{labels.averageTime}</span>
        </div>
      )}
    </div>
  );
}
