import { pickRandom } from "../core/random";
import {
  calculateDiscriminant, complexQuadraticRoots, exactValueToLatex, factorSquarePart,
  formatQuadraticLatex, isPerfectSquare, solveQuadraticExact,
} from "../math/quadratic";
import { equalQuadraticRoots, parseQuadraticRoot } from "../math/quadraticExpressions";
import { asFraction } from "../math/rational";

const tr = (fr, en) => ({ fr, en });
const invalid = (lang, fr, en) => ({ status: "invalid", message: lang === "en" ? en : fr });
const advance = (value, stage, fields = {}) => ({ status: "continue", nextAnswer: { ...value, stage, ...fields } });

const realRootChoices = [
  { id: "2", label: tr("Deux racines", "Two roots") },
  { id: "1", label: tr("Une racine", "One root") },
  { id: "0", label: tr("Pas de racine réelle", "No real roots") },
];

const rootChoicesWithComplex = [
  { id: "2", label: tr("Deux racines réelles", "Two real roots") },
  { id: "1", label: tr("Une racine réelle", "One real root") },
  { id: "complex", label: tr("Deux racines complexes", "Two complex roots") },
];

export function getQuadraticRootChoices(allowComplexRoots) {
  return allowComplexRoots ? rootChoicesWithComplex : realRootChoices;
}

function buildPools() {
  const pools = { square: {}, radical: {} };
  for (const group of Object.values(pools)) {
    for (const kind of ["negative", "double", "rational", "irrational"]) group[kind] = [[], []];
  }
  for (const a of [-4, -3, -2, -1, 1, 2, 3, 4]) {
    for (let b = -13; b <= 13; b += 1) {
      for (let c = -13; c <= 13; c += 1) {
        const delta = calculateDiscriminant(a, b, c);
        const magnitude = Math.abs(delta);
        const square = isPerfectSquare(magnitude);
        const kind = delta < 0 ? "negative" : delta === 0 ? "double" : square ? "rational" : "irrational";
        const monic = a === 1 ? 1 : 0;
        const entry = { a, b, c, delta };
        if (square && magnitude <= 100) pools.square[kind][monic].push(entry);
        const { outside, inside } = factorSquarePart(magnitude);
        if (square || (inside <= 31n && (kind === "negative" || outside > 1n))) {
          pools.radical[kind][monic].push(entry);
        }
      }
    }
  }
  return pools;
}

const pools = buildPools();
const factor = (n) => n < 0 ? `(${n})` : String(n);
const fraction = (numerator, denominator) => `\\frac{${numerator}}{${denominator}}`;

function rootComputation(a, b, delta, index, result) {
  const denominator = `2\\times${factor(a)}`;
  if (delta === 0) return `${fraction(-b, denominator)}=${result}`;
  const magnitude = Math.abs(delta);
  const { outside, inside } = factorSquarePart(magnitude);
  const sign = index === 0 ? "-" : "+";
  const signed = (term) => b === 0 ? `${sign === "-" ? "-" : ""}${term}` : `${-b}${sign}${term}`;
  const unit = delta < 0 ? "i" : "";
  const original = fraction(signed(`${unit}\\sqrt{${magnitude}}`), denominator);
  const simplifiedRadical = `${outside === 1n ? "" : outside}${unit}${inside === 1n ? "" : `\\sqrt{${inside}}`}`;
  const intermediate = fraction(signed(simplifiedRadical), 2 * a);
  const showIntermediate = outside > 1n && inside > 1n && intermediate !== result.replace(/\s+/g, "");
  return [original, ...(showIntermediate ? [intermediate] : []), result].join("=");
}

export function generateQuadraticDiscriminant({ level = 1, rng = Math.random } = {}) {
  const tier = Number(level);
  const allowComplexRoots = tier === 3;
  const roll = rng();
  const negativeLimit = allowComplexRoots ? .5 : .1;
  const doubleLimit = allowComplexRoots ? .6 : .25;
  const irrationalLimit = allowComplexRoots ? .85 : .75;
  const kind = roll < negativeLimit ? "negative"
    : roll < doubleLimit ? "double"
      : tier > 1 && roll < irrationalLimit ? "irrational" : "rational";
  const { a, b, c, delta } = pickRandom(pools[tier > 1 ? "radical" : "square"][kind][rng() < .5 ? 1 : 0], rng);
  const { roots: realRoots, rootCount } = solveQuadraticExact(a, b, c);
  const complex = delta < 0 && allowComplexRoots;
  const roots = complex ? complexQuadraticRoots(a, b, delta) : a < 0 && delta > 0 ? [...realRoots].reverse() : realRoots;
  const latexRoots = roots.map(exactValueToLatex);
  const polynomial = formatQuadraticLatex(a, b, c, { variable: "X" });
  const rootChoice = complex ? "complex" : String(rootCount);
  const countLabel = getQuadraticRootChoices(allowComplexRoots).find((choice) => choice.id === rootChoice).label;
  const intro = tr(
    `Le discriminant du polynôme $P(X)=${polynomial}$ est`,
    `The discriminant of the polynomial $P(X)=${polynomial}$ is`,
  );
  const calculation = `$$\\Delta=${factor(b)}^2-4\\times${factor(a)}\\times${factor(c)}=${delta}.$$`;
  const computations = latexRoots.map((root, index) => `<span>$$${rootComputation(a, b, delta, index, root)}$$</span>`);
  const conclusion = delta > 0
    ? tr("Comme $\\Delta>0$, $P$ admet deux racines réelles qui sont", "Since $\\Delta>0$, $P$ has two real roots")
    : delta === 0
      ? tr("Comme $\\Delta=0$, $P$ admet une racine réelle double qui est", "Since $\\Delta=0$, $P$ has one double real root")
      : complex
        ? tr("Comme $\\Delta<0$, $P$ admet deux racines complexes conjuguées", "Since $\\Delta<0$, $P$ has two complex conjugate roots")
        : tr("Comme $\\Delta<0$, $P$ n’admet pas de racine réelle.", "Since $\\Delta<0$, $P$ has no real roots.");
  const expectedRoots = latexRoots.length ? `$$\\left\\{${latexRoots.join(",\\;")}\\right\\}$$` : countLabel;
  const explain = (lang, connector, colon) => {
    const discriminant = `<p>${intro[lang]}</p>${calculation}`;
    if (!computations.length) return `${discriminant}<p>${conclusion[lang]}</p>`;
    const roots = computations.join(`<span>${connector}</span>`);
    return `${discriminant}<p>${conclusion[lang]}${colon}</p>`
      + `<div class="exercise-paired-calculations">${roots}</div>`;
  };

  return {
    promptUi: { icon: false, label: tr("Déterminer les racines de $P$", "Find the roots of $P$") },
    prompt: `$$P(X)=${polynomial}$$`,
    allowComplexRoots,
    expected: { a, b, c, delta, rootCount, rootChoice, complex, latexRoots },
    answerDisplay: expectedRoots,
    explanation: tr(explain("fr", "et", " :"), explain("en", "and", ":")),
    explanationTrustedHtml: true,
    reviewAnswer: (value) => ({
      answerDisplay: value.stage === "discriminant" ? `$$\\Delta=${delta}$$`
        : value.stage === "root-count" ? countLabel : expectedRoots,
    }),
    dedupeKey: [a, b, c],
  };
}

export function validateQuadraticDiscriminant(value, { expected, lang }) {
  if (value.stage === "discriminant") {
    if (!value.discriminant.trim()) return invalid(lang, "Saisir le discriminant $\\Delta$.", "Enter the discriminant $\\Delta$.");
    return asFraction(value.discriminant).equals(expected.delta) && advance(value, "root-count");
  }
  if (value.stage === "root-count") {
    if (value.count === "") return invalid(lang, "Choisir une proposition.", "Choose an option.");
    if (value.count !== expected.rootChoice) return false;
    if (!expected.latexRoots.length) return true;
    return advance(value, "roots", { roots: expected.latexRoots.map(() => "") });
  }
  if (value.stage !== "roots" || value.roots.length !== expected.latexRoots.length || !value.roots.length) return false;
  if (value.roots.some((root) => !root.trim())) return invalid(lang, "Compléter toutes les racines.", "Enter all the roots.");
  const submitted = value.roots.map(parseQuadraticRoot);
  const expectedRoots = expected.latexRoots.map(parseQuadraticRoot);
  return submitted.every((root, i) => equalQuadraticRoots(root, expectedRoots[i]))
    || (submitted.length === 2 && submitted.every((root, i) => equalQuadraticRoots(root, expectedRoots[1 - i])));
}

const title = tr("Racines d’un polynôme de degré 2", "Roots of a quadratic polynomial");
const description = tr(
  "Déterminer les racines d’un polynôme de degré 2 en utilisant le discriminant et les formules usuelles.",
  "Find the roots of a quadratic polynomial using the discriminant and the standard formulas.",
);

export const quadraticDiscriminantTool = {
  id: "polynomes-degre-2",
  categoryId: "calcul-elementaire",
  title: tr("Polynômes de degré 2", "Quadratic polynomials"),
  description,
  exerciseColumns: 3,
  exercises: [{
    id: "racines", label: title, description, color: "emerald",
    levels: [1, 2, { id: "3", value: 3, note: tr("Nécessite de connaître les complexes", "Requires knowledge of complex numbers") }],
  }],
  timer: false,
  score: true,
  series: { questionCount: 5, choices: [1, 2, 5, 10], allowQuestionCount: true, allowRestart: true, showSummary: true },
  source: { type: "generator", generate: generateQuadraticDiscriminant },
  answer: { type: "quadratic-discriminant", validator: validateQuadraticDiscriminant },
  feedback: { showCorrection: false, showExplanation: true, nextQuestion: true },
  courseHintIds: ["quadratic-discriminant-formulas"],
};
