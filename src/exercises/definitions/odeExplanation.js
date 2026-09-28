import { formatGeneratedOdeExpression as tex } from "../math/odeFormatting";
const step = (title, body) => `<section><h4>${title}</h4>${body}</section>`;
const coefficientProduct = (coefficient, symbol) => coefficient === "1" ? symbol : coefficient === "-1" ? `-${symbol}` : `${tex(coefficient)}${symbol}`;

/** Short worked calculations; the general theorem lives in the single course reminder. */
export function odeExplanation({ level, homogeneousOnly, unique, a, h, p, b, form, parameters, variation, work, family, expected, t0, y0, constant, conditionExpression }) {
  const result = {};
  for (const lang of ["fr", "en"]) {
    const fr = lang === "fr", steps = [];
    steps.push(step(fr ? "1. Une primitive de $a$" : "1. An antiderivative of $a$", work[lang]));
    steps.push(step(fr ? "2. Solution homogène" : "2. Homogeneous solution",
      (fr ? "Donc, pour tout $t\\in I$, " : "Thus, for every $t\\in I$, ")
      + `$$y_H(t)=C\\,e^{-A(t)}=C\\,${tex(h)},\\quad C\\in\\mathbb R.$$`));

    if (!homogeneousOnly) {
      let body;
      if (variation) {
        body = (fr
          ? `Soit $u$ une fonction dérivable sur $I$. On pose $\\varphi:t\\mapsto u(t)\\,${tex(h)}$. Pour tout $t\\in I$,`
          : `Let $u$ be differentiable on $I$. Set $\\varphi:t\\mapsto u(t)\\,${tex(h)}$. For every $t\\in I$`)
          + `$$\\varphi\\text{${fr ? " est solution" : " is a solution"}}\\iff u'(t)=${tex(variation.q)}.$$`
          + (fr ? "En prenant la primitive" : "Taking the antiderivative")
          + `$$u:t\\mapsto ${tex(variation.U)},$$`
          + (fr ? "on peut choisir comme solution particulière" : "we may choose the particular solution")
          + `$$y_P:t\\mapsto ${tex(p)}.$$`;
      } else if (level === 1) {
        body = (fr
          ? `On cherche une solution particulière de la forme $y_P:t\\mapsto B$. Cette fonction est solution si et seulement si`
          : `Look for a particular solution of the form $y_P:t\\mapsto B$. It is a solution if and only if`)
          + `$$${coefficientProduct(a, "B")}=${tex(b)}.$$`
          + (fr ? "On choisit donc" : "Therefore choose")
          + `$$y_P:t\\mapsto ${tex(p)}.$$`;
      } else {
        const displayedParameters = parameters?.[lang] ?? parameters;
        body = (fr
          ? `On injecte une fonction $y_P:t\\mapsto ${form}$ dans l’équation différentielle. On trouve par exemple $$${displayedParameters}.$$ On choisit donc`
          : `Insert a function $y_P:t\\mapsto ${form}$ into the differential equation. For instance, this gives $$${displayedParameters}.$$ Therefore choose`)
          + `$$y_P:t\\mapsto ${tex(p)}.$$`;
      }
      steps.push(step(fr ? "3. Une solution particulière" : "3. A particular solution", body));
      steps.push(step(fr ? "4. Solutions générales" : "4. General solutions",
        (fr ? "On additionne cette solution particulière et les solutions homogènes :" : "Add this particular solution to the homogeneous solutions:")
        + `$$y:t\\mapsto ${family},\\quad C\\in\\mathbb R.$$`));
    }

    if (unique) {
      steps.push(step(fr ? "5. Condition initiale" : "5. Initial condition",
        (fr
          ? `Comme $y(${t0})=${y0}$, la constante $C$ vérifie`
          : `Since $y(${t0})=${y0}$, the constant $C$ satisfies`)
        + `$$${conditionExpression}=${y0}.$$`
        + (fr ? "On obtient donc" : "Thus")
        + `$$C=${tex(constant)}.$$`
        + (fr ? "La solution est unique et vaut" : "The solution is unique and is")
        + `$$y:t\\mapsto ${tex(expected)}.$$`));
    }
    result[lang] = steps.join("");
  }
  return result;
}
