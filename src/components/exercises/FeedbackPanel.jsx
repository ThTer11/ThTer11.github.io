import {
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import MathRenderer from "./MathRenderer";
import { localize } from "../../exercises/core/localize";
import { formatExpectedAnswer } from "../../exercises/core/validators";

function feedbackPresentation(outcome, labels) {
  if (outcome.status === "timeout" || outcome.timing === "expired") {
    return {
      tone: "timeout",
      title: labels.feedbackTimeoutTitle,
      lead: labels.feedbackTimeoutLead,
      Icon: ClockIcon,
    };
  }

  if (outcome.correct && outcome.timing === "late") {
    return {
      tone: "late",
      title: labels.feedbackLateTitle,
      lead: labels.feedbackLateLead,
      Icon: ClockIcon,
    };
  }

  if (outcome.correct) {
    return {
      tone: "success",
      title: labels.feedbackCorrectTitle,
      lead: labels.feedbackCorrectLead,
      Icon: CheckIcon,
    };
  }

  if (outcome.status === "equivalent") {
    return {
      tone: "warning",
      title: labels.feedbackEquivalentTitle,
      lead: labels.feedbackEquivalentLead,
      Icon: ExclamationTriangleIcon,
    };
  }

  return {
    tone: "danger",
    title: labels.feedbackIncorrectTitle,
    lead: labels.feedbackIncorrectLead,
    Icon: XMarkIcon,
  };
}

export default function FeedbackPanel({
  outcome,
  question,
  answerSpec,
  lang,
  labels,
  feedback = {},
  onOpenCourse,
  onNext,
  showNext = false,
  session,
}) {
  if (!outcome) {
    return null;
  }

  const { tone, title, lead, Icon } = feedbackPresentation(outcome, labels);
  const showCorrection = feedback.showCorrection !== false;
  const showExplanation = feedback.showExplanation !== false && question.explanation;
  const showSolution = feedback.showSolution !== false && question.solution;
  const showInsight = feedback.showInsight !== false && question.insight;
  const hintIds = question.courseHintIds ?? [];
  const showCourseLinks = hintIds.length > 0 && (
    outcome.correct || feedback.showCourseHintOnError !== false
  );

  return (
    <section className={`exercise-feedback exercise-feedback-${tone}`}>
      <div
        className="exercise-feedback-announcement"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="exercise-feedback-icon" aria-hidden="true">
          <Icon />
          {tone === "success" && (
            <span className="exercise-feedback-sparkles">
              <i />
              <i />
              <i />
            </span>
          )}
        </span>
        <div className="exercise-feedback-heading">
          <h2 className="exercise-feedback-status">{title}</h2>
          <p className="exercise-feedback-lead">{lead}</p>
      {outcome.timingMessage && (
        <p className="exercise-feedback-timing-note"><ClockIcon />{outcome.timingMessage}</p>
      )}
        </div>
        {/* {outcome.correct && session?.streak >= 2 && (
          <span className="exercise-feedback-streak">
            {labels.streak} : {session.streak}
          </span>
        )} */}
      </div>

      

      <div className="exercise-feedback-body">
        {showCorrection && !outcome.correct && (
          <div className="exercise-feedback-block exercise-feedback-answer">
            <h3>{labels.expectedAnswer}</h3>
            <MathRenderer
              content={localize(formatExpectedAnswer(question.expected, answerSpec, question, lang), lang)}
              trustedHtml
            />
          </div>
        )}

        {showExplanation && (
          <div className="exercise-feedback-block exercise-feedback-details">
            <h3>{labels.explanation}</h3>
            <MathRenderer content={localize(question.explanation, lang)} trustedHtml={Boolean(question.explanationTrustedHtml)} />
          </div>
        )}

        {showSolution && (
          <div className="exercise-feedback-block exercise-feedback-details">
            <h3>{labels.correction}</h3>
            <MathRenderer content={localize(question.solution, lang)} trustedHtml={Boolean(question.solutionTrustedHtml)} />
          </div>
        )}

        {showInsight && (
          <div className="exercise-feedback-block exercise-feedback-insight">
            <h3>{labels.insight}</h3>
            <MathRenderer content={localize(question.insight, lang)} trustedHtml={Boolean(question.insightTrustedHtml)} />
          </div>
        )}
      </div>

      {(showCourseLinks || showNext) && (
        <footer className="exercise-feedback-actions">
          {showCourseLinks && (
            <div className="exercise-course-links">
              {hintIds.map((hintId) => (
                <button key={hintId} type="button" className="exercise-course-link" onClick={() => onOpenCourse?.(hintId)}>
                  {labels.courseReminder}
                </button>
              ))}
            </div>
          )}
          {showNext && (
            <button type="button" className="showcase-action showcase-action-primary exercise-feedback-next" onClick={onNext}>
              {labels.next}
            </button>
          )}
        </footer>
      )}
    </section>
  );
}
