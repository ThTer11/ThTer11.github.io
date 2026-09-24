import { calculusExpressionToLatex } from "../math/calculus";
import { localize } from "./localize";

const LABELS = {
  fr: { noAnswer: "Aucune réponse", true: "Vrai", false: "Faux" },
  en: { noAnswer: "No answer", true: "True", false: "False" },
};

function plain(value) {
  if (Array.isArray(value)) return value.map(plain).join(" ; ");
  if (value && typeof value === "object") return Object.values(value).map(plain).join(" ; ");
  return String(value ?? "");
}

function expression(value) {
  // Do not silently discard part of an equality. Numeric literals are retained by the parser.
  if (String(value).includes("=")) throw new Error("Literal text");
  return calculusExpressionToLatex(String(value));
}

/** Serializable display snapshot. Text is rendered by React, never as trusted HTML. */
export function formatAnswerDisplay(value, spec = {}, question = {}, lang = "fr") {
  const labels = LABELS[lang] ?? LABELS.fr;
  const text = (content) => ({ kind: "text", content });
  if (value === undefined || value === null || String(value).trim() === "") return text(labels.noAnswer);
  if (typeof value === "boolean") return text(value ? labels.true : labels.false);
  const type = spec.type;
  if (type === "choice" || type === "true-false") {
    const option = (question.options ?? spec.options ?? []).find((item) => item.value === value);
    return text(option ? localize(option.label, lang) : plain(value));
  }
  try {
    let latex;
    if (type === "matrix" || (Array.isArray(value) && Array.isArray(value[0]))) {
      latex = `\\begin{pmatrix}${value.map((row) => row.map(expression).join(" & ")).join(" \\\\ ")}\\end{pmatrix}`;
    } else if (["vector", "coordinates", "solution-set"].includes(type) || Array.isArray(value)) {
      const entries = value.map(expression).join(";\\,");
      latex = type === "solution-set" ? `\\left\\{${entries}\\right\\}` : `\\left(${entries}\\right)`;
    } else if (type === "multiple-fields") {
      return {
        kind: "fields",
        fields: (question.fields ?? spec.fields ?? Object.keys(value).map((key) => ({ key }))).map((field) => ({
          label: localize(field.label ?? field.id ?? field.key, lang),
          display: formatAnswerDisplay(value[field.id ?? field.key], field.answer ?? {}, {}, lang),
        })),
      };
    } else if (["integer", "number", "decimal", "fraction", "expression"].includes(type)
      || question.validationMode || !type) {
      latex = expression(value);
    } else {
      return text(plain(value));
    }
    return { kind: "math", content: `$$${latex}$$` };
  } catch {
    return text(plain(value));
  }
}
