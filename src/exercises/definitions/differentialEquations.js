import { pickRandom, randomInteger } from "../core/random";
import { formatGeneratedOdeExpression as tex } from "../math/odeFormatting";
import { simpleForcingProblem } from "./simpleOdeProblems";
import { odeExplanation } from "./odeExplanation";
import { validateOdeAnswer } from "../math/differentialEquations";

const tr = (fr, en) => ({ fr, en });
const HINT = "ode-first-order-method";
const nz = (rng, max = 4) => pickRandom(Array.from({ length: 2 * max }, (_, i) => i < max ? i - max : i - max + 1), rng);
const mul = (k, x) => k === 0 ? "0" : k === 1 ? x : k === -1 ? `-(${x})` : `${k}*(${x})`;
const add = (x, y) => x === "0" ? y : y === "0" ? x : y.startsWith("-") ? `${x}${y}` : `${x}+${y}`;
const product = (x, y) => x === "0" || y === "0" ? "0" : x === "1" ? y : y === "1" ? x : `(${x})*(${y})`;
const shift = (c) => c === 0 ? "t" : c > 0 ? `t-${c}` : `t+${-c}`;
const opposite = (expression) => expression.startsWith("-(") && expression.endsWith(")") ? expression.slice(2, -1) : expression.startsWith("-") ? expression.slice(1) : `-(${expression})`;
const scaledPattern = (k, pattern) => k === 1 ? pattern : k === -1 ? `-${pattern}` : `${k}${pattern}`;
const R = "\\mathbb R";
const realPoints = [-1.13, -.91, -.73, -.51, -.29, -.11, 0, .13, .31, .53, .71, .89, 1.07];

/** Every coefficient carries a simple explicit primitive, interval and derivation. */
function coefficient(level, rng) {
  const k = nz(rng, level === 1 ? 7 : 3);
  let a, A, h = null, method = "usual", work, interval = R, t0 = 0, points = realPoints;

  if (level === 1) {
    a = String(k);
    A = mul(k, "t");
    work = tr(
      `Une primitive de $a:t\\mapsto ${tex(a)}$ est $$A:t\\mapsto ${tex(A)}.$$`,
      `An antiderivative of $a:t\\mapsto ${tex(a)}$ is $$A:t\\mapsto ${tex(A)}.$$`,
    );
  } else if (level === 2) {
    const kind = pickRandom(["linear", "inverse", "sin", "cos", "exp", "root"], rng);
    if (kind === "inverse") {
      const c = randomInteger(-4, 4, rng), side = pickRandom([-1, 1], rng), z = shift(c);
      a = `${k}/(${z})`;
      A = mul(k, `ln(abs(${z}))`);
      t0 = c + side;
      interval = side > 0 ? `]${c},+\\infty[` : `]-\\infty,${c}[`;
      points = [.23, .37, .59, .83, 1, 1.19, 1.43, 1.71, 2.03].map((d) => c + side * d);
      const positiveDistance = side > 0 ? z : c === 0 ? "-t" : `${c}-t`;
      const intervalPrimitive = mul(k, `ln(${positiveDistance})`);
      h = `(${positiveDistance})^(${-k})`;
      work = tr(
        `Sur $I$, une primitive de $a:t\\mapsto ${tex(a)}$ s’écrit $$A:t\\mapsto ${tex(A)}=${tex(intervalPrimitive)}.$$`,
        `On $I$, an antiderivative of $a:t\\mapsto ${tex(a)}$ can be written as $$A:t\\mapsto ${tex(A)}=${tex(intervalPrimitive)}.$$`,
      );
    } else if (kind === "root") {
      a = `${k}/sqrt(t)`;
      A = mul(2 * k, "sqrt(t)");
      t0 = 1;
      interval = "]0,+\\infty[";
      points = [.19, .31, .53, .79, 1, 1.23, 1.61, 2.09];
    } else if (kind === "linear") {
      a = mul(k, "t");
      A = `${k}*t^2/2`;
    } else if (kind === "cos") {
      a = mul(k, "cos(t)");
      A = mul(k, "sin(t)");
    } else if (kind === "sin") {
      a = mul(k, "sin(t)");
      A = mul(-k, "cos(t)");
    } else {
      a = mul(k, "exp(t)");
      A = mul(k, "exp(t)");
    }
    work ??= tr(
      `Une primitive de $a:t\\mapsto ${tex(a)}$ est $$A:t\\mapsto ${tex(A)}.$$`,
      `An antiderivative of $a:t\\mapsto ${tex(a)}$ is $$A:t\\mapsto ${tex(A)}.$$`,
    );
  } else {
    const kind = pickRandom(["chain-sin", "chain-exp", "chain-log", "chain-exp", "parts-exp", "parts-cos"], rng);
    const r = pickRandom([2, -2, 3, -3], rng);
    method = kind.startsWith("parts") ? "parts" : "composition";

    if (kind === "chain-sin") {
      a = mul(2 * k, "t*cos(t^2)");
      A = mul(k, "sin(t^2)");
      const pattern = scaledPattern(k, "u'\\cos(u)");
      work = tr(
        `On reconnaît une forme composée du type $${pattern}$ avec $u:t\\mapsto t^2$. Une primitive de $a:t\\mapsto ${tex(a)}$ est donc $$A:t\\mapsto ${tex(A)}.$$`,
        `Recognise the composite form $${pattern}$ with $u:t\\mapsto t^2$. Therefore an antiderivative of $a:t\\mapsto ${tex(a)}$ is $$A:t\\mapsto ${tex(A)}.$$`,
      );
    } else if (kind === "chain-exp") {
      a = mul(k * r, `exp(${mul(r, "t")})`);
      A = mul(k, `exp(${mul(r, "t")})`);
      const pattern = scaledPattern(k, "u'e^u");
      work = tr(
        `On reconnaît une forme composée du type $${pattern}$ avec $u:t\\mapsto ${tex(mul(r, "t"))}$. Une primitive de $a:t\\mapsto ${tex(a)}$ est donc $$A:t\\mapsto ${tex(A)}.$$`,
        `Recognise the composite form $${pattern}$ with $u:t\\mapsto ${tex(mul(r, "t"))}$. Therefore an antiderivative of $a:t\\mapsto ${tex(a)}$ is $$A:t\\mapsto ${tex(A)}.$$`,
      );
    } else if (kind === "chain-log") {
      const d = randomInteger(1, 4, rng);
      a = `${2 * k}*t/(t^2+${d})`;
      A = mul(k, `ln(t^2+${d})`);
      const pattern = scaledPattern(k, "\\frac{u'}{u}");
      work = tr(
        `On reconnaît une forme composée du type $${pattern}$ avec $u:t\\mapsto t^2+${d}$. Une primitive de $a:t\\mapsto ${tex(a)}$ est donc $$A:t\\mapsto ${tex(A)}.$$`,
        `Recognise the composite form $${pattern}$ with $u:t\\mapsto t^2+${d}$. Therefore an antiderivative of $a:t\\mapsto ${tex(a)}$ is $$A:t\\mapsto ${tex(A)}.$$`,
      );
    } else {
      let vp, v;
      if (kind === "parts-exp") {
        const rt = mul(r, "t");
        a = mul(k, `t*exp(${rt})`);
        // IPP, kept in its simplest factorised form:
        // k∫t e^{rt}dt = (k/r)e^{rt}(t-1/r).
        A = `(${k}/${r})*exp(${rt})*(t-(1/${r}))`;
        vp = `exp(${rt})`;
        v = `${vp}/(${r})`;
      } else {
        a = mul(k, "t*cos(t)");
        A = mul(k, "t*sin(t)+cos(t)");
        vp = "cos(t)";
        v = "sin(t)";
      }
      work = tr(
        `On intègre par parties avec $u:t\\mapsto t$ et $v':t\\mapsto ${tex(vp)}$. Ainsi,
$$\\int t\\,${tex(vp)}\\,dt=t\\,${tex(v)}-\\int ${tex(v)}\\,dt.$$
Après multiplication par $${k}$, une primitive de $a:t\\mapsto ${tex(a)}$ est donc $$A:t\\mapsto ${tex(A)}.$$`,
        `Integrate by parts with $u:t\\mapsto t$ and $v':t\\mapsto ${tex(vp)}$. Thus,
$$\\int t\\,${tex(vp)}\\,dt=t\\,${tex(v)}-\\int ${tex(v)}\\,dt.$$
After multiplying by $${k}$, an antiderivative of $a:t\\mapsto ${tex(a)}$ is $$A:t\\mapsto ${tex(A)}.$$`,
      );
    }
  }
  return { a, A, h: h ?? `exp(${opposite(A)})`, interval, t0, points, method, work };
}

export function generateDifferentialEquation({ difficulty = "homogeneous", level = 1, rng = Math.random } = {}) {
  const maximumLevel = difficulty === "inhomogeneous" ? 4 : 3;
  level = Math.max(1, Math.min(maximumLevel, Number(level) || 1));
  const data = difficulty !== "homogeneous" && level >= 2 ? simpleForcingProblem(level, rng) : coefficient(level, rng);
  const { a, A, h, interval, method, work } = data;
  const homogeneousOnly = difficulty === "homogeneous", unique = difficulty === "initial-value";
  let b = "0", p = "0", form = "", parameters = "", dp = "0", variation;
  if (!homogeneousOnly) {
    if (level === 1) {
      b = String(nz(rng, 9)); p = `${b}/(${a})`; form = "B"; parameters = `B=\\frac{${b}}{${a}}`;
    } else {
      ({ b, p, dp = "0", form = "", parameters = "", variation } = data);
    }
  }
  const t0 = unique && level === 1 ? randomInteger(-2, 2, rng) : data.t0;
  const y0 = unique ? randomInteger(-5, 5, rng) : undefined;
  const pAtPoint = p.replace(/\bt\b/g, `(${t0})`);
  const hAtPoint = h.replace(/\bt\b/g, `(${t0})`);
  const constant = unique ? `(${y0}-(${pAtPoint}))/(${hAtPoint})` : "C";
  const conditionExpression = unique ? tex(add(pAtPoint, product("C", hAtPoint))) : "";
  let expected = add(p, product(constant, h));
  if (variation) {
    expected = product(add(variation.U, constant), h);
  } else if (unique && level === 1) {
    expected = add(p, product(`(${y0}-(${p}))`, `exp(-(${a})*(${shift(t0)}))`));
  }
  const family = tex(variation ? product(add(variation.U, "C"), h) : add(p, product("C", h)));
  const numericalA = /^-?\d+$/.test(a);
  const magnitude = numericalA ? (Math.abs(Number(a)) === 1 ? "" : String(Math.abs(Number(a)))) : tex(a.startsWith("-") ? a.slice(1) : a);
  const eq = `y'(t)${a.startsWith("-") ? "-" : "+"}${magnitude}y(t)=${tex(b)}`;
  const condition = unique ? tr(` vérifiant $y(${t0})=${y0}$`, ` satisfying $y(${t0})=${y0}$`) : tr("", "");
  const hint = homogeneousOnly || level >= 3 ? tr("", "") : level === 1
    ? tr("Chercher une solution particulière parmi les fonctions constantes.", "Look for a constant particular solution.")
    : tr(`Chercher une solution particulière $y_P:t\\mapsto ${form}$, où les paramètres sont réels.`, `Look for a particular solution $y_P:t\\mapsto ${form}$ with real parameters.`);
  const explanation = odeExplanation({ level, homogeneousOnly, unique, interval, a, A, h, p, dp, b, form, parameters, variation, work, family, expected, t0, y0, constant, conditionExpression });

  return {
    variant: `${difficulty}:${level}:${method}`,
    dedupeKey: `${difficulty}:${interval}:${a}:${b}:${unique ? `${t0}:${y0}` : ""}`,
    prompt: tr(`$$${eq}$$`, `$$${eq}$$`),
    promptUi: {
      icon: false,
      mobileLayout: "stack",
      label: tr(`Déterminer ${unique ? "la solution" : "toutes les solutions"} sur $I=${interval}$${condition.fr}.`, `Find ${unique ? "the solution" : "all solutions"} on $I=${interval}$${condition.en}.`),
      detail: hint,
    },
    expected, coefficient: a, coefficientPrimitive: A, forcing: b, particular: p, homogeneous: h,
    validationMode: "ode", validationPoints: [...new Set([...data.points, t0])],
    ...(unique ? { conditionPoint: t0, conditionValue: y0 } : {}),
    answerDisplay: unique ? `$$y(t)=${tex(expected)}.$$` : `$$y(t)=${family},\\quad C\\in\\mathbb R.$$`,
    explanation,
    explanationTrustedHtml: true,
    courseHintIds: [HINT],
    answer: { placeholder: unique ? tr("Expression en t, sans constante libre", "Expression in t, without a free constant") : tr("Ex. C*exp(-2*t)+3", "E.g. C*exp(-2*t)+3") },
  };
}

export const differentialEquationsTool = {
  id: "ordre-1", categoryId: "equations-differentielles", mode: "practice",
  title: tr("Équations différentielles d’ordre 1", "First-order differential equations"),
  description: tr("Résoudre les équations linéaires du premier ordre, avec ou sans second membre et condition initiale.", "Solve first-order linear equations, with or without a forcing term and an initial condition."),
  exercises: [
    { id: "homogeneous", color: "sky", label: tr("Équations différentielles homogènes", "Homogeneous differential equations"), description: tr("Coefficient constant, fonctions usuelles, puis compositions et intégration par parties.", "Constant coefficients, standard functions, then compositions and integration by parts.") },
    { id: "inhomogeneous", color: "violet", label: tr("Avec second membre", "Nonhomogeneous equations"), description: tr("Solution particulière constante, forme de la solution particulière indiquée, puis variation de la constante.", "Constant particular solution, suggested form, then variation of parameters.") },
    { id: "initial-value", color: "emerald", label: tr("Avec condition initiale", "Initial-value problems"), description: tr("Résoudre l’équation différentielle puis déterminer l’unique solution vérifiant la condition.", "Solve the equation, then find the unique solution satisfying the condition.") },
  ].map((exercise) => ({ ...exercise, levels: exercise.id === "inhomogeneous" ? [1, 2, 3, 4] : [1, 2, 3], defaultLevel: 1 })),
  defaultExercise: "homogeneous", timer: false,
  series: { questionCount: 10, choices: [5, 10, 15, 20], allowQuestionCount: true },
  score: true, persistSettings: true,
  source: { type: "generator", generate: generateDifferentialEquation },
  answer: { type: "text", inputMode: "text", validator: validateOdeAnswer },
  feedback: { showCorrection: true, showExplanation: true, showInsight: false, showCourseHintOnError: true, nextQuestion: true },
  courseHintIds: [HINT],
};

export const differentialEquationsTools = [differentialEquationsTool];
