import { pickRandom, randomInteger, weightedPick } from "../core/random";
import { validateCalculusAnswer } from "../math/calculus";

const CATEGORY_ID = "analyse";
const translated = (fr, en) => ({ fr, en: en ?? fr });

const REAL_DOMAIN = "\\mathbb R";
const POSITIVE_DOMAIN = "]0,+\\infty[";
const DEFAULT_POINTS = [-2.4, -1.35, -0.55, 0.4, 1.15, 2.3, 3.4];
const POSITIVE_POINTS = [0.2, 0.55, 1, 1.7, 2.8, 4.2, 6.1];

const derivativePrompt = {
  label: translated("Calculer la dérivée de $f$", "Find the derivative of $f$"),
  icon: false,
};
const primitivePrompt = {
  label: translated("Déterminer une primitive $F$ de $f$", "Find an antiderivative $F$ of $f$"),
  icon: false,
};
const promptUi = {
  derivativeUsual: derivativePrompt,
  derivativeSum: derivativePrompt,
  derivativeProduct: derivativePrompt,
  derivativeQuotient: derivativePrompt,
  derivativeComposition: derivativePrompt,
  primitiveUsual: primitivePrompt,
  primitiveSum: primitivePrompt,
  primitiveComposition: primitivePrompt,
  primitiveParts: {
    ...primitivePrompt,
    label: translated(
      "Déterminer une primitive $F$ de $f$ par intégration par parties",
      "Find an antiderivative $F$ of $f$ using integration by parts",
    ),
  },
  initialCondition: {
    label: translated(
      "Déterminer la primitive $F$ de $f$ vérifiant la condition",
      "Find the antiderivative $F$ of $f$ satisfying the condition",
    ),
    icon: false,
  },
};

function levelNumber(level) {
  const parsed = Number(level);
  return Number.isInteger(parsed) && parsed >= 1 ? Math.min(3, parsed) : 1;
}

function randomNonZero(min, max, rng, excluded = []) {
  const forbidden = new Set([0, ...excluded]);
  const candidates = Array.from({ length: max - min + 1 }, (_, index) => min + index)
    .filter((value) => !forbidden.has(value));
  return pickRandom(candidates, rng);
}

function scaledTerm(coefficient, plainBody = "", latexBody = plainBody) {
  const absolute = Math.abs(coefficient);
  const plainMagnitude = plainBody
    ? absolute === 1 ? plainBody : `${absolute}*${plainBody}`
    : String(absolute);
  const latexMagnitude = latexBody
    ? absolute === 1 ? latexBody : `${absolute}${latexBody}`
    : String(absolute);

  return { coefficient, plainMagnitude, latexMagnitude };
}

function joinTerms(terms) {
  const visible = terms.filter((term) => term.coefficient !== 0);

  if (visible.length === 0) return { plain: "0", latex: "0" };

  return visible.reduce((result, term, index) => {
    const sign = term.coefficient < 0 ? "-" : index === 0 ? "" : "+";
    const spacedSign = term.coefficient < 0
      ? index === 0 ? "-" : " - "
      : index === 0 ? "" : " + ";

    return {
      plain: `${result.plain}${sign}${term.plainMagnitude}`,
      latex: `${result.latex}${spacedSign}${term.latexMagnitude}`,
    };
  }, { plain: "", latex: "" });
}

function linearForms(a, b) {
  return joinTerms([
    scaledTerm(a, "t", "t"),
    scaledTerm(b),
  ]);
}

function latexParenthesize(expression) {
  const value = String(expression).trim();

  // No useless parentheses around a single variable or a number.
  if (
    value === "t" ||
    value === "x" ||
    /^-?\d+(?:\.\d+)?$/.test(value)
  ) {
    return value;
  }

  return `\\left(${value}\\right)`;
}

function latexPower(base, exponent) {
  if (exponent === 0) return "1";
  if (exponent === 1) return String(base).trim();

  return `${latexParenthesize(base)}^{${exponent}}`;
}

function latexSignedNumber(value) {
  return Number(value) < 0 ? `(${value})` : String(value);
}

function latexProduct(...factors) {
  const values = factors.filter((factor) => factor !== "" && factor != null).map(String);
  const negative = values.filter((factor) => factor === "-1").length % 2;
  const body = values.filter((factor) => factor !== "1" && factor !== "-1").join("\\,");
  return (negative ? "-" : "") + (body || "1");
}

function latexScaled(coefficient, body) {
  if (coefficient === 1) return body;
  if (coefficient === -1) return `-${body}`;
  return `${coefficient}${body}`;
}

function powerBody(exponent) {
  if (exponent === 0) return { plain: "", latex: "" };
  if (exponent === 1) return { plain: "t", latex: "t" };

  return {
    plain: `t^${exponent}`,
    latex: `t^{${exponent}}`,
  };
}

function safePointsForLinear(a, b) {
  const candidates = [-4.2, -3.1, -2.2, -1.3, -0.45, 0.35, 1.2, 2.1, 3.2, 4.4];
  return candidates.filter((value) => Math.abs(a * value + b) > 0.35).slice(0, 7);
}

function intervalAround(root, side) {
  if (side === "right") {
    return {
      latex: `]${root},+\\infty[`,
      points: [0.25, 0.6, 1, 1.7, 2.6, 3.8, 5].map((offset) => root + offset),
    };
  }

  return {
    latex: `]-\\infty,${root}[`,
    points: [0.25, 0.6, 1, 1.7, 2.6, 3.8, 5].map((offset) => root - offset),
  };
}

function derivativeQuestion({
  variant,
  expression,
  derivative,
  ui,
  explanation,
  hints = [],
  courseHintIds,
  domain = REAL_DOMAIN,
  points = DEFAULT_POINTS,
}) {
  return {
    variant,
    dedupeKey: `derivative:${domain}:${expression.plain}`,
    prompt: translated(
      `$$f(t)=${expression.latex}$$`,
      `$$f(t)=${expression.latex}$$`,
    ),
    promptUi: {
      ...ui,
      label: translated(
        `${ui.label.fr} sur $I=${domain}$.`,
        `${ui.label.en} on $I=${domain}$.`,
      ),
    },
    expected: derivative.plain,
    sourceExpression: expression.plain,
    answerDisplay: `$$f'(t)=${derivative.latex}$$`,
    explanation,
    hints,
    courseHintIds,
    validationMode: "exact",
    validationPoints: points,
  };
}

function primitiveQuestion({
  variant,
  integrand,
  primitive,
  ui,
  explanation,
  hints = [],
  courseHintIds,
  domain = REAL_DOMAIN,
  points = DEFAULT_POINTS,
}) {
  return {
    variant,
    dedupeKey: `primitive:${domain}:${integrand.plain}`,
    prompt: translated(
      `$$f(t)=${integrand.latex}$$`,
      `$$f(t)=${integrand.latex}$$`,
    ),
    promptUi: {
      ...ui,
      label: translated(
        `${ui.label.fr} sur $I=${domain}$.`,
        `${ui.label.en} on $I=${domain}$.`,
      ),
    },
    expected: primitive.plain,
    sourceExpression: integrand.plain,
    answerDisplay: `$$F(t)=${primitive.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
    explanation,
    hints,
    courseHintIds,
    validationMode: "primitive",
    requireIntegrationConstant: false,
    validationPoints: points,
  };
}

function uniquePrimitiveQuestion({
  variant,
  integrand,
  primitive,
  conditionPoint,
  conditionValue,
  explanation,
  hints = [],
  courseHintIds,
  domain = REAL_DOMAIN,
  points = DEFAULT_POINTS,
}) {
  return {
    variant,
    dedupeKey: `unique:${domain}:${integrand.plain}:${conditionPoint}:${conditionValue}`,
    prompt: translated(
      `$$f(t)=${integrand.latex}$$`,
      `$$f(t)=${integrand.latex}$$`,
    ),
    promptUi: {
      ...promptUi.initialCondition,
      label: translated(
        `Déterminer la primitive $F$ de $f$ sur $I=${domain}$ telle que $F(${conditionPoint})=${conditionValue}$.`,
        `Find the antiderivative $F$ of $f$ on $I=${domain}$ such that $F(${conditionPoint})=${conditionValue}$.`,
      ),
    },
    expected: primitive.plain,
    sourceExpression: integrand.plain,
    conditionPoint,
    conditionValue,
    answerDisplay: `$$F(t)=${primitive.latex}.$$`,
    explanation,
    hints,
    courseHintIds,
    validationMode: "exact",
    validationPoints: points,
  };
}

function chainRuleExplanation({
  coefficient,
  inner,
  innerDerivative,
  outer,
  outerDerivative,
  result,
}) {
  const composed = latexScaled(coefficient, "\\varphi(u(t))");
  const differentiated = latexScaled(coefficient, "u'(t)\\,\\varphi'(u(t))");

  return translated(
    `En posant $u(t)=${inner}$ et $\\varphi(x)=${outer}$, on obtient
    $$f(t)=${composed}.$$
    Comme $u'(t)=${innerDerivative}$ et $\\varphi'(x)=${outerDerivative}$, on a
    $$f'(t)=${differentiated}=${result}.$$`,

    `Let $u(t)=${inner}$ and $\\varphi(x)=${outer}$. Then
    $$f(t)=${composed}.$$
    Since $u'(t)=${innerDerivative}$ and $\\varphi'(x)=${outerDerivative}$,
    $$f'(t)=${differentiated}=${result}.$$`,
  );
}

function reverseChainExplanation({ factor, inner, innerDerivative, outer, outerPrimitive, result }) {
  const integrandForm = latexScaled(factor, "u'(t)\\,\\varphi(u(t))");

  return translated(
    `En posant $u(t)=${inner}$ et $\\varphi(x)=${outer}$, on obtient
    $$f(t)=${integrandForm}.$$
    Comme $u'(t)=${innerDerivative}$ et qu'une primitive de $\\varphi$ est $\\Phi(x)=${outerPrimitive}$, on a
    $$F(t)=${result}+C,\\,\\,C\\in\\mathbb R.$$`,

    `Let $u(t)=${inner}$ and $\\varphi(x)=${outer}$. Then
    $$f(t)=${integrandForm}.$$
    Since $u'(t)=${innerDerivative}$ and an antiderivative of $\\varphi$ is $\\Phi(x)=${outerPrimitive}$,
    $$F(t)=${result}+C,\\,\\,C\\in\\mathbb R.$$`,
  );
}

function usualDerivative(rng) {
  const kind = pickRandom(["power", "exponential", "reciprocal", "shifted-reciprocal", "sqrt", "sin", "cos"], rng);
  const coefficient = rng() < 0.35 ? 1 : randomNonZero(-5, 5, rng);

  if (kind === "power") {
    const exponent = pickRandom([-4, -3, -2, 2, 3, 4, 5, 6], rng);
    const body = powerBody(exponent);
    const derivativeBody = powerBody(exponent - 1);
    const expression = joinTerms([scaledTerm(coefficient, body.plain, body.latex)]);
    const derivative = joinTerms([scaledTerm(coefficient * exponent, derivativeBody.plain, derivativeBody.latex)]);

    return derivativeQuestion({
      variant: "usual-power",
      expression,
      derivative,
      ui: promptUi.derivativeUsual,
      explanation: translated(
        `Comme la dérivée de $t\\mapsto t^\\alpha$ est $t\\mapsto \\alpha t^{\\alpha-1}$, on obtient
        $$f'(t)=${derivative.latex}.$$`,
        `Since the derivative of $t\\mapsto t^\\alpha$ is $t\\mapsto \\alpha t^{\\alpha-1}$,
        $$f'(t)=${derivative.latex}.$$`,
      ),
      courseHintIds: [],
      domain: exponent < 0 ? "\\mathbb R\\setminus\\{0\\}" : REAL_DOMAIN,
      points: exponent < 0 ? [-3.2, -2, -0.8, 0.45, 1.1, 2.4, 4] : DEFAULT_POINTS,
    });
  }

  if (kind === "exponential") {
    const expression = joinTerms([scaledTerm(coefficient, "exp(t)", "\\mathrm e^t")]);
    return derivativeQuestion({
      variant: "usual-exponential",
      expression,
      derivative: expression,
      ui: promptUi.derivativeUsual,
      explanation: translated(
        `Comme la dérivée de $t\\mapsto\\mathrm e^t$ est $t\\mapsto\\mathrm e^t$, on obtient
        $$f'(t)=${expression.latex}.$$`,
        `Since the derivative of $t\\mapsto\\mathrm e^t$ is $t\\mapsto\\mathrm e^t$,
        $$f'(t)=${expression.latex}.$$`,
      ),
      courseHintIds: [],
    });
  }

  if (kind === "reciprocal" || kind === "shifted-reciprocal") {
    const shift = kind === "reciprocal" ? 0 : randomNonZero(-5, 5, rng);
    const sideInterval = kind === "shifted-reciprocal"
      ? intervalAround(shift, pickRandom(["left", "right"], rng))
      : null;
    const base = linearForms(1, -shift);
    const expression = {
      plain: `${coefficient}/(${base.plain})`,
      latex: `\\frac{${coefficient}}{${base.latex}}`,
    };
    const derivative = {
      plain: `${-coefficient}/((${base.plain})^2)`,
      latex: `\\frac{${-coefficient}}{${latexPower(base.latex, 2)}}`,
    };

    return derivativeQuestion({
      variant: kind,
      expression,
      derivative,
      ui: promptUi.derivativeUsual,
      explanation: translated(
        `En posant $u(t)=${base.latex}$, on a $u'(t)=1$. Comme
        $$\\left(\\frac1u\\right)'=-\\frac{u'}{u^2},$$
        on obtient
        $$f'(t)=${derivative.latex}.$$`,
        `Let $u(t)=${base.latex}$, so $u'(t)=1$. Since
        $$\\left(\\frac1u\\right)'=-\\frac{u'}{u^2},$$
        we obtain
        $$f'(t)=${derivative.latex}.$$`,
      ),
      courseHintIds: [],
      domain: sideInterval?.latex ?? `\\mathbb R\\setminus\\{${shift}\\}`,
      points: sideInterval?.points
        ?? intervalAround(shift, "right").points.concat(intervalAround(shift, "left").points).slice(0, 8),
    });
  }

  if (kind === "sqrt") {
    const expression = joinTerms([scaledTerm(coefficient, "sqrt(t)", "\\sqrt t")]);
    const derivative = {
      plain: `${coefficient}/(2*sqrt(t))`,
      latex: `\\frac{${coefficient}}{2\\sqrt t}`,
    };
    return derivativeQuestion({
      variant: "usual-square-root",
      expression,
      derivative,
      ui: promptUi.derivativeUsual,
      explanation: translated(
        `Comme la dérivée de $t\\mapsto\\sqrt t$ est $t\\mapsto \\frac{1}{2\\sqrt t}$, on obtient
        $$f'(t)=${derivative.latex}.$$`,
        `Since the derivative of $t\\mapsto\\sqrt t$ is $t\\mapsto \\frac{1}{2\\sqrt t}$,
        we obtain
        $$f'(t)=${derivative.latex}.$$`,
      ),
      courseHintIds: [],
      domain: POSITIVE_DOMAIN,
      points: POSITIVE_POINTS,
    });
  }

  const isSine = kind === "sin";
  const expression = joinTerms([scaledTerm(coefficient, `${kind}(t)`, `\\${kind}(t)`)]);
  const derivative = joinTerms([
    scaledTerm(isSine ? coefficient : -coefficient, isSine ? "cos(t)" : "sin(t)", isSine ? "\\cos(t)" : "\\sin(t)"),
  ]);
  return derivativeQuestion({
    variant: `usual-${kind}`,
    expression,
    derivative,
    ui: promptUi.derivativeUsual,
    explanation: translated(
      `${isSine ? "Comme la dérivée de $t\\mapsto\\sin(t)$ est $t\\mapsto\\cos(t)$" : "Comme la dérivée de $t\\mapsto\\cos(t)$ est $t\\mapsto-\\sin(t)$"}, on obtient
      $$f'(t)=${derivative.latex}.$$`,
      `${isSine ? "Since the derivative of $t\\mapsto\\sin(t)$ is $t\\mapsto\\cos(t)$" : "Since the derivative of $t\\mapsto\\cos(t)$ is $t\\mapsto-\\sin(t)$"},
      $$f'(t)=${derivative.latex}.$$`,
    ),
    courseHintIds: [],
  });
}

function sumDerivative(rng) {
  const exponent = randomInteger(2, 5, rng);
  const a = randomNonZero(-5, 5, rng);
  const b = randomNonZero(-5, 5, rng);
  const c = randomNonZero(-4, 4, rng);
  const expression = joinTerms([
    scaledTerm(a, powerBody(exponent).plain, powerBody(exponent).latex),
    scaledTerm(b, "exp(t)", "\\mathrm e^t"),
    scaledTerm(c, "sin(t)", "\\sin(t)"),
  ]);
  const derivative = joinTerms([
    scaledTerm(a * exponent, powerBody(exponent - 1).plain, powerBody(exponent - 1).latex),
    scaledTerm(b, "exp(t)", "\\mathrm e^t"),
    scaledTerm(c, "cos(t)", "\\cos(t)"),
  ]);

  return derivativeQuestion({
    variant: "sum",
    expression,
    derivative,
    ui: promptUi.derivativeSum,
    explanation: translated(
      `La dérivation est linéaire : on dérive chaque terme séparément. Avec $(u^n)'=nu^{n-1}$, $\\mathrm \\exp'(t)=\\mathrm e^t$ et $\\sin'(t)=\\cos(t)$, on obtient $$f'(t)=${derivative.latex}.$$`,
      `Differentiation is linear, so each term is differentiated separately. Using $(u^n)'=nu^{n-1}$, $\\mathrm \\exp'(t)=\\mathrm e^t$ and $\\sin'(t)=\\cos(t)$ gives $$f'(t)=${derivative.latex}.$$`,
    ),
    courseHintIds: [],
  });
}

function productDerivative(rng) {
  const a = randomNonZero(-5, 5, rng);
  const b = randomInteger(-6, 6, rng);
  const affine = linearForms(a, b);
  const kind = pickRandom(["exponential", "sine"], rng);

  if (kind === "exponential") {
    const expression = { plain: `(${affine.plain})*exp(t)`, latex: `${latexParenthesize(affine.latex)}\\mathrm e^t` };
    const inside = linearForms(a, a + b);
    const derivative = { plain: `(${inside.plain})*exp(t)`, latex: `${latexParenthesize(inside.latex)}\\mathrm e^t` };

    return derivativeQuestion({
      variant: "product-exponential",
      expression,
      derivative,
      ui: promptUi.derivativeProduct,
      explanation: translated(
        `On pose $u(t)=${affine.latex}$ et $v(t)=\\mathrm e^t$. Alors $u'(t)=${a}$ et $v'(t)=\\mathrm e^t$. On obtient
        $$f'(t)=u'(t)v(t)+u(t)v'(t).$$
      $$f'(t)=${derivative.latex}.$$`,
        `Let $u(t)=${affine.latex}$ and $v(t)=\\mathrm e^t$. Then $u'(t)=${a}$ and $v'(t)=\\mathrm e^t$. Thus
        $$f'(t)=u'(t)v(t)+u(t)v'(t).$$
      $$f'(t)=${derivative.latex}.$$`,
      ),
      courseHintIds: [],
    });
  }

  const expression = { plain: `(${affine.plain})*sin(t)`, latex: `${latexParenthesize(affine.latex)}\\sin(t)` };
  const derivative = joinTerms([
    scaledTerm(a, "sin(t)", "\\sin(t)"),
    scaledTerm(1, `(${affine.plain})*cos(t)`, `${latexParenthesize(affine.latex)}\\cos(t)`),
  ]);
  return derivativeQuestion({
    variant: "product-sine",
    expression,
    derivative,
    ui: promptUi.derivativeProduct,
    explanation: translated(
      `On pose $u(t)=${affine.latex}$ et $v(t)=\\sin(t)$. Alors $u'(t)=${a}$ et $v'(t)=\\cos(t)$. On obtient
      $$f'(t)=u'(t)v(t)+u(t)v'(t).$$
      $$f'(t)=${derivative.latex}.$$`,
      `Let $u(t)=${affine.latex}$ and $v(t)=\\sin(t)$. Then $u'(t)=${a}$ and $v'(t)=\\cos(t)$. Thus
      $$f'(t)=u'(t)v(t)+u(t)v'(t).$$
      $$f'(t)=${derivative.latex}.$$`,
    ),
    courseHintIds: [],
  });
}

function quotientDerivative(rng) {
  let a;
  let b;
  let c;
  let d;
  let determinant;

  do {
    a = randomNonZero(-5, 5, rng);
    b = randomInteger(-6, 6, rng);
    c = randomNonZero(-4, 4, rng);
    d = randomInteger(-6, 6, rng);
    determinant = a * d - b * c;
  } while (determinant === 0);

  const numerator = linearForms(a, b);
  const denominator = linearForms(c, d);
  const expression = {
    plain: `(${numerator.plain})/(${denominator.plain})`,
    latex: `\\frac{${numerator.latex}}{${denominator.latex}}`,
  };
  const derivative = {
    plain: `${determinant}/((${denominator.plain})^2)`,
    latex: `\\frac{${determinant}}{${latexPower(denominator.latex, 2)}}`,
  };
  const rootLatex = d % c === 0 ? String(-d / c) : `\\frac{${-d}}{${c}}`;

  return derivativeQuestion({
    variant: "quotient-affine",
    expression,
    derivative,
    ui: promptUi.derivativeQuotient,
    explanation: translated(
      `On pose $u(t)=${numerator.latex}$ et $v(t)=${denominator.latex}$. Alors $u'(t)=${a}$ et $v'(t)=${c}$. Comme $v$ ne s'annule pas sur $I$, on obtient
      $$f'(t)=\\frac{u'(t)v(t)-u(t)v'(t)}{v(t)^2}$$
      d'où
      $$f'(t)=\\frac{${latexSignedNumber(a)}\\,${latexParenthesize(denominator.latex)}-${latexParenthesize(numerator.latex)}\\,${latexSignedNumber(c)}}{${latexPower(denominator.latex, 2)}}$$
      Enfin, on a
      $$f'(t)=${derivative.latex}.$$`,
      `Let $u(t)=${numerator.latex}$ and $v(t)=${denominator.latex}$. Then $u'(t)=${a}$ and $v'(t)=${c}$. Since $v$ does not vanish on $I$,
      $$f'(t)=\\frac{u'(t)v(t)-u(t)v'(t)}{v(t)^2}.$$
      $$f'(t)=${derivative.latex}.$$`,
    ),
    courseHintIds: [],
    domain: `\\mathbb R\\setminus\\{${rootLatex}\\}`,
    points: safePointsForLinear(c, d),
  });
}

function composedDerivative(rng) {
  const kind = pickRandom(["power", "exponential", "sin", "cos", "reciprocal", "sqrt"], rng);
  const coefficient = randomNonZero(-4, 4, rng);
  let a = randomNonZero(-5, 5, rng);
  let b = randomInteger(-7, 7, rng);
  let domain = REAL_DOMAIN;
  let points = DEFAULT_POINTS;

  if (["reciprocal", "sqrt"].includes(kind)) {
    const root = randomInteger(-4, 4, rng);
    a = kind === "sqrt" ? randomInteger(1, 4, rng) : a;
    b = -a * root;
    if (kind === "reciprocal") {
      domain = `\\mathbb R\\setminus\\{${root}\\}`;
      points = intervalAround(root, "right").points.concat(intervalAround(root, "left").points).slice(0, 8);
    } else {
      domain = `]${root},+\\infty[`;
      points = intervalAround(root, "right").points;
    }
  }

  const inner = linearForms(a, b);

  if (kind === "power") {
    const exponent = randomInteger(2, 6, rng);
    const expression = joinTerms([scaledTerm(coefficient, `((${inner.plain})^${exponent})`, latexPower(inner.latex, exponent))]);
    const derivative = joinTerms([scaledTerm(coefficient * exponent * a, `((${inner.plain})^${exponent - 1})`, latexPower(inner.latex, exponent - 1))]);
    return derivativeQuestion({
      variant: "composition-power",
      expression,
      derivative,
      ui: promptUi.derivativeComposition,
      explanation: chainRuleExplanation({
        coefficient,
        inner: inner.latex,
        innerDerivative: a,
        outer: `x^{${exponent}}`,
        outerDerivative: `${exponent}x^{${exponent - 1}}`,
        result: derivative.latex,
      }),
      courseHintIds: [],
    });
  }

  if (kind === "exponential") {
    const expression = joinTerms([scaledTerm(coefficient, `exp(${inner.plain})`, `\\mathrm e^{${inner.latex}}`)]);
    const derivative = joinTerms([scaledTerm(coefficient * a, `exp(${inner.plain})`, `\\mathrm e^{${inner.latex}}`)]);
    return derivativeQuestion({
      variant: "composition-exponential",
      expression,
      derivative,
      ui: promptUi.derivativeComposition,
      explanation: chainRuleExplanation({
        coefficient,
        inner: inner.latex,
        innerDerivative: a,
        outer: "\\mathrm e^x",
        outerDerivative: "\\mathrm e^x",
        result: derivative.latex,
      }),
      courseHintIds: [],
    });
  }

  if (kind === "sin" || kind === "cos") {
    const isSine = kind === "sin";
    const derivativeCoefficient = coefficient * a * (isSine ? 1 : -1);
    const derivativeKind = isSine ? "cos" : "sin";
    const expression = joinTerms([scaledTerm(coefficient, `${kind}(${inner.plain})`, `\\${kind}(${inner.latex})`)]);
    const derivative = joinTerms([scaledTerm(derivativeCoefficient, `${derivativeKind}(${inner.plain})`, `\\${derivativeKind}(${inner.latex})`)]);
    return derivativeQuestion({
      variant: `composition-${kind}`,
      expression,
      derivative,
      ui: promptUi.derivativeComposition,
      explanation: chainRuleExplanation({
        coefficient,
        inner: inner.latex,
        innerDerivative: a,
        outer: `\\${kind} x`,
        outerDerivative: isSine ? "\\cos(x)" : "-\\sin(x)",
        result: derivative.latex,
      }),
      courseHintIds: [],
    });
  }

  if (kind === "reciprocal") {
    const expression = { plain: `${coefficient}/(${inner.plain})`, latex: `\\frac{${coefficient}}{${inner.latex}}` };
    const derivative = { plain: `${-coefficient * a}/((${inner.plain})^2)`, latex: `\\frac{${-coefficient * a}}{${latexPower(inner.latex, 2)}}` };
    return derivativeQuestion({
      variant: "composition-reciprocal",
      expression,
      derivative,
      ui: promptUi.derivativeComposition,
      explanation: chainRuleExplanation({
        coefficient,
        inner: inner.latex,
        innerDerivative: a,
        outer: "\\dfrac1x",
        outerDerivative: "-\\dfrac1{x^2}",
        result: derivative.latex,
      }),
      courseHintIds: [],
      domain,
      points,
    });
  }

  const squareRootExpression = joinTerms([scaledTerm(coefficient, `sqrt(${inner.plain})`, `\\sqrt{${inner.latex}}`)]);
  const squareRootDerivative = {
    plain: `${coefficient * a}/(2*sqrt(${inner.plain}))`,
    latex: `\\frac{${coefficient * a}}{2\\sqrt{${inner.latex}}}`,
  };
  return derivativeQuestion({
    variant: "composition-square-root",
    expression: squareRootExpression,
    derivative: squareRootDerivative,
    ui: promptUi.derivativeComposition,
    explanation: chainRuleExplanation({
      coefficient,
      inner: inner.latex,
      innerDerivative: a,
      outer: "\\sqrt x",
      outerDerivative: "\\dfrac1{2\\sqrt x}",
      result: squareRootDerivative.latex,
    }),
    courseHintIds: [],
    domain,
    points,
  });
}

function compositeProductDerivative(rng) {
  const a = randomNonZero(-3, 3, rng);
  const b = randomInteger(-4, 4, rng);
  const c = randomNonZero(-3, 3, rng);
  const d = randomInteger(-4, 4, rng);
  const exponentialInner = linearForms(a, b);
  const trigInner = linearForms(c, d);
  const expression = {
    plain: `exp(${exponentialInner.plain})*sin(${trigInner.plain})`,
    latex: `\\mathrm e^{${exponentialInner.latex}}\\sin(${trigInner.latex})`,
  };
  const insideDerivative = joinTerms([
    scaledTerm(a, `sin(${trigInner.plain})`, `\\sin(${trigInner.latex})`),
    scaledTerm(c, `cos(${trigInner.plain})`, `\\cos(${trigInner.latex})`),
  ]);
  const derivative = {
    plain: `exp(${exponentialInner.plain})*(${insideDerivative.plain})`,
    latex: `\\mathrm e^{${exponentialInner.latex}}\\left(${insideDerivative.latex}\\right)`,
  };

  return derivativeQuestion({
    variant: "composed-product",
    expression,
    derivative,
    ui: promptUi.derivativeProduct,
    explanation: translated(
      `On pose $u(t)=\\mathrm e^{${exponentialInner.latex}}$ et $v(t)=\\sin(${trigInner.latex})$. Alors
      $$u'(t)=${latexScaled(a, `\\mathrm e^{${exponentialInner.latex}}`)}
      \\quad\\text{et}\\quad
      v'(t)=${latexScaled(c, `\\cos(${trigInner.latex})`)}.$$
      On obtient
      $$f'(t)=u'(t)v(t)+u(t)v'(t).$$
      d'où
      $$f'(t)=${derivative.latex}.$$`,
      `Let $u(t)=\\mathrm e^{${exponentialInner.latex}}$ and $v(t)=\\sin(${trigInner.latex})$. Then
      $$u'(t)=${latexScaled(a, `\\mathrm e^{${exponentialInner.latex}}`)}
      \\quad\\text{and}\\quad
      v'(t)=${latexScaled(c, `\\cos(${trigInner.latex})`)}.$$
      Thus
      $$f'(t)=u'(t)v(t)+u(t)v'(t).$$
      $$f'(t)=${derivative.latex}.$$`,
    ),
    courseHintIds: [],
  });
}

function derivativeGenerator(level, rng) {
  const pools = {
    1: [{ weight: 1, make: usualDerivative }],
    2: [
      { weight: 2, make: sumDerivative },
      { weight: 2, make: productDerivative },
      { weight: 2, make: quotientDerivative },
      { weight: 1, make: usualDerivative },
    ],
    3: [
      { weight: 4, make: composedDerivative },
      { weight: 2, make: compositeProductDerivative },
      { weight: 1, make: sumDerivative },
      { weight: 1, make: quotientDerivative },
    ],
  };

  return weightedPick(pools[levelNumber(level)], rng).make(rng);
}

function usualPrimitive(rng) {
  const kind = pickRandom(["power", "exponential", "cos", "sin", "reciprocal", "shifted-reciprocal", "sqrt"], rng);
  const multiplier = randomNonZero(-4, 4, rng);

  if (kind === "power") {
    const exponent = randomInteger(0, 5, rng);
    const nextExponent = exponent + 1;
    const integrand = joinTerms([scaledTerm(multiplier * nextExponent, powerBody(exponent).plain, powerBody(exponent).latex)]);
    const primitive = joinTerms([scaledTerm(multiplier, powerBody(nextExponent).plain, powerBody(nextExponent).latex)]);
    return primitiveQuestion({
      variant: "usual-power",
      integrand,
      primitive,
      ui: promptUi.primitiveUsual,
      explanation: translated(
        `Comme une primitive de $t\\mapsto t^n$ est $t\\mapsto\\frac{t^{n+1}}{n+1}$, on obtient
        $$F(t)=${primitive.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
        `Since an antiderivative of $t\\mapsto t^n$ is $t\\mapsto\\frac{t^{n+1}}{n+1}$,
        $$F(t)=${primitive.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
      ),
      courseHintIds: [],
    });
  }

  if (kind === "exponential") {
    const expression = joinTerms([scaledTerm(multiplier, "exp(t)", "\\mathrm e^t")]);
    return primitiveQuestion({
      variant: "usual-exponential",
      integrand: expression,
      primitive: expression,
      ui: promptUi.primitiveUsual,
      explanation: translated(
        `Comme une primitive de $t\\mapsto\\mathrm e^t$ est $t\\mapsto\\mathrm e^t$, on obtient
        $$F(t)=${expression.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
        `Since an antiderivative of $t\\mapsto\\mathrm e^t$ is $t\\mapsto\\mathrm e^t$,
        $$F(t)=${expression.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
      ),
      courseHintIds: [],
    });
  }

  if (kind === "cos" || kind === "sin") {
    const isCosine = kind === "cos";
    const integrand = joinTerms([scaledTerm(multiplier, `${kind}(t)`, `\\${kind}(t)`)]);
    const primitive = joinTerms([scaledTerm(isCosine ? multiplier : -multiplier, isCosine ? "sin(t)" : "cos(t)", isCosine ? "\\sin(t)" : "\\cos(t)")]);
    return primitiveQuestion({
      variant: `usual-${kind}`,
      integrand,
      primitive,
      ui: promptUi.primitiveUsual,
      explanation: translated(
        `${isCosine
          ? "Une primitive de $t\\mapsto\\cos(t)$ est $t\\mapsto\\sin(t)$"
          : "Une primitive de $t\\mapsto\\sin(t)$ est $t\\mapsto-\\cos(t)$"
        }. On obtient donc
        $$F(t)=${primitive.latex}+C,\\,\\,C\\in\\mathbb R.$$`,

        `${isCosine
          ? "An antiderivative of $t\\mapsto\\cos(t)$ is $t\\mapsto\\sin(t)$"
          : "An antiderivative of $t\\mapsto\\sin(t)$ is $t\\mapsto-\\cos(t)$"
        }. Hence
        $$F(t)=${primitive.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
      ),
      courseHintIds: [],
    });
  }

  if (kind === "sqrt") {
    const integrand = joinTerms([scaledTerm(3 * multiplier, "sqrt(t)", "\\sqrt t")]);
    const primitive = joinTerms([scaledTerm(2 * multiplier, "t^(3/2)", "t^{3/2}")]);
    return primitiveQuestion({
      variant: "usual-square-root",
      integrand,
      primitive,
      ui: promptUi.primitiveUsual,
      explanation: translated(
        `On écrit $\\sqrt t=t^{1/2}$. Comme une primitive de $t\\mapsto t^{1/2}$ est $t\\mapsto\\frac23t^{3/2}$, on obtient
        $$F(t)=${primitive.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
        `Write $\\sqrt t=t^{1/2}$. Since an antiderivative of $t\\mapstot^{1/2}$ is $t\\mapsto\\frac23t^{3/2}$,
        $$F(t)=${primitive.latex}+C, C\\in\\mathbb R.$$`,
      ),
      courseHintIds: [],
      domain: POSITIVE_DOMAIN,
      points: POSITIVE_POINTS,
    });
  }

  const shift = kind === "reciprocal" ? 0 : randomNonZero(-5, 5, rng);
  const side = pickRandom(["left", "right"], rng);
  const interval = intervalAround(shift, side);
  const denominator = linearForms(1, -shift);
  const logArgument = side === "right" ? denominator : linearForms(-1, shift);
  const integrand = { plain: `${multiplier}/(${denominator.plain})`, latex: `\\frac{${multiplier}}{${denominator.latex}}` };
  const primitive = joinTerms([scaledTerm(multiplier, `ln(${logArgument.plain})`, `\\ln(${logArgument.latex})`)]);

  return primitiveQuestion({
    variant: kind,
    integrand,
    primitive,
    ui: promptUi.primitiveUsual,
    explanation: translated(
      `Sur $I$, le logarithme est bien défini. On obtient donc
      $$F(t)=${primitive.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
      `On $I$, the logarithm is well defined. Hence
      $$F(t)=${primitive.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
    ),
    hints: [],
    courseHintIds: [],
    domain: interval.latex,
    points: interval.points,
  });
}

function sumPrimitive(rng) {
  const exponent = randomInteger(1, 4, rng);
  const polynomialMultiplier = randomNonZero(-3, 3, rng);
  const exponentialCoefficient = randomNonZero(-5, 5, rng);
  const trigCoefficient = randomNonZero(-4, 4, rng);
  const integrand = joinTerms([
    scaledTerm(polynomialMultiplier * (exponent + 1), powerBody(exponent).plain, powerBody(exponent).latex),
    scaledTerm(exponentialCoefficient, "exp(t)", "\\mathrm e^t"),
    scaledTerm(trigCoefficient, "cos(t)", "\\cos(t)"),
  ]);
  const primitive = joinTerms([
    scaledTerm(polynomialMultiplier, powerBody(exponent + 1).plain, powerBody(exponent + 1).latex),
    scaledTerm(exponentialCoefficient, "exp(t)", "\\mathrm e^t"),
    scaledTerm(trigCoefficient, "sin(t)", "\\sin(t)"),
  ]);

  return primitiveQuestion({
    variant: "sum",
    integrand,
    primitive,
    ui: promptUi.primitiveSum,
    explanation: translated(
      `Par linéarité, on cherche une primitive de chaque terme séparément. On obtient
      $$F(t)=${primitive.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
      `By linearity, integrate each term separately. Thus
      $$F(t)=${primitive.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
    ),
    hints: [],
    courseHintIds: [],
  });
}

function composedPrimitive(rng) {
  const kind = pickRandom(["power", "exponential", "cos", "sin", "log", "sqrt"], rng);
  const a = kind === "sqrt" || kind === "log" ? randomInteger(1, 4, rng) : randomNonZero(-4, 4, rng);
  const multiplier = randomNonZero(-3, 3, rng);
  let b = randomInteger(-6, 6, rng);
  let domain = REAL_DOMAIN;
  let points = DEFAULT_POINTS;
  let inner = linearForms(a, b);

  if (kind === "sqrt" || kind === "log") {
    const root = randomInteger(-4, 4, rng);
    b = -a * root;
    inner = linearForms(a, b);
    const side = kind === "sqrt" ? "right" : pickRandom(["left", "right"], rng);
    const interval = intervalAround(root, side);
    domain = interval.latex;
    points = interval.points;

    if (kind === "log") {
      const positiveArgument = side === "right" ? inner : linearForms(-a, -b);
      const integrand = { plain: `${multiplier * a}/(${inner.plain})`, latex: `\\frac{${multiplier * a}}{${inner.latex}}` };
      const primitive = joinTerms([scaledTerm(multiplier, `ln(${positiveArgument.plain})`, `\\ln(${positiveArgument.latex})`)]);
      return primitiveQuestion({
        variant: "composition-logarithm",
        integrand,
        primitive,
        ui: promptUi.primitiveComposition,
        explanation: reverseChainExplanation({
          factor: multiplier,
          inner: inner.latex,
          innerDerivative: a,
          outer: "\\dfrac1x",
          outerPrimitive: "\\ln|x|",
          result: primitive.latex,
        }),
        courseHintIds: [],
        domain,
        points,
      });
    }
  }

  if (kind === "power") {
    const exponent = randomInteger(1, 4, rng);
    const integrandCoefficient = multiplier * a * (exponent + 1);
    const integrand = joinTerms([scaledTerm(integrandCoefficient, `((${inner.plain})^${exponent})`, latexPower(inner.latex, exponent))]);
    const primitive = joinTerms([scaledTerm(multiplier, `((${inner.plain})^${exponent + 1})`, latexPower(inner.latex, exponent + 1))]);
    return primitiveQuestion({
      variant: "composition-power",
      integrand,
      primitive,
      ui: promptUi.primitiveComposition,
      explanation: reverseChainExplanation({
        factor: multiplier,
        inner: inner.latex,
        innerDerivative: a,
        outer: `${exponent + 1}x^{${exponent}}`,
        outerPrimitive: `x^{${exponent + 1}}`,
        result: primitive.latex,
      }),
      courseHintIds: [],
    });
  }

  if (kind === "exponential") {
    const integrand = joinTerms([scaledTerm(multiplier * a, `exp(${inner.plain})`, `\\mathrm e^{${inner.latex}}`)]);
    const primitive = joinTerms([scaledTerm(multiplier, `exp(${inner.plain})`, `\\mathrm e^{${inner.latex}}`)]);
    return primitiveQuestion({
      variant: "composition-exponential",
      integrand,
      primitive,
      ui: promptUi.primitiveComposition,
      explanation: reverseChainExplanation({
        factor: multiplier,
        inner: inner.latex,
        innerDerivative: a,
        outer: "\\mathrm e^x",
        outerPrimitive: "\\mathrm e^x",
        result: primitive.latex,
      }),
      courseHintIds: [],
    });
  }

  if (kind === "cos" || kind === "sin") {
    const isCosine = kind === "cos";
    const integrandCoefficient = multiplier * a * (isCosine ? 1 : -1);
    const primitiveKind = isCosine ? "sin" : "cos";
    const integrand = joinTerms([scaledTerm(integrandCoefficient, `${kind}(${inner.plain})`, `\\${kind}(${inner.latex})`)]);
    const primitive = joinTerms([scaledTerm(multiplier, `${primitiveKind}(${inner.plain})`, `\\${primitiveKind}(${inner.latex})`)]);
    return primitiveQuestion({
      variant: `composition-${kind}`,
      integrand,
      primitive,
      ui: promptUi.primitiveComposition,
      explanation: reverseChainExplanation({
        factor: multiplier,
        inner: inner.latex,
        innerDerivative: a,
        outer: isCosine ? "\\cos(x)" : "-\\sin(x)",
        outerPrimitive: isCosine ? "\\sin(x)" : "\\cos(x)",
        result: primitive.latex,
      }),
      courseHintIds: [],
    });
  }

  const rootMultiplier = multiplier;
  return primitiveQuestion({
    variant: "composition-square-root",
    integrand: { plain: `${3 * rootMultiplier * a}*sqrt(${inner.plain})`, latex: latexScaled(3 * rootMultiplier * a, `\\sqrt{${inner.latex}}`) },
    primitive: { plain: `${2 * rootMultiplier}*((${inner.plain})^(3/2))`, latex: latexScaled(2 * rootMultiplier, latexPower(inner.latex, "3/2")) },
    ui: promptUi.primitiveComposition,
    explanation: reverseChainExplanation({
      factor: rootMultiplier,
      inner: inner.latex,
      innerDerivative: a,
      outer: "3\\sqrt x",
      outerPrimitive: "2x^{3/2}",
      result: latexScaled(2 * rootMultiplier, latexPower(inner.latex, "3/2")),
    }),
    courseHintIds: [],
    domain,
    points,
  });
}

function integrationByPartsPrimitive(rng) {
  const kind = pickRandom(["exponential", "cos", "sin", "repeated-exponential"], rng);
  const multiplier = randomNonZero(-3, 3, rng);

  if (kind === "repeated-exponential") {
    const integrand = joinTerms([scaledTerm(multiplier, "t^2*exp(t)", "t^2\\mathrm e^t")]);
    const primitive = joinTerms([scaledTerm(multiplier, "(t^2-2*t+2)*exp(t)", "(t^2-2t+2)\\mathrm e^t")]);
    return primitiveQuestion({
      variant: "parts-repeated-exponential",
      integrand,
      primitive,
      ui: promptUi.primitiveParts,
      explanation: translated(
        `On pose $u(t)=t^2$ et $v'(t)=\\mathrm e^t$. Alors $u'(t)=2t$ et $v(t)=\\mathrm e^t$. Une première IPP donne
        $$\\int t^2\\mathrm e^t\\,dt=t^2\\mathrm e^t-\\int 2t\\mathrm e^t\\,dt.$$
        En appliquant une seconde IPP à la dernière intégrale, on obtient
        $$F(t)=${primitive.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
        `Let $u(t)=t^2$ and $v'(t)=\\mathrm e^t$. Then $u'(t)=2t$ and $v(t)=\\mathrm e^t$. A first integration by parts gives
        $$\\int t^2\\mathrm e^t\\,dt=t^2\\mathrm e^t-\\int 2t\\mathrm e^t\\,dt.$$
        Applying integration by parts once more gives
        $$F(t)=${primitive.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
      ),
      courseHintIds: [],
    });
  }

  const a = randomNonZero(-3, 3, rng);
  const argument = linearForms(a, 0);

  if (kind === "exponential") {
    const primitive = joinTerms([scaledTerm(multiplier, `(${a}*t-1)*exp(${argument.plain})`, `(${latexScaled(a, "t")}-1)\\mathrm e^{${argument.latex}}`)]);
    return primitiveQuestion({
      variant: "parts-exponential",
      integrand: { plain: `${multiplier * a * a}*t*exp(${argument.plain})`, latex: `${latexScaled(multiplier * a * a, "t")}\\mathrm e^{${argument.latex}}` },
      primitive,
      ui: promptUi.primitiveParts,
      explanation: translated(
        `On pose $u(t)=t$ et $v'(t)=\\mathrm e^{${argument.latex}}$. Alors $u'(t)=1$ et
        $$v(t)=\\frac{\\mathrm e^{${argument.latex}}}{${latexSignedNumber(a)}}.$$
        Par intégration par parties,
        $$\\int uv'=uv-\\int u'v,$$
        d'où
        $$F(t)=${primitive.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
        `Let $u(t)=t$ and $v'(t)=\\mathrm e^{${argument.latex}}$. Then $u'(t)=1$ and
        $$v(t)=\\frac{\\mathrm e^{${argument.latex}}}{${latexSignedNumber(a)}}.$$
        By integration by parts,
        $$\\int uv'=uv-\\int u'v,$$
        hence
        $$F(t)=${primitive.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
      ),
      courseHintIds: [],
    });
  }

  if (kind === "cos") {
    const innerPrimitive = joinTerms([
      scaledTerm(a, `t*sin(${argument.plain})`, `t\\sin(${argument.latex})`),
      scaledTerm(1, `cos(${argument.plain})`, `\\cos(${argument.latex})`),
    ]);
    const primitive = joinTerms([scaledTerm(multiplier, `(${innerPrimitive.plain})`, `(${innerPrimitive.latex})`)]);
    return primitiveQuestion({
      variant: "parts-cosine",
      integrand: { plain: `${multiplier * a * a}*t*cos(${argument.plain})`, latex: `${latexScaled(multiplier * a * a, "t")}\\cos(${argument.latex})` },
      primitive,
      ui: promptUi.primitiveParts,
      explanation: translated(
        `On pose $u(t)=t$ et $v'(t)=\\cos(${argument.latex})$. Alors $u'(t)=1$ et
        $$v(t)=\\frac{\\sin(${argument.latex})}{${latexSignedNumber(a)}}.$$
        Par intégration par parties,
        $$\\int uv'=uv-\\int u'v,$$
        d'où
        $$F(t)=${primitive.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
        `Let $u(t)=t$ and $v'(t)=\\cos(${argument.latex})$. Then $u'(t)=1$ and
        $$v(t)=\\frac{\\sin(${argument.latex})}{${latexSignedNumber(a)}}.$$
        By integration by parts,
        $$\\int uv'=uv-\\int u'v,$$
        hence
        $$F(t)=${primitive.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
      ),
      courseHintIds: [],
    });
  }

  const innerPrimitive = joinTerms([
    scaledTerm(-a, `t*cos(${argument.plain})`, `t\\cos(${argument.latex})`),
    scaledTerm(1, `sin(${argument.plain})`, `\\sin(${argument.latex})`),
  ]);
  const primitive = joinTerms([scaledTerm(multiplier, `(${innerPrimitive.plain})`, `(${innerPrimitive.latex})`)]);
  return primitiveQuestion({
    variant: "parts-sine",
    integrand: { plain: `${multiplier * a * a}*t*sin(${argument.plain})`, latex: `${latexScaled(multiplier * a * a, "t")}\\sin(${argument.latex})` },
    primitive,
    ui: promptUi.primitiveParts,
    explanation: translated(
      `On pose $u(t)=t$ et $v'(t)=\\sin(${argument.latex})$. Alors $u'(t)=1$ et
        $$v(t)=-\\frac{\\cos(${argument.latex})}{${latexSignedNumber(a)}}.$$
        Par intégration par parties,
        $$\\int uv'=uv-\\int u'v,$$
        d'où
        $$F(t)=${primitive.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
      `Let $u(t)=t$ and $v'(t)=\\sin(${argument.latex})$. Then $u'(t)=1$ and
        $$v(t)=-\\frac{\\cos(${argument.latex})}{${latexSignedNumber(a)}}.$$
        By integration by parts,
        $$\\int uv'=uv-\\int u'v,$$
        hence
        $$F(t)=${primitive.latex}+C,\\,\\,C\\in\\mathbb R.$$`,
    ),
    courseHintIds: [],
  });
}

function primitiveGenerator(level, rng) {
  const pools = {
    1: [{ weight: 1, make: usualPrimitive }],
    2: [
      { weight: 2, make: sumPrimitive },
      { weight: 3, make: composedPrimitive },
      { weight: 1, make: usualPrimitive },
    ],
    3: [
      { weight: 4, make: integrationByPartsPrimitive },
      { weight: 2, make: composedPrimitive },
      { weight: 1, make: sumPrimitive },
    ],
  };
  return weightedPick(pools[levelNumber(level)], rng).make(rng);
}

function polynomialInitialCondition(rng) {
  const exponent = randomInteger(2, 4, rng);
  const coefficient = randomNonZero(-3, 3, rng);
  const linearCoefficient = randomNonZero(-5, 5, rng);
  const conditionPoint = randomInteger(-2, 2, rng);
  const constant = randomInteger(-7, 7, rng);
  const basePrimitive = joinTerms([
    scaledTerm(coefficient, powerBody(exponent).plain, powerBody(exponent).latex),
    scaledTerm(linearCoefficient, "t", "t"),
  ]);
  const integrand = joinTerms([
    scaledTerm(coefficient * exponent, powerBody(exponent - 1).plain, powerBody(exponent - 1).latex),
    scaledTerm(linearCoefficient),
  ]);
  const primitive = joinTerms([
    scaledTerm(coefficient, powerBody(exponent).plain, powerBody(exponent).latex),
    scaledTerm(linearCoefficient, "t", "t"),
    scaledTerm(constant),
  ]);
  const conditionValue = coefficient * (conditionPoint ** exponent) + linearCoefficient * conditionPoint + constant;

  return uniquePrimitiveQuestion({
    variant: "initial-polynomial",
    integrand,
    primitive,
    conditionPoint,
    conditionValue,
    explanation: translated(
      `Les primitives sont de la forme
      $$F(t)=${basePrimitive.latex}+C.$$
      La condition $F(${conditionPoint})=${conditionValue}$ donne $C=${constant}$. Ainsi
      $$F(t)=${primitive.latex}.$$`,
      `The antiderivatives are
      $$F(t)=${basePrimitive.latex}+C.$$
      The condition $F(${conditionPoint})=${conditionValue}$ gives $C=${constant}$. Hence
      $$F(t)=${primitive.latex}.$$`,
    ),
    courseHintIds: [],
  });
}

function trigonometricInitialCondition(rng) {
  const kind = pickRandom(["sine-primitive", "cosine-primitive"], rng);
  const coefficient = randomNonZero(-5, 5, rng);
  const constant = randomInteger(-7, 7, rng);
  const conditionPoint = 0;

  if (kind === "sine-primitive") {
    const integrand = joinTerms([scaledTerm(coefficient, "cos(t)", "\\cos(t)")]);
    const primitive = joinTerms([
      scaledTerm(coefficient, "sin(t)", "\\sin(t)"),
      scaledTerm(constant),
    ]);
    return uniquePrimitiveQuestion({
      variant: "initial-sine",
      integrand,
      primitive,
      conditionPoint,
      conditionValue: constant,
      explanation: translated(
        `Les primitives sont de la forme
        $$F(t)=${latexScaled(coefficient, "\\sin(t)")}+C.$$
        Comme $\\sin(0)=0$, la condition $F(0)=${constant}$ donne $C=${constant}$.`,
        `The antiderivatives are
        $$F(t)=${latexScaled(coefficient, "\\sin(t)")}+C.$$
        Since $\\sin(0)=0$, the condition $F(0)=${constant}$ gives $C=${constant}$.`,
      ),
      courseHintIds: [],
    });
  }

  const integrand = joinTerms([scaledTerm(-coefficient, "sin(t)", "\\sin(t)")]);
  const primitive = joinTerms([
    scaledTerm(coefficient, "cos(t)", "\\cos(t)"),
    scaledTerm(constant),
  ]);
  return uniquePrimitiveQuestion({
    variant: "initial-cosine",
    integrand,
    primitive,
    conditionPoint,
    conditionValue: coefficient + constant,
    explanation: translated(
      `Les primitives sont de la forme
      $$F(t)=${latexScaled(coefficient, "\\cos(t)")}+C.$$
      Comme $\\cos(0)=1$, la condition $F(0)=${coefficient + constant}$ donne $C=${constant}$.`,
      `The antiderivatives are
      $$F(t)=${latexScaled(coefficient, "\\cos(t)")}+C.$$
      Since $\\cos(0)=1$, the condition $F(0)=${coefficient + constant}$ gives $C=${constant}$.`,
    ),
    courseHintIds: [],
  });
}

function composedInitialCondition(rng) {
  const kind = pickRandom(["exponential", "power", "logarithm", "square-root"], rng);
  const multiplier = randomNonZero(-3, 3, rng);
  const constant = randomInteger(-7, 7, rng);

  if (kind === "exponential") {
    const a = randomNonZero(-3, 3, rng);
    const inner = linearForms(a, 0);
    const integrand = { plain: `${multiplier * a}*exp(${inner.plain})`, latex: latexScaled(multiplier * a, `\\mathrm e^{${inner.latex}}`) };
    const primitive = joinTerms([
      scaledTerm(multiplier, `exp(${inner.plain})`, `\\mathrm e^{${inner.latex}}`),
      scaledTerm(constant),
    ]);
    return uniquePrimitiveQuestion({
      variant: "initial-composed-exponential",
      integrand,
      primitive,
      conditionPoint: 0,
      conditionValue: multiplier + constant,
      explanation: translated(
        `Les primitives sont de la forme
        $$F(t)=${latexScaled(multiplier, `\\mathrm e^{${inner.latex}}`)}+C.$$
        Comme $\\mathrm e^0=1$, la condition $F(0)=${multiplier + constant}$ donne $C=${constant}$.`,
        `The antiderivatives are
        $$F(t)=${latexScaled(multiplier, `\\mathrm e^{${inner.latex}}`)}+C.$$
        Since $\\mathrm e^0=1$, the condition $F(0)=${multiplier + constant}$ gives $C=${constant}$.`,
      ),
      courseHintIds: [],
    });
  }

  if (kind === "power") {
    const a = randomNonZero(-3, 3, rng);
    const exponent = randomInteger(2, 4, rng);
    const inner = linearForms(a, 0);
    const integrand = { plain: `${multiplier * exponent * a}*((${inner.plain})^${exponent - 1})`, latex: latexScaled(multiplier * exponent * a, latexPower(inner.latex, exponent - 1)) };
    const primitive = joinTerms([
      scaledTerm(multiplier, `((${inner.plain})^${exponent})`, latexPower(inner.latex, exponent)),
      scaledTerm(constant),
    ]);
    return uniquePrimitiveQuestion({
      variant: "initial-composed-power",
      integrand,
      primitive,
      conditionPoint: 0,
      conditionValue: constant,
      explanation: translated(
        `Les primitives sont de la forme
        $$F(t)=${latexScaled(multiplier, latexPower(inner.latex, exponent))}+C.$$
        La condition $F(0)=${constant}$ donne $C=${constant}$.`,
        `The antiderivatives are
        $$F(t)=${latexScaled(multiplier, latexPower(inner.latex, exponent))}+C.$$
        The condition $F(0)=${constant}$ gives $C=${constant}$.`,
      ),
      courseHintIds: [],
    });
  }

  const root = randomInteger(-4, 4, rng);
  const interval = intervalAround(root, "right");
  const shifted = linearForms(1, -root);

  if (kind === "logarithm") {
    const integrand = { plain: `${multiplier}/(${shifted.plain})`, latex: `\\frac{${multiplier}}{${shifted.latex}}` };
    const primitive = joinTerms([
      scaledTerm(multiplier, `ln(${shifted.plain})`, `\\ln(${shifted.latex})`),
      scaledTerm(constant),
    ]);
    return uniquePrimitiveQuestion({
      variant: "initial-logarithm",
      integrand,
      primitive,
      conditionPoint: root + 1,
      conditionValue: constant,
      explanation: translated(
        `Les primitives sont de la forme
        $$F(t)=${latexScaled(multiplier, `\\ln(${shifted.latex})`)}+C.$$
        Au point $t=${root + 1}$, on a $\\ln 1=0$. La condition $F(${root + 1})=${constant}$ donne donc $C=${constant}$.`,
        `The antiderivatives are
        $$F(t)=${latexScaled(multiplier, `\\ln(${shifted.latex})`)}+C.$$
        At $t=${root + 1}$, $\\ln 1=0$. The condition $F(${root + 1})=${constant}$ therefore gives $C=${constant}$.`,
      ),
      courseHintIds: [],
      domain: interval.latex,
      points: interval.points,
    });
  }

  const integrand = { plain: `${3 * multiplier}*sqrt(${shifted.plain})`, latex: `${3 * multiplier}\\sqrt{${shifted.latex}}` };
  const primitive = joinTerms([
    scaledTerm(2 * multiplier, `((${shifted.plain})^(3/2))`, latexPower(shifted.latex, "3/2")),
    scaledTerm(constant),
  ]);
  return uniquePrimitiveQuestion({
    variant: "initial-square-root",
    integrand,
    primitive,
    conditionPoint: root + 1,
    conditionValue: 2 * multiplier + constant,
    explanation: translated(
      `Les primitives sont de la forme
      $$F(t)=${latexScaled(2 * multiplier, latexPower(shifted.latex, "3/2"))}+C.$$
      Comme $${shifted.latex}=1$ au point $t=${root + 1}$, la condition $F(${root + 1})=${2 * multiplier + constant}$ donne $C=${constant}$.`,
      `The antiderivatives are
      $$F(t)=${latexScaled(2 * multiplier, latexPower(shifted.latex, "3/2"))}+C.$$
      Since $${shifted.latex}=1$ at $t=${root + 1}$, the condition $F(${root + 1})=${2 * multiplier + constant}$ gives $C=${constant}$.`,
    ),
    courseHintIds: [],
    domain: interval.latex,
    points: interval.points,
  });
}

function advancedInitialCondition(rng) {
  const kind = pickRandom(["parts", "mixed"], rng);
  const multiplier = randomNonZero(-3, 3, rng);
  const constant = randomInteger(-7, 7, rng);

  if (kind === "parts") {
    const a = randomNonZero(-3, 3, rng);
    const inner = linearForms(a, 0);
    const integrand = { plain: `${multiplier * a * a}*t*exp(${inner.plain})`, latex: `${latexScaled(multiplier * a * a, "t")}\\mathrm e^{${inner.latex}}` };
    const basePrimitive = { plain: `${multiplier}*(${a}*t-1)*exp(${inner.plain})`, latex: latexScaled(multiplier, `(${latexScaled(a, "t")}-1)\\mathrm e^{${inner.latex}}`) };
    const primitive = joinTerms([
      scaledTerm(multiplier, `(${a}*t-1)*exp(${inner.plain})`, `(${latexScaled(a, "t")}-1)\\mathrm e^{${inner.latex}}`),
      scaledTerm(constant),
    ]);
    return uniquePrimitiveQuestion({
      variant: "initial-parts",
      integrand,
      primitive,
      conditionPoint: 0,
      conditionValue: -multiplier + constant,
      explanation: translated(
        `Après intégration par parties, les primitives sont
        $$F(t)=${basePrimitive.latex}+C.$$
        La condition $F(0)=${-multiplier + constant}$ donne $C=${constant}$. Ainsi
        $$F(t)=${primitive.latex}.$$`,
        `After integration by parts, the antiderivatives are
        $$F(t)=${basePrimitive.latex}+C.$$
        The condition $F(0)=${-multiplier + constant}$ gives $C=${constant}$. Hence
        $$F(t)=${primitive.latex}.$$`,
      ),
      courseHintIds: [],
    });
  }

  const polynomialCoefficient = randomNonZero(-3, 3, rng);
  const exponentialCoefficient = randomNonZero(-3, 3, rng);
  const integrand = joinTerms([
    scaledTerm(2 * polynomialCoefficient, "t", "t"),
    scaledTerm(exponentialCoefficient, "exp(t)", "\\mathrm e^t"),
    scaledTerm(-multiplier, "sin(t)", "\\sin(t)"),
  ]);
  const basePrimitive = joinTerms([
    scaledTerm(polynomialCoefficient, "t^2", "t^2"),
    scaledTerm(exponentialCoefficient, "exp(t)", "\\mathrm e^t"),
    scaledTerm(multiplier, "cos(t)", "\\cos(t)"),
  ]);
  const primitive = joinTerms([
    scaledTerm(polynomialCoefficient, "t^2", "t^2"),
    scaledTerm(exponentialCoefficient, "exp(t)", "\\mathrm e^t"),
    scaledTerm(multiplier, "cos(t)", "\\cos(t)"),
    scaledTerm(constant),
  ]);
  const baseAtZero = exponentialCoefficient + multiplier;
  return uniquePrimitiveQuestion({
    variant: "initial-mixed-sum",
    integrand,
    primitive,
    conditionPoint: 0,
    conditionValue: baseAtZero + constant,
    explanation: translated(
      `Par linéarité, les primitives sont
      $$F(t)=${basePrimitive.latex}+C.$$
      La condition $F(0)=${baseAtZero + constant}$ donne $C=${constant}$. Ainsi
      $$F(t)=${primitive.latex}.$$`,
      `By linearity, the antiderivatives are
      $$F(t)=${basePrimitive.latex}+C.$$
      The condition $F(0)=${baseAtZero + constant}$ gives $C=${constant}$. Hence
      $$F(t)=${primitive.latex}.$$`,
    ),
    courseHintIds: [],
  });
}

function initialConditionGenerator(level, rng) {
  const pools = {
    1: [
      { weight: 3, make: polynomialInitialCondition },
      { weight: 2, make: trigonometricInitialCondition },
    ],
    2: [
      { weight: 4, make: composedInitialCondition },
      { weight: 1, make: polynomialInitialCondition },
    ],
    3: [
      { weight: 4, make: advancedInitialCondition },
      { weight: 2, make: composedInitialCondition },
      { weight: 1, make: polynomialInitialCondition },
    ],
  };
  return weightedPick(pools[levelNumber(level)], rng).make(rng);
}

export function generateCalculusQuestion({ difficulty, level, rng = Math.random }) {
  if (difficulty === "primitives") return primitiveGenerator(level, rng);
  if (difficulty === "primitive-condition") return initialConditionGenerator(level, rng);
  return derivativeGenerator(level, rng);
}

const STANDARD_SERIES = {
  questionCount: 10,
  choices: [5, 10, 15, 20],
  allowQuestionCount: true,
};

const ALL_COURSE_HINTS = [
  "calculus-usual-derivatives",
  "calculus-derivative-rules",
  "calculus-chain-rule",
  "calculus-usual-primitives",
  "calculus-linearity",
  "calculus-reverse-chain-rule",
  "calculus-integration-by-parts",
  "calculus-initial-condition",
  "calculus-domains",
];

export const calculusTool = {
  id: "derivees-primitives",
  categoryId: CATEGORY_ID,
  mode: "practice",
  title: translated("Dérivées et primitives", "Derivatives and antiderivatives"),
  description: translated(
    "S’entraîner sur les fonctions usuelles et les techniques classiques de dérivation et de calcul de primitives.",
    "Practice common functions and the classical techniques for differentiation and finding antiderivatives.",
  ),
  exercises: [
    {
      id: "derivatives",
      color: "sky",
      levels: [1, 2, 3],
      defaultLevel: 1,
      label: translated("Calculer une dérivée", "Find a derivative"),
      description: translated("Fonctions usuelles, sommes, produits, quotients et compositions.", "Standard functions, sums, products, quotients and compositions."),
      promptUi: promptUi.derivativeUsual,
    },
    {
      id: "primitives",
      color: "violet",
      levels: [1, 2, 3],
      defaultLevel: 1,
      label: translated("Déterminer des primitives", "Find antiderivatives"),
      description: translated("Primitives usuelles, linéarité, compositions et intégration par parties.", "Standard antiderivatives, linearity, compositions and integration by parts."),
      promptUi: promptUi.primitiveUsual,
    },
    {
      id: "primitive-condition",
      color: "gold",
      levels: [1, 2, 3],
      defaultLevel: 1,
      label: translated("Primitive avec condition initiale", "Antiderivative with an initial condition"),
      description: translated("Déterminer l'unique primitive satisfaisant une valeur imposée.", "Find the unique antiderivative satisfying a prescribed value."),
      promptUi: promptUi.initialCondition,
    },
  ],
  defaultExercise: "derivatives",
  timer: false,
  series: STANDARD_SERIES,
  score: true,
  source: {
    type: "generator",
    generate: ({ difficulty, level, rng }) => generateCalculusQuestion({ difficulty, level, rng }),
  },
  answer: {
    type: "text",
    inputMode: "text",
    placeholder: translated("ex. 3*t^2 + 2*cos(t)", "e.g. 3*t^2 + 2*cos(t)"),
    validator: validateCalculusAnswer,
  },
  feedback: {
    showCorrection: true,
    showExplanation: true,
    showInsight: false,
    showCourseHintOnError: false,
    nextQuestion: true,
  },
  courseHintIds: "",
};

export const calculusTools = [calculusTool];

export default calculusTools;
