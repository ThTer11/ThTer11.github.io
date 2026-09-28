import { formatGeneratedOdeExpression as tex } from "../math/odeFormatting";
const step = (title, body) => `<section><h4>${title}</h4>${body}</section>`;
const coefficientProduct = (coefficient, symbol) => coefficient === "1" ? symbol : coefficient === "-1" ? `-${symbol}` : `${tex(coefficient)}${symbol}`;
const opposite = (expression) => /^-?\d+(?:\.\d+)?$/.test(expression) ? String(-Number(expression)) : expression.startsWith("-(") && expression.endsWith(")") ? expression.slice(2, -1) : expression.startsWith("-") ? expression.slice(1) : `-(${expression})`;
const sumTex = (left, right) => `${left}${String(right).startsWith("-") ? "" : "+"}${tex(right)}`;
const resolvedPrimitiveWork = (content, coefficient, primitive) => {
  const coefficientSource = `:t\\mapsto ${tex(coefficient)}`;
  const primitiveSource = `:t\\mapsto ${tex(primitive)}`;
  let result = content.split(coefficientSource).join(`:t\\mapsto ${tex(opposite(coefficient))}`);
  result = result.split(primitiveSource).join(`:t\\mapsto ${tex(opposite(primitive))}`);
  return result;
};

/** Short worked calculations; the general theorem lives in the single course reminder. */
export function odeExplanation({ level, homogeneousOnly, unique, a, A, h, p, b, form, parameters, variation, work, family, expected, t0, y0, constant, conditionExpression }) {
  const result = {};
  for (const lang of ["fr", "en"]) {
    const fr = lang === "fr", steps = [];
    const resolvedCoefficient = opposite(a);
    steps.push(step(fr ? "1. Primitive de $a$" : "1. Antiderivative of $a$",
      (fr ? "On réécrit l’équation sous la forme" : "Rewrite the equation in the form")
      + `$$y^{\\prime}(t)=a(t)y(t)+b(t),\\qquad a(t)=${tex(resolvedCoefficient)},\\quad b(t)=${tex(b)}.$$`
      + resolvedPrimitiveWork(work[lang], a, A)));
    steps.push(step(fr ? "2. Solution homogène" : "2. Homogeneous solution",
      (fr ? "L’équation homogène associée est" : "The associated homogeneous equation is")
      + `$$y_H^{\\prime}(t)=a(t)y_H(t).$$`
      + (fr ? "Comme $A$ est une primitive de $a$ sur $I$, pour tout $t\\in I$," : "Since $A$ is an antiderivative of $a$ on $I$, for every $t\\in I$,")
      + `$$y_H(t)=C\\,e^{A(t)}=C\\,${tex(h)},\\quad C\\in\\mathbb R.$$`));

    if (!homogeneousOnly) {
      let body;
      if (variation) {
        body = (fr
          ? `Soit $u$ une fonction dérivable sur $I$. On pose $\\varphi:t\\mapsto u(t)e^{A(t)}=u(t)\\,${tex(h)}$. Pour tout $t\\in I$,`
          : `Let $u$ be differentiable on $I$. Set $\\varphi:t\\mapsto u(t)e^{A(t)}=u(t)\\,${tex(h)}$. For every $t\\in I$`)
          + `$$\\varphi\\text{${fr ? " est solution" : " is a solution"}}\\iff u^{\\prime}(t)=${tex(variation.q)}.$$`
          + (fr ? "En prenant la primitive" : "Taking the antiderivative")
          + `$$u:t\\mapsto ${tex(variation.U)},$$`
          + (fr ? "on peut choisir comme solution particulière" : "we may choose the particular solution")
          + `$$y_P:t\\mapsto ${tex(p)}.$$`;
      } else if (level === 1) {
        body = (fr
          ? `On cherche une solution particulière de la forme $y_P:t\\mapsto B$. Cette fonction est solution si et seulement si`
          : `Look for a particular solution of the form $y_P:t\\mapsto B$. It is a solution if and only if`)
          + `$$0=${sumTex(coefficientProduct(resolvedCoefficient, "B"), b)}.$$`
          + (fr ? "On trouve" : "This gives")
          + `$$B=${tex(p)}.$$`
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
