import { pickRandom, randomInteger } from "../core/random";
import { formatGeneratedOdeExpression as tex } from "../math/odeFormatting";
const tr = (fr, en) => ({ fr, en });
const nz = (rng) => pickRandom([-3, -2, -1, 1, 2, 3], rng);
const mul = (k, x) => k === 1 ? x : k === -1 ? `-(${x})` : `${k}*(${x})`;
const add = (x, y) => y === "0" ? x : y.startsWith("-") ? `${x}${y}` : `${x}+${y}`;
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
const rational = (numerator, denominator) => {
  if (denominator < 0) { numerator *= -1; denominator *= -1; }
  const divisor = gcd(numerator, denominator);
  numerator /= divisor; denominator /= divisor;
  return denominator === 1 ? String(numerator) : `${numerator}/${denominator}`;
};
const rationalMultiple = (numerator, denominator, expression) => {
  const coefficient = rational(numerator, denominator);
  return coefficient.includes("/") ? `(${coefficient})*(${expression})` : mul(Number(coefficient), expression);
};
const parameterValues = (entries) => tr(
  entries.map((entry, index) => `${entry.name}=${tex(entry.value)}${index < entries.length - 1 ? ",\\quad\\text{ et }" : ""}`).join(""),
  entries.map((entry, index) => `${entry.name}=${tex(entry.value)}${index < entries.length - 1 ? ",\\quad\\text{ and }" : ""}`).join(""),
);
const shift = (c) => c === 0 ? "t" : c > 0 ? `t-${c}` : `t+${-c}`;
const opposite = (expression) => expression.startsWith("-(") && expression.endsWith(")") ? expression.slice(2, -1) : expression.startsWith("-") ? expression.slice(1) : `-(${expression})`;

/** Select solvable equations so variation of constants always reduces to a short primitive. */
export function simpleForcingProblem(level, rng) {
  const m = nz(rng), base = { interval: "\\mathbb R", t0: 0, points: [-1.13, -.91, -.73, -.51, -.29, -.11, 0, .13, .31, .53, .71, .89, 1.07] };
  if (level === 3) {
    const kind = pickRandom(["inverse", "linear", "sine", "cosine"], rng);
    const affine = pickRandom([false, true], rng);
    let a, A, h, b, p, q, U, work;
    if (kind === "inverse") {
      const c = randomInteger(-3, 3, rng), z = shift(c);
      a = `1/(${z})`;
      A = `ln(${z})`;
      h = `1/(${z})`;
      b = affine ? mul(m, z) : String(m);
      q = affine ? mul(m, `(${z})^2`) : mul(m, z);
      U = affine ? rationalMultiple(m, 3, `(${z})^3`) : rationalMultiple(m, 2, `(${z})^2`);
      p = affine ? rationalMultiple(m, 3, `(${z})^2`) : rationalMultiple(m, 2, z);
      base.interval = `]${c},+\\infty[`;
      base.t0 = c + 1;
      base.points = [.19, .41, .67, 1, 1.31, 1.79, 2.17].map((value) => c + value);
      work = tr(`Sur $I$, une primitive de $a:t\\mapsto ${tex(a)}$ s’écrit $$A:t\\mapsto ${tex(opposite(`ln(abs(${z}))`))}=${tex(opposite(A))}.$$`, `On $I$, an antiderivative of $a:t\\mapsto ${tex(a)}$ can be written as $$A:t\\mapsto ${tex(opposite(`ln(abs(${z}))`))}=${tex(opposite(A))}.$$`);
    } else {
      const k = kind === "linear" ? pickRandom([-4, -2, 2, 4], rng) : nz(rng);
      if (kind === "linear") {
        a = mul(k, "t");
        A = rationalMultiple(k, 2, "t^2");
      } else if (kind === "sine") {
        a = mul(k, "sin(t)");
        A = mul(-k, "cos(t)");
      } else {
        a = mul(k, "cos(t)");
        A = mul(k, "sin(t)");
      }
      h = `exp(${opposite(A)})`;
      q = affine ? mul(m, "t") : String(m);
      U = affine ? rationalMultiple(m, 2, "t^2") : mul(m, "t");
      b = `(${q})*(${h})`;
      p = `(${U})*(${h})`;
      work = tr(`Une primitive de $a:t\\mapsto ${tex(a)}$ est $$A:t\\mapsto ${tex(A)}.$$`, `An antiderivative of $a:t\\mapsto ${tex(a)}$ is $$A:t\\mapsto ${tex(A)}.$$`);
    }
    return { ...base, a, A, h, b, p, dp: "", method: "variation", work, variation: { q, U } };
  }
  if (level === 4) {
    const kind = pickRandom(["usual-sin", "usual-cos", "composition", "parts"], rng);
    const k = nz(rng), easyAffine = pickRandom([false, true], rng);
    let a, A, work;
    if (kind === "usual-sin") {
      a = mul(k, "sin(t)");
      A = mul(-k, "cos(t)");
      work = tr(`Une primitive de $a:t\\mapsto ${tex(a)}$ est $$A:t\\mapsto ${tex(A)}.$$`, `An antiderivative of $a:t\\mapsto ${tex(a)}$ is $$A:t\\mapsto ${tex(A)}.$$`);
    } else if (kind === "usual-cos") {
      a = mul(k, "cos(t)");
      A = mul(k, "sin(t)");
      work = tr(`Une primitive de $a:t\\mapsto ${tex(a)}$ est $$A:t\\mapsto ${tex(A)}.$$`, `An antiderivative of $a:t\\mapsto ${tex(a)}$ is $$A:t\\mapsto ${tex(A)}.$$`);
    } else if (kind === "composition") {
      a = mul(2 * k, "t*cos(t^2)");
      A = mul(k, "sin(t^2)");
      const resolvedK = -k;
      const pattern = resolvedK === 1 ? "u'\\cos(u)" : resolvedK === -1 ? "-u'\\cos(u)" : `${resolvedK}u'\\cos(u)`;
      work = tr(`On reconnaît une forme composée du type $${pattern}$ avec $u:t\\mapsto t^2$. Une primitive de $a:t\\mapsto ${tex(a)}$ est donc $$A:t\\mapsto ${tex(A)}.$$`, `Recognise the composite form $${pattern}$ with $u:t\\mapsto t^2$. Therefore an antiderivative of $a:t\\mapsto ${tex(a)}$ is $$A:t\\mapsto ${tex(A)}.$$`);
    } else {
      a = mul(k, "t*cos(t)");
      A = mul(k, "t*sin(t)+cos(t)");
      work = tr(`On calcule une primitive par intégration par parties : $$\\int t\\cos(t)\\,dt=t\\sin(t)+\\cos(t).$$ Ainsi, une primitive de $a:t\\mapsto ${tex(a)}$ est $$A:t\\mapsto ${tex(A)}.$$`, `Integration by parts gives $$\\int t\\cos(t)\\,dt=t\\sin(t)+\\cos(t).$$ Therefore an antiderivative of $a:t\\mapsto ${tex(a)}$ is $$A:t\\mapsto ${tex(A)}.$$`);
    }
    const h = `exp(${opposite(A)})`;
    const q = easyAffine ? mul(m, "t") : String(m);
    const U = easyAffine ? rationalMultiple(m, 2, "t^2") : mul(m, "t");
    const b = `(${q})*(${h})`;
    const p = `(${U})*(${h})`;
    return { ...base, a, A, h, b, p, dp: "", method: kind, work, variation: { q, U } };
  }
  const kind = pickRandom(["inverse", "linear", "sine", "cosine"], rng);
  let a, A, h, b, p, dp = "0", form, parameters, work;
  if (kind === "inverse") {
    const k = pickRandom([1, 2, 3], rng), c = randomInteger(-3, 3, rng);
    const side = pickRandom([-1, 1], rng), z = shift(c);
    const positiveDistance = side > 0 ? z : c === 0 ? "-t" : `${c}-t`;
    a = `${k}/(${z})`;
    A = mul(k, `ln(abs(${z}))`);
    const intervalPrimitive = mul(k, `ln(${positiveDistance})`);
    h = `(${positiveDistance})^(${-k})`;
    base.interval = side > 0 ? `]${c},+\\infty[` : `]-\\infty,${c}[`;
    base.t0 = c + side;
    base.points = [.19, .41, .67, 1, 1.31, 1.79, 2.17].map((value) => c + side * value);
    p = mul(m, z);
    dp = String(m);
    b = String(m * (k + 1));
    form = `M(${z})`;
    parameters = parameterValues([{ name: "M", value: String(m) }]);
    work = tr(`Sur $I$, une primitive de $a:t\\mapsto ${tex(a)}$ s’écrit $$A:t\\mapsto ${tex(A)}=${tex(opposite(intervalPrimitive))}.$$`, `On $I$, an antiderivative of $a:t\\mapsto ${tex(a)}$ can be written as $$A:t\\mapsto ${tex(A)}=${tex(opposite(intervalPrimitive))}.$$`);
  } else {
    const k = nz(rng);
    p = String(m);
    form = "B";
    parameters = parameterValues([{ name: "B", value: String(m) }]);
    if (kind === "linear") {
      a = mul(k, "t");
      A = rationalMultiple(k, 2, "t^2");
      b = mul(k * m, "t");
    } else if (kind === "sine") {
      a = mul(k, "sin(t)");
      A = mul(-k, "cos(t)");
      b = mul(k * m, "sin(t)");
    } else {
      a = mul(k, "cos(t)");
      A = mul(k, "sin(t)");
      b = mul(k * m, "cos(t)");
    }
    h = `exp(${opposite(A)})`;
    work = tr(`Une primitive de $a:t\\mapsto ${tex(a)}$ est $$A:t\\mapsto ${tex(A)}.$$`, `An antiderivative of $a:t\\mapsto ${tex(a)}$ is $$A:t\\mapsto ${tex(A)}.$$`);
  }
  return { ...base, a, A, h, b, p, dp, form, parameters, work, method: "usual" };

}
