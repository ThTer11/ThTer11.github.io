import { odeAnswerToLatex } from "../math/differentialEquations";
import { calculusExpressionToLatex } from "../math/calculus";
import { augmentedLatex, parameterConditionLatex } from "../math/augmentedSystems";
import { toFractionMatrix } from "../math/linearAlgebra";
import { characteristicPolynomialLatex } from "../math/spectral";
import { differentialSystemLatex, spectralOdeExpressionToLatex } from "../math/spectralOde";
import { getQuadraticRootChoices } from "../definitions/quadraticDiscriminant";
import { systemToLatex } from "../../utils/gauss";
import { getExerciseUiText } from "../content/uiText";
import { localize } from "./localize";
import { splitSet } from "./validators";

const LABELS = {
  fr: { noAnswer: "Aucune réponse", true: "Vrai", false: "Faux" },
  en: { noAnswer: "No answer", true: "True", false: "False" },
};

const POWER_DISPLAY_OPTIONS = { additionalSymbols: ["n"], multiplicationSymbol: "\\times " };

function plain(value) {
  if (Array.isArray(value)) return value.map(plain).join(" ; ");
  if (value && typeof value === "object") return Object.values(value).map(plain).join(" ; ");
  return String(value ?? "");
}

function expression(value, options) {
  // Do not silently discard part of an equality. Numeric literals are retained by the parser.
  if (String(value).includes("=")) throw new Error("Literal text");
  return calculusExpressionToLatex(String(value), options);
}

/** Serializable display snapshot. Text is rendered by React, never as trusted HTML. */
export function formatAnswerDisplay(value, spec = {}, question = {}, lang = "fr") {
  const labels = LABELS[lang] ?? LABELS.fr;
  const text = (content) => ({ kind: "text", content });
  if (value === undefined || value === null || String(value).trim() === "") return text(labels.noAnswer);
  if (typeof value === "boolean") return text(value ? labels.true : labels.false);
  const type = spec.type;
  if (type === "quadratic-discriminant") {
    if (value.stage === "discriminant") {
      return formatAnswerDisplay(value.discriminant, { type: "integer" }, {}, lang);
    }
    if (value.stage === "root-count") {
      const choice = getQuadraticRootChoices(question.allowComplexRoots).find(({ id }) => id === value.count);
      return text(localize(choice?.label, lang) || labels.noAnswer);
    }
    try {
      const roots = value.roots.map((root) => expression(root, { additionalSymbols: ["i"] }));
      return { kind: "math", content: `$$\\left\\{${roots.join(",\\;")}\\right\\}$$` };
    } catch {
      return text(plain(value.roots));
    }
  }
  if (type === "matrix-diagonalisation") {
    const format = (raw, type) => formatAnswerDisplay(raw, { type }, {}, lang);
    const math = (content) => ({ kind: "math", content });
    if (value.stage === "recognition") {
      if (!value.decision) return text(labels.noAnswer);
      return text(value.decision === "yes" ? (lang === "en" ? "Yes" : "Oui") : (lang === "en" ? "No" : "Non"));
    }
    if (value.stage === "eigenvalue") return format(value.eigenvalue, "fraction");
    if (value.stage === "polynomial") {
      try {
        return math(`$$${characteristicPolynomialLatex(value.polynomialCoefficients)}$$`);
      } catch {
        return text(plain(value.polynomialCoefficients ?? value.polynomial) || labels.noAnswer);
      }
    }
    if (value.stage === "eigenvalues") return format(splitSet(value.eigenvalues), "solution-set");
    if (value.stage === "recurrence-matrix" || value.stage === "ode-matrix") return format(value.A, "matrix");
    if (["diagonalization", "power-decomposition", "ode-decomposition"].includes(value.stage)) return {
      kind: "fields", fields: ["P", "D"].map((name) => ({ label: `$${name}$`, display: format(value[name], "matrix") })),
    };
    if (value.stage === "matrix-power") {
      return formatAnswerDisplay(value.power, { type: "matrix" }, POWER_DISPLAY_OPTIONS, lang);
    }
    if (value.stage === "recurrence-sequences") {
      return {
        kind: "fields",
        fields: ["u_n", "v_n"].map((name, index) => ({
          label: `$${name}$`,
          display: formatAnswerDisplay(value.sequences[index], { type: "expression" }, POWER_DISPLAY_OPTIONS, lang),
        })),
      };
    }
    if (value.stage === "ode-diagonal-system") {
      try {
        return math(differentialSystemLatex(toFractionMatrix(value.diagonalSystem), "y"));
      } catch {
        return text(plain(value.diagonalSystem));
      }
    }
    if (value.stage === "ode-modes" || value.stage === "ode-solutions") {
      const modes = value.stage === "ode-modes";
      const entries = modes ? value.modes : value.solutions;
      try {
        const lines = entries.map((entry, i) => {
          const expression = spectralOdeExpressionToLatex(entry);
          return `${modes ? "y" : "x"}_${i + 1}(t)&=${modes ? `C_${i + 1}\\left(${expression}\\right)` : expression}`;
        });
        return math(`$$\\begin{aligned}${lines.join("\\\\")}\\end{aligned}$$`);
      } catch {
        return text(plain(entries));
      }
    }
    if (value.stage === "eigenpairs") return {
      kind: "fields",
      fields: value.orderedEigenvalues.flatMap((root, index) => {
        const label = `$\\lambda=${root}$`;
        const vector = format(value.vectors[index], "matrix");
        if (!value.systems) return [{ label, display: vector }];
        let system;
        try {
          system = math(systemToLatex(toFractionMatrix(value.systems[index]), ["x", "y"]));
        } catch {
          system = text(plain(value.systems[index]));
        }
        return [{ label, display: system }, { label: lang === "en" ? "Eigenvector" : "Vecteur propre", display: vector }];
      }),
    };
  }
  if (type === "matrix-inversion") {
    const ui = getExerciseUiText(lang);
    if (value.stage === "inverse") {
      return formatAnswerDisplay(value.matrix, { type: "matrix" }, {}, lang);
    }
    const choice = text({
      invertible: ui.matrixInvertible,
      singular: ui.matrixSingular,
    }[value.invertibility] ?? labels.noAnswer);
    if (value.stage === "invertibility") return choice;
    if (value.stage === "determinant") {
      return { kind: "fields", fields: [
        { label: "$\\det(A)$", display: formatAnswerDisplay(value.determinant, { type: "integer" }, {}, lang) },
        { label: ui.matrixInvertibility, display: choice },
      ] };
    }
    try {
      return { kind: "math", content: systemToLatex(toFractionMatrix(value.system), question.unknowns, question.rightHandSides) };
    } catch {
      return text(plain(value.system) || labels.noAnswer);
    }
  }
  if (["row-reduction", "parameter-system", "matrix-writing"].includes(type)) {
    if (type === "parameter-system") {
      if (!value.condition?.trim()) return text(labels.noAnswer);
      try { return {kind:"math", content:`$$${parameterConditionLatex(value.condition)}$$`}; }
      catch { return text(value.condition); }
    }
    if (type === "matrix-writing" && value.stage === "matrix-form") return {
      kind: "fields", fields: ["A", "B"].map(name => ({label:name, display:formatAnswerDisplay(value[name], {type:"matrix"}, {}, lang)})),
    };
    try { return {kind:"math", content:`$$${augmentedLatex(value.matrix)}$$`}; }
    catch { return text(plain(value.matrix) || labels.noAnswer); }
  }
  if (type === "matrix-product") {
    if (!value.defined) return text(labels.noAnswer);
    if (value.defined === "impossible") return text(lang === "en" ? "Product not defined" : "Produit impossible");
    if (question.symbolic && value.stage === "dimensions" && !value.size?.some((n) => String(n).trim())) return text(labels.noAnswer);
    if (value.stage === "dimensions" && value.size?.some((n) => String(n).trim())) return text(
      `${lang === "en" ? "Proposed size" : "Taille proposée"} : ${value.size.map((n) => String(n).trim() || "?").join(" × ")}`,
    );
    if (!value.matrix?.some((row) => row.some((cell) => String(cell).trim()))) return text(lang === "en" ? "Product defined" : "Produit défini");
    return formatAnswerDisplay(value.matrix, { type: "matrix" }, question, lang);
  }
  if (type === "choice" || type === "true-false") {
    const option = (question.options ?? spec.options ?? []).find((item) => item.value === value);
    return text(option ? localize(option.label, lang) : plain(value));
  }
  try {
    let latex;
    if (question.validationMode === "ode") {
      latex = odeAnswerToLatex(value);
    } else if (type === "matrix" || (Array.isArray(value) && Array.isArray(value[0]))) {
      const additionalSymbols = question.additionalSymbols ?? (question.symbolic ? ["y", "z"] : []);
      latex = `\\begin{pmatrix}${value.map((row) => row.map((cell) => expression(cell,
        { additionalSymbols, multiplicationSymbol: question.multiplicationSymbol })).join(" & ")).join(" \\\\ ")}\\end{pmatrix}`;
    } else if (["vector", "coordinates", "solution-set"].includes(type) || Array.isArray(value)) {
      const entries = value.map((cell) => expression(cell)).join(";\\,");
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
      latex = expression(value, question);
    } else {
      return text(plain(value));
    }
    return { kind: "math", content: `$$${latex}$$` };
  } catch {
    return text(plain(value));
  }
}
