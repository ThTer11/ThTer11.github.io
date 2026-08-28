import {
  CalculatorIcon,
  PencilSquareIcon,
  ScaleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { localize } from "../../exercises/core/localize";
import MathRenderer from "./MathRenderer";

function trimPromptPunctuation(value) {
  return value.trim().replace(/\s*:\s*$/, "");
}

export function splitQuestionPrompt(content) {
  const raw = String(content ?? "").trim();
  const dollarStart = raw.indexOf("$$");
  const bracketStart = raw.indexOf("\\[");
  const starts = [dollarStart, bracketStart].filter((index) => index >= 0);

  if (starts.length === 0) {
    return { instruction: "", expression: raw };
  }

  const mathStart = Math.min(...starts);

  if (mathStart === 0) {
    return { instruction: "", expression: raw };
  }

  const usesDollars = mathStart === dollarStart;
  const closingDelimiter = usesDollars ? "$$" : "\\]";
  const closingIndex = raw.lastIndexOf(closingDelimiter);

  if (closingIndex <= mathStart) {
    return { instruction: "", expression: raw };
  }

  const mathEnd = closingIndex + closingDelimiter.length;
  const trailing = raw.slice(mathEnd).trim();
  const meaningfulTrailing = /^[.!;:]$/.test(trailing) ? "" : trailing;

  return {
    instruction: trimPromptPunctuation(raw.slice(0, mathStart)),
    expression: `${raw.slice(mathStart, mathEnd)}${meaningfulTrailing ? ` ${meaningfulTrailing}` : ""}`,
  };
}

function localizedPromptUiValue(value, lang) {
  if (value === false || value === null) return "";
  return localize(value, lang);
}

export function resolveQuestionPromptUi(promptUi, lang = "fr") {
  if (!promptUi || typeof promptUi !== "object") return null;

  const label = localizedPromptUiValue(promptUi.label, lang);
  const detail = localizedPromptUiValue(promptUi.detail, lang);

  return {
    label,
    detail,
    icon: promptUi.icon,
    tone: promptUi.tone ?? "default",
    fullText: [label, detail].filter(Boolean).join(" — "),
  };
}

const PROMPT_ICONS = {
  calculator: CalculatorIcon,
  calculate: CalculatorIcon,
  complete: PencilSquareIcon,
  decision: ScaleIcon,
  default: SparklesIcon,
  pencil: PencilSquareIcon,
  scale: ScaleIcon,
  sparkles: SparklesIcon,
  transform: SparklesIcon,
};

export default function ExerciseQuestionPrompt({
  content,
  lang = "fr",
  promptUi,
  trustedHtml = false,
}) {
  const { expression } = splitQuestionPrompt(content);

  if (!promptUi || promptUi === false) {
    return (
      <MathRenderer
        content={content}
        className="exercise-question-content"
        trustedHtml={trustedHtml}
      />
    );
  }

  const compact = resolveQuestionPromptUi(promptUi, lang);
  const iconChoice = compact.icon === undefined ? compact.tone : compact.icon;
  const Icon = typeof iconChoice === "function"
    ? iconChoice
    : PROMPT_ICONS[iconChoice];
  const customIcon = iconChoice && !Icon && typeof iconChoice === "string"
    ? iconChoice
    : null;

  return (
    <div className="exercise-question-prompt" aria-label={compact.fullText}>
      <div className="exercise-question-instruction">
        {(compact.label || iconChoice !== false) && (
          <span className={`exercise-question-action exercise-question-action-${compact.tone}`}>
            {iconChoice !== false && Icon && <Icon aria-hidden="true" />}
            {customIcon && (
              <span className="exercise-question-action-icon" aria-hidden="true">
                {customIcon}
              </span>
            )}
            {compact.label}
          </span>
        )}
        {compact.detail && (
          <MathRenderer
            as="p"
            content={compact.detail}
            className="exercise-question-detail"
            trustedHtml={trustedHtml}
          />
        )}
      </div>
      <MathRenderer
        content={expression}
        className="exercise-question-content exercise-question-expression"
        trustedHtml={trustedHtml}
      />
    </div>
  );
}
