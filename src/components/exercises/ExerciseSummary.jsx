import { useEffect, useRef } from "react";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import MathRenderer from "./MathRenderer";
import ScorePanel from "./ScorePanel";
import { localize } from "../../exercises/core/localize";
import { sessionSummary } from "../../exercises/core/session";

function formatElapsed(milliseconds) {
  const seconds = milliseconds / 1000;
  return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)} s`;
}

function formatSubmittedAnswer(value, labels) {
  if (value === undefined || value === null || value === "") {
    return labels.noAnswer;
  }

  if (Array.isArray(value)) {
    return value.map((item) => Array.isArray(item) ? item.join(" ; ") : item).join(" | ");
  }

  if (typeof value === "object") {
    return Object.values(value).map((item) => String(item ?? "")).join(" ; ");
  }

  return String(value);
}

function attemptTone(attempt) {
  if (attempt.unanswered || attempt.timing === "expired") return "timeout";
  if (attempt.correct && attempt.timedOut) return "late";
  return attempt.correct ? "correct" : "incorrect";
}

function TimeChart({ attempts, labels }) {
  const chartWidth = Math.max(620, attempts.length * 72);
  const chartHeight = 176;
  const horizontalPadding = 42;
  const topPadding = 30;
  const bottomPadding = 30;
  const maximum = Math.max(1, ...attempts.map((attempt) => attempt.elapsedMs));
  const usableWidth = chartWidth - horizontalPadding * 2;
  const usableHeight = chartHeight - topPadding - bottomPadding;
  const points = attempts.map((attempt, index) => {
    const x = attempts.length === 1
      ? chartWidth / 2
      : horizontalPadding + (index / (attempts.length - 1)) * usableWidth;
    const y = topPadding + (1 - attempt.elapsedMs / maximum) * usableHeight;
    return { attempt, x, y };
  });
  const pointList = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const areaPoints = `${horizontalPadding},${chartHeight - bottomPadding} ${pointList} ${chartWidth - horizontalPadding},${chartHeight - bottomPadding}`;

  return (
    <section className="exercise-summary-section exercise-summary-times">
      <header className="exercise-summary-section-heading">
        <span className="exercise-summary-section-icon"><ChartBarIcon /></span>
        <div>
          <h3>{labels.responseTimes}</h3>
          <p>{labels.responseTimesLead}</p>
        </div>
      </header>

      <div className="exercise-time-line-chart" role="img" aria-label={labels.responseTimes}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ "--exercise-time-chart-width": `${chartWidth}px` }}
        >
          <defs>
            <linearGradient id="exercise-time-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#2563eb" stopOpacity="0.2" />
              <stop offset="1" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((position) => {
            const y = topPadding + position * usableHeight;
            return <line key={position} className="exercise-time-chart-gridline" x1={horizontalPadding} x2={chartWidth - horizontalPadding} y1={y} y2={y} />;
          })}
          <polygon className="exercise-time-chart-area" points={areaPoints} />
          <polyline className="exercise-time-chart-line" points={pointList} />
          {points.map(({ attempt, x, y }) => (
            <g className="exercise-time-chart-point" key={attempt.number}>
              <circle className={`exercise-time-chart-dot exercise-time-chart-dot-${attemptTone(attempt)}`} cx={x} cy={y} r="6" />
              <text className="exercise-time-chart-time" x={x} y={Math.max(13, y - 11)} textAnchor="middle">{formatElapsed(attempt.elapsedMs)}</text>
              <text className="exercise-time-chart-question" x={x} y={chartHeight - 9} textAnchor="middle">Q{attempt.number}</text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

export default function ExerciseSummary({
  session,
  labels,
  lang,
  toolTitle,
  onReturn,
  onRestart,
  allowRestart = true,
}) {
  const dashboardRef = useRef(null);
  const summary = sessionSummary(session);
  const attempts = summary.attempts ?? [];
  const mistakes = attempts.filter((attempt) => !attempt.correct);

  useEffect(() => {
    if (dashboardRef.current) {
      dashboardRef.current.scrollTop = 0;
    }
  }, []);

  return (
    <section ref={dashboardRef} className="showcase-panel showcase-card exercise-complete exercise-summary-dashboard">
      <header className="exercise-summary-hero">
        <div>
          <p className="showcase-eyebrow">{labels.seriesComplete}</p>
          <h2>{summary.correct} / {summary.completed}</h2>
          <p>{labels.summaryLead}</p>
        </div>
        <div
          className="exercise-summary-rate"
          style={{ "--exercise-summary-rate": `${summary.successRate * 3.6}deg` }}
          aria-label={`${labels.successRate} : ${summary.successRate}%`}
        >
          <strong>{summary.successRate}%</strong>
          <span>{labels.successRate}</span>
        </div>
      </header>

      <ScorePanel session={session} labels={labels} />

      {attempts.length > 0 && <TimeChart attempts={attempts} labels={labels} />}

      <section className="exercise-summary-section exercise-summary-review">
        <header className="exercise-summary-section-heading">
          <span className="exercise-summary-section-icon exercise-summary-section-icon-error"><XCircleIcon /></span>
          <div>
            <h3>{labels.reviewMistakes}</h3>
            <p>{mistakes.length > 0 ? labels.reviewMistakesLead : labels.noMistakes}</p>
          </div>
        </header>

        {mistakes.length > 0 && (
          <div className="exercise-summary-mistakes">
            {mistakes.map((attempt) => (
              <article className="exercise-summary-mistake" key={attempt.number}>
                <header>
                  <strong>{labels.question} {attempt.number}</strong>
                  <span><ClockIcon />{formatElapsed(attempt.elapsedMs)}</span>
                </header>
                <MathRenderer
                  className="exercise-summary-mistake-prompt"
                  content={localize(attempt.prompt, lang)}
                  trustedHtml={Boolean(attempt.trustedHtml)}
                />
                <div className="exercise-summary-answer-comparison">
                  <p>
                    <span>{labels.yourAnswer}</span>
                    <strong>{formatSubmittedAnswer(attempt.submittedAnswer, labels)}</strong>
                  </p>
                  <div>
                    <span>{labels.expectedAnswer}</span>
                    <MathRenderer content={localize(attempt.expectedAnswer, lang)} trustedHtml />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="exercise-summary-actions">
        <button type="button" className="showcase-action showcase-action-secondary" onClick={onReturn}>
          <ArrowLeftIcon />
          {labels.backToTool} {toolTitle}
        </button>
        {allowRestart && (
          <button type="button" className="showcase-action showcase-action-primary" onClick={onRestart}>
            <ArrowPathIcon />
            {labels.restart}
          </button>
        )}
      </footer>
    </section>
  );
}
