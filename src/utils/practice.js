import { Fraction, parseFraction } from "./gauss";

const SQUAREFREE_POOL = [2, 3, 5, 6, 7, 10, 11, 13, 15];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(items) {
  return items[randInt(0, items.length - 1)];
}

function randomNonZeroInt(min, max) {
  let value = 0;

  while (value === 0) {
    value = randInt(min, max);
  }

  return value;
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y !== 0) {
    const remainder = x % y;
    x = y;
    y = remainder;
  }

  return x || 1;
}

function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

function fractionFromInt(value) {
  return new Fraction(BigInt(value), 1n);
}

function compareFractions(a, b) {
  return a.numerator * b.denominator === b.numerator * a.denominator;
}

function normalizeFractionList(values) {
  return [...new Map(values.map((value) => [value.toString(), value])).values()].sort((left, right) => {
    const diff = left.numerator * right.denominator - right.numerator * left.denominator;
    return diff < 0n ? -1 : diff > 0n ? 1 : 0;
  });
}

function latexSign(value, first = false) {
  if (value < 0) {
    return first ? "-" : " - ";
  }

  return first ? "" : " + ";
}

function formatMonomial(coefficient, variable, power = 1, first = false) {
  if (coefficient === 0) {
    return "";
  }

  const absolute = Math.abs(coefficient);
  const variablePart = power === 1 ? variable : `${variable}^{${power}}`;
  const coeffPart = absolute === 1 ? "" : `${absolute}`;
  return `${latexSign(coefficient, first)}${coeffPart}${variablePart}`;
}

function formatConstant(value, first = false) {
  if (value === 0) {
    return "";
  }

  return `${latexSign(value, first)}${Math.abs(value)}`;
}

function polynomialLatex(a, b, c) {
  const parts = [];

  if (a !== 0) {
    parts.push(formatMonomial(a, "x", 2, true));
  }
  if (b !== 0) {
    parts.push(formatMonomial(b, "x", 1, parts.length === 0));
  }
  if (c !== 0 || parts.length === 0) {
    parts.push(formatConstant(c, parts.length === 0));
  }

  return parts.join("");
}

function linearExpressionLatex(a, b) {
  const parts = [];

  if (a !== 0) {
    parts.push(formatMonomial(a, "x", 1, true));
  }
  if (b !== 0 || parts.length === 0) {
    parts.push(formatConstant(b, parts.length === 0));
  }

  return parts.join("");
}

function linearFactorLatex(numerator, denominator) {
  if (denominator === 1) {
    if (numerator === 0) {
      return "x";
    }

    return numerator > 0 ? `x - ${numerator}` : `x + ${Math.abs(numerator)}`;
  }

  if (numerator === 0) {
    return `${denominator}x`;
  }

  return numerator > 0
    ? `${denominator}x - ${numerator}`
    : `${denominator}x + ${Math.abs(numerator)}`;
}

function solutionSetLatex(values) {
  if (values.length === 0) {
    return "$$\\text{Aucune solution réelle}$$";
  }

  if (values.length === 1) {
    return `$$x = ${values[0].toLatex()}$$`;
  }

  return `$$x_1 = ${values[0].toLatex()} \\quad \\text{et} \\quad x_2 = ${values[1].toLatex()}$$`;
}

function quadraticCorrectionLatex(a, b, c, solutions) {
  const delta = b * b - 4 * a * c;
  const deltaLine = `$$\\Delta = (${b})^{2} - 4\\times ${a}\\times (${c}) = ${delta}$$`;

  if (delta < 0) {
    return `${deltaLine}$$\\Delta < 0 \\Rightarrow \\text{aucune solution réelle}$$`;
  }

  if (delta === 0) {
    return (
      `${deltaLine}` +
      `$$\\Delta = 0 \\Rightarrow x = \\frac{${-b}}{${2 * a}} = ${solutions[0].toLatex()}$$`
    );
  }

  return (
    `${deltaLine}` +
    `$$\\Delta > 0 \\Rightarrow x_1 = \\frac{${-b} - \\sqrt{${delta}}}{${2 * a}} = ${solutions[0].toLatex()}$$` +
    `$$x_2 = \\frac{${-b} + \\sqrt{${delta}}}{${2 * a}} = ${solutions[1].toLatex()}$$`
  );
}

function randomFraction(maxAbs = 9, denominators = [2, 3, 4, 5, 6, 7, 8, 9]) {
  const denominator = pick(denominators);
  let numerator = randomNonZeroInt(-maxAbs, maxAbs);

  while (gcd(numerator, denominator) !== 1) {
    numerator = randomNonZeroInt(-maxAbs, maxAbs);
  }

  return new Fraction(BigInt(numerator), BigInt(denominator));
}

function simplifyRadical(rawCoefficient, rawRadicand) {
  if (rawCoefficient === 0) {
    return { coefficient: 0, radicand: 1 };
  }

  let coefficient = rawCoefficient;
  let radicand = rawRadicand;
  let factor = 2;

  while (factor * factor <= radicand) {
    const square = factor * factor;

    while (radicand % square === 0) {
      coefficient *= factor;
      radicand /= square;
    }

    factor += 1;
  }

  return { coefficient, radicand };
}

function radicalToLatex(value) {
  if (value.radicand === 1) {
    return `${value.coefficient}`;
  }

  if (value.coefficient === 1) {
    return `\\sqrt{${value.radicand}}`;
  }

  if (value.coefficient === -1) {
    return `-\\sqrt{${value.radicand}}`;
  }

  return `${value.coefficient}\\sqrt{${value.radicand}}`;
}

function parseSingleValueAnswer(rawValue) {
  const cleaned = rawValue
    .trim()
    .replace(/\u2212/g, "-")
    .replace(/^\s*[a-z]\s*=\s*/i, "")
    .replace(",", ".");

  return parseFraction(cleaned);
}

function splitSolutionAnswer(rawValue) {
  return rawValue
    .toLowerCase()
    .replace(/[\{\}\[\]\(\)]/g, "")
    .replace(/solutions?\s*:?/g, "")
    .replace(/\set\s/gi, ";")
    .replace(/\sou\s/gi, ";")
    .replace(/\sand\s/gi, ";")
    .replace(/\sor\s/gi, ";")
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function parseSolutionSet(rawValue) {
  const normalized = rawValue.trim().toLowerCase();

  if (
    normalized === "aucune solution" ||
    normalized === "aucune solution réelle" ||
    normalized === "pas de solution" ||
    normalized === "pas de solution réelle" ||
    normalized === "ensemble vide" ||
    normalized === "vide" ||
    normalized === "no solution" ||
    normalized === "no real solution" ||
    normalized === "empty set"
  ) {
    return [];
  }

  return normalizeFractionList(
    splitSolutionAnswer(rawValue).map((chunk) =>
      parseSingleValueAnswer(chunk.replace(/^[a-z]\s*=\s*/i, ""))),
  );
}

function parseRadicalAnswer(rawValue) {
  const normalized = rawValue
    .trim()
    .replace(/\u2212/g, "-")
    .replace(/\s+/g, "")
    .replace(/\\sqrt\{(\d+)\}/g, "sqrt($1)")
    .replace(/√/g, "sqrt");

  if (!normalized.includes("sqrt")) {
    const asFraction = parseSingleValueAnswer(normalized);

    if (asFraction.denominator !== 1n) {
      throw new Error("Expected an integer or a simplified radical.");
    }

    return { coefficient: Number(asFraction.numerator), radicand: 1 };
  }

  const compact = normalized.replace(/sqrt\((\d+)\)/g, "sqrt$1");
  const match = compact.match(/^([+-]?\d*)\*?sqrt(\d+)$/);

  if (!match) {
    throw new Error("Invalid radical format.");
  }

  const [, coefficientText, radicandText] = match;
  const coefficient =
    coefficientText === "" || coefficientText === "+"
      ? 1
      : coefficientText === "-"
        ? -1
        : Number(coefficientText);
  const radicand = Number(radicandText);

  if (!Number.isInteger(coefficient) || !Number.isInteger(radicand) || radicand <= 0) {
    throw new Error("Invalid radical format.");
  }

  return simplifyRadical(coefficient, radicand);
}

function powerFraction(base, exponent) {
  let result = Fraction.one();
  const absoluteExponent = Math.abs(exponent);

  for (let index = 0; index < absoluteExponent; index += 1) {
    result = result.mul(base);
  }

  return exponent >= 0 ? result : Fraction.one().div(result);
}

function newExercise(category, difficulty, payload) {
  return {
    id: `${category}-${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category,
    difficulty,
    ...payload,
  };
}

function generateLinearExercise(difficulty) {
  if (difficulty === 1) {
    const solution = fractionFromInt(randInt(-8, 8));
    const a = randomNonZeroInt(-9, 9);
    const b = randInt(-10, 10);
    const right = solution.mul(a).add(b);
    const isolated = right.sub(b);

    return newExercise("linear", difficulty, {
      answerType: "single",
      statementLatex: `$$${linearExpressionLatex(a, b)} = ${right.toLatex()}$$`,
      answerLatex: `$$x = ${solution.toLatex()}$$`,
      correctionLatex:
        `$$${linearExpressionLatex(a, b)} = ${right.toLatex()}` +
        `\\Rightarrow ${a}x = ${isolated.toLatex()}` +
        `\\Rightarrow x = ${solution.toLatex()}$$`,
      solution,
    });
  }

  if (difficulty === 2) {
    const solution = fractionFromInt(randInt(-8, 8));
    let leftCoeff = randomNonZeroInt(-8, 8);
    let rightCoeff = randomNonZeroInt(-8, 8);

    while (leftCoeff === rightCoeff) {
      rightCoeff = randomNonZeroInt(-8, 8);
    }

    const leftConstant = randInt(-10, 10);
    const rightConstant = solution.mul(leftCoeff - rightCoeff).add(leftConstant);

    return newExercise("linear", difficulty, {
      answerType: "single",
      statementLatex:
        `$$${linearExpressionLatex(leftCoeff, leftConstant)} = ` +
        `${linearExpressionLatex(rightCoeff, Number(rightConstant.numerator))}$$`,
      answerLatex: `$$x = ${solution.toLatex()}$$`,
      correctionLatex:
        `$$${linearExpressionLatex(leftCoeff, leftConstant)} = ${linearExpressionLatex(
          rightCoeff,
          Number(rightConstant.numerator),
        )}` +
        `\\Rightarrow ${leftCoeff - rightCoeff}x = ${rightConstant.sub(leftConstant).toLatex()}` +
        `\\Rightarrow x = ${solution.toLatex()}$$`,
      solution,
    });
  }

  const solution = randomFraction(7, [2, 3, 4, 5]);
  const factor = randomNonZeroInt(2, 7);
  const shift = randInt(-6, 6);
  const right = solution.add(shift).mul(factor);

  return newExercise("linear", difficulty, {
    answerType: "single",
    statementLatex: `$$${factor}\\left(x ${shift >= 0 ? "+" : "-"} ${Math.abs(shift)}\\right) = ${right.toLatex()}$$`,
    answerLatex: `$$x = ${solution.toLatex()}$$`,
    correctionLatex:
      `$$${factor}\\left(x ${shift >= 0 ? "+" : "-"} ${Math.abs(shift)}\\right) = ${right.toLatex()}` +
      `\\Rightarrow x ${shift >= 0 ? "+" : "-"} ${Math.abs(shift)} = ${right.div(factor).toLatex()}` +
      `\\Rightarrow x = ${solution.toLatex()}$$`,
    solution,
  });
}

function generateQuadraticExercise(difficulty) {
  if (difficulty === 1) {
    let r1 = randInt(-6, 6);
    let r2 = randInt(-6, 6);

    while (r1 === r2) {
      r2 = randInt(-6, 6);
    }

    const b = -(r1 + r2);
    const c = r1 * r2;
    const solutions = normalizeFractionList([fractionFromInt(r1), fractionFromInt(r2)]);

    return newExercise("quadratic", difficulty, {
      answerType: "solutions",
      statementLatex: `$$${polynomialLatex(1, b, c)} = 0$$`,
      answerLatex: solutionSetLatex(solutions),
      correctionLatex: quadraticCorrectionLatex(1, b, c, solutions),
      solutions,
    });
  }

  if (difficulty === 2) {
    const mode = pick(["double", "noreal"]);

    if (mode === "double") {
      const root = randInt(-7, 7);
      const a = randInt(1, 4);
      const b = -2 * a * root;
      const c = a * root * root;
      const solutions = [fractionFromInt(root)];

      return newExercise("quadratic", difficulty, {
        answerType: "solutions",
        statementLatex: `$$${polynomialLatex(a, b, c)} = 0$$`,
        answerLatex: solutionSetLatex(solutions),
        correctionLatex: quadraticCorrectionLatex(a, b, c, solutions),
        solutions,
      });
    }

    const a = randInt(1, 4);
    const center = randInt(-4, 4);
    const positiveShift = randInt(1, 6);
    const b = -2 * a * center;
    const c = a * center * center + positiveShift;
    const solutions = [];

    return newExercise("quadratic", difficulty, {
      answerType: "solutions",
      statementLatex: `$$${polynomialLatex(a, b, c)} = 0$$`,
      answerLatex: solutionSetLatex(solutions),
      correctionLatex: quadraticCorrectionLatex(a, b, c, solutions),
      solutions,
    });
  }

  let first = randomFraction(7, [2, 3, 4]);
  let second = randomFraction(7, [2, 3, 4]);

  while (compareFractions(first, second)) {
    second = randomFraction(7, [2, 3, 4]);
  }

  const p = Number(first.numerator);
  const q = Number(first.denominator);
  const r = Number(second.numerator);
  const s = Number(second.denominator);
  const a = q * s;
  const b = -(q * r + s * p);
  const c = p * r;
  const solutions = normalizeFractionList([first, second]);

  return newExercise("quadratic", difficulty, {
    answerType: "solutions",
    statementLatex: `$$${polynomialLatex(a, b, c)} = 0$$`,
    answerLatex: solutionSetLatex(solutions),
    correctionLatex: quadraticCorrectionLatex(a, b, c, solutions),
    solutions,
  });
}

function generateFractionExercise(difficulty) {
  const left = randomFraction();
  const right = randomFraction();

  if (difficulty === 1) {
    const operator = pick(["+", "-"]);
    const result = operator === "+" ? left.add(right) : left.sub(right);
    const commonDenominator = lcm(Number(left.denominator), Number(right.denominator));
    const leftFactor = commonDenominator / Number(left.denominator);
    const rightFactor = commonDenominator / Number(right.denominator);
    const leftScaled = Number(left.numerator) * leftFactor;
    const rightScaled = Number(right.numerator) * rightFactor;
    const numerator = operator === "+" ? leftScaled + rightScaled : leftScaled - rightScaled;

    return newExercise("fractions", difficulty, {
      answerType: "single",
      statementLatex: `$$${left.toLatex()} ${operator} ${right.toLatex()}$$`,
      answerLatex: `$$${result.toLatex()}$$`,
      correctionLatex:
        `$$${left.toLatex()} ${operator} ${right.toLatex()} = ` +
        `\\frac{${leftScaled}}{${commonDenominator}} ${operator} \\frac{${rightScaled}}{${commonDenominator}}$$` +
        `$$= \\frac{${numerator}}{${commonDenominator}} = ${result.toLatex()}$$`,
      solution: result,
    });
  }

  if (difficulty === 2) {
    const operator = pick(["\\times", "\\div"]);
    const result = operator === "\\times" ? left.mul(right) : left.div(right);

    return newExercise("fractions", difficulty, {
      answerType: "single",
      statementLatex: `$$${left.toLatex()} ${operator} ${right.toLatex()}$$`,
      answerLatex: `$$${result.toLatex()}$$`,
      correctionLatex:
        operator === "\\times"
          ? `$$${left.toLatex()} \\times ${right.toLatex()} = ` +
            `\\frac{${Number(left.numerator)}\\times ${Number(right.numerator)}}{${Number(left.denominator)}\\times ${Number(right.denominator)}} = ${result.toLatex()}$$`
          : `$$${left.toLatex()} \\div ${right.toLatex()} = ${left.toLatex()} \\times \\frac{${Number(right.denominator)}}{${Number(right.numerator)}}$$` +
            `$$= ${result.toLatex()}$$`,
      solution: result,
    });
  }

  const third = randomFraction();
  const operator = pick(["+", "-"]);
  const inside = operator === "+" ? left.add(right) : left.sub(right);
  const finalOperator = pick(["\\times", "\\div"]);
  const result = finalOperator === "\\times" ? inside.mul(third) : inside.div(third);

  return newExercise("fractions", difficulty, {
    answerType: "single",
    statementLatex:
      `$$\\left(${left.toLatex()} ${operator} ${right.toLatex()}\\right) ${finalOperator} ${third.toLatex()}$$`,
    answerLatex: `$$${result.toLatex()}$$`,
    correctionLatex:
      `$$\\left(${left.toLatex()} ${operator} ${right.toLatex()}\\right) = ${inside.toLatex()}$$` +
      (finalOperator === "\\times"
        ? `$$${inside.toLatex()} \\times ${third.toLatex()} = ${result.toLatex()}$$`
        : `$$${inside.toLatex()} \\div ${third.toLatex()} = ${inside.toLatex()} \\times \\frac{${Number(third.denominator)}}{${Number(third.numerator)}} = ${result.toLatex()}$$`),
    solution: result,
  });
}

function generateRadicalExercise(difficulty) {
  if (difficulty === 1) {
    const squarefree = pick(SQUAREFREE_POOL);
    const factor = randInt(2, 8);
    const radicand = factor * factor * squarefree;
    const result = { coefficient: factor, radicand: squarefree };

    return newExercise("radicals", difficulty, {
      answerType: "radical",
      statementLatex: `$$\\sqrt{${radicand}}$$`,
      answerLatex: `$$${radicalToLatex(result)}$$`,
      correctionLatex:
        `$$\\sqrt{${radicand}} = \\sqrt{${factor * factor}\\times ${squarefree}} = ${radicalToLatex(result)}$$`,
      solution: result,
    });
  }

  if (difficulty === 2) {
    const squarefree = pick(SQUAREFREE_POOL);
    let leftCoefficient = randomNonZeroInt(-6, 6);
    let rightCoefficient = randomNonZeroInt(-6, 6);

    while (leftCoefficient + rightCoefficient === 0) {
      rightCoefficient = randomNonZeroInt(-6, 6);
    }

    const result = simplifyRadical(leftCoefficient + rightCoefficient, squarefree);

    return newExercise("radicals", difficulty, {
      answerType: "radical",
      statementLatex:
        `$$${radicalToLatex({ coefficient: leftCoefficient, radicand: squarefree })}` +
        ` ${rightCoefficient >= 0 ? "+" : "-"} ` +
        `${radicalToLatex({ coefficient: Math.abs(rightCoefficient), radicand: squarefree })}$$`,
      answerLatex: `$$${radicalToLatex(result)}$$`,
      correctionLatex:
        `$$${radicalToLatex({ coefficient: leftCoefficient, radicand: squarefree })}` +
        ` ${rightCoefficient >= 0 ? "+" : "-"} ` +
        `${radicalToLatex({ coefficient: Math.abs(rightCoefficient), radicand: squarefree })}` +
        ` = ${radicalToLatex(result)}$$`,
      solution: result,
    });
  }

  const left = randInt(2, 30);
  const right = randInt(2, 30);
  const result = simplifyRadical(1, left * right);

  return newExercise("radicals", difficulty, {
    answerType: "radical",
    statementLatex: `$$\\sqrt{${left}} \\times \\sqrt{${right}}$$`,
    answerLatex: `$$${radicalToLatex(result)}$$`,
    correctionLatex:
      `$$\\sqrt{${left}} \\times \\sqrt{${right}} = \\sqrt{${left * right}} = ${radicalToLatex(result)}$$`,
    solution: result,
  });
}

function generatePowersExercise(difficulty) {
  if (difficulty === 1) {
    const base = randInt(2, 5);
    const firstExponent = randInt(2, 5);
    const secondExponent = randInt(2, 5);
    const mode = pick(["product", "quotient", "power"]);

    if (mode === "product") {
      const result = fractionFromInt(base ** (firstExponent + secondExponent));

      return newExercise("powers", difficulty, {
        answerType: "single",
        statementLatex: `$$${base}^{${firstExponent}}\\times ${base}^{${secondExponent}}$$`,
        answerLatex: `$$${result.toLatex()}$$`,
        correctionLatex:
          `$$${base}^{${firstExponent}}\\times ${base}^{${secondExponent}} = ${base}^{${firstExponent + secondExponent}} = ${result.toLatex()}$$`,
        solution: result,
      });
    }

    if (mode === "quotient") {
      const top = Math.max(firstExponent, secondExponent);
      const bottom = Math.min(firstExponent, secondExponent);
      const result = fractionFromInt(base ** (top - bottom));

      return newExercise("powers", difficulty, {
        answerType: "single",
        statementLatex: `$$\\frac{${base}^{${top}}}{${base}^{${bottom}}}$$`,
        answerLatex: `$$${result.toLatex()}$$`,
        correctionLatex:
          `$$\\frac{${base}^{${top}}}{${base}^{${bottom}}} = ${base}^{${top - bottom}} = ${result.toLatex()}$$`,
        solution: result,
      });
    }

    const result = fractionFromInt(base ** (firstExponent * secondExponent));

    return newExercise("powers", difficulty, {
      answerType: "single",
      statementLatex: `$$\\left(${base}^{${firstExponent}}\\right)^{${secondExponent}}$$`,
      answerLatex: `$$${result.toLatex()}$$`,
      correctionLatex:
        `$$\\left(${base}^{${firstExponent}}\\right)^{${secondExponent}} = ${base}^{${firstExponent * secondExponent}} = ${result.toLatex()}$$`,
      solution: result,
    });
  }

  if (difficulty === 2) {
    const mode = pick(["negative", "mixed", "fraction"]);

    if (mode === "negative") {
      const base = randInt(2, 5);
      const exponent = randInt(2, 4);
      const result = powerFraction(fractionFromInt(base), -exponent);

      return newExercise("powers", difficulty, {
        answerType: "single",
        statementLatex: `$$${base}^{-${exponent}}$$`,
        answerLatex: `$$${result.toLatex()}$$`,
        correctionLatex:
          `$$${base}^{-${exponent}} = \\frac{1}{${base}^{${exponent}}} = ${result.toLatex()}$$`,
        solution: result,
      });
    }

    if (mode === "mixed") {
      const base = randInt(2, 5);
      const leftExponent = randInt(2, 5);
      const rightExponent = randInt(2, 4);
      const result = powerFraction(fractionFromInt(base), leftExponent - rightExponent);

      return newExercise("powers", difficulty, {
        answerType: "single",
        statementLatex: `$$${base}^{${leftExponent}}\\times ${base}^{-${rightExponent}}$$`,
        answerLatex: `$$${result.toLatex()}$$`,
        correctionLatex:
          `$$${base}^{${leftExponent}}\\times ${base}^{-${rightExponent}} = ${base}^{${leftExponent - rightExponent}} = ${result.toLatex()}$$`,
        solution: result,
      });
    }

    const numerator = randInt(2, 5);
    const denominator = randInt(2, 5);
    const exponent = randInt(2, 3);
    const base = new Fraction(BigInt(numerator), BigInt(denominator));
    const result = powerFraction(base, -exponent);

    return newExercise("powers", difficulty, {
      answerType: "single",
      statementLatex: `$$\\left(\\frac{${numerator}}{${denominator}}\\right)^{-${exponent}}$$`,
      answerLatex: `$$${result.toLatex()}$$`,
      correctionLatex:
        `$$\\left(\\frac{${numerator}}{${denominator}}\\right)^{-${exponent}} = ` +
        `\\left(\\frac{${denominator}}{${numerator}}\\right)^{${exponent}} = ${result.toLatex()}$$`,
      solution: result,
    });
  }

  const base = randInt(2, 5);
  const a = randInt(2, 4);
  const b = randInt(2, 4);
  const c = randInt(1, 3);
  const d = randInt(1, 3);
  const exponent = a * b + c - d;
  const result = powerFraction(fractionFromInt(base), exponent);

  return newExercise("powers", difficulty, {
    answerType: "single",
    statementLatex:
      `$$\\frac{\\left(${base}^{${a}}\\right)^{${b}}\\times ${base}^{${c}}}{${base}^{${d}}}$$`,
    answerLatex: `$$${result.toLatex()}$$`,
    correctionLatex:
      `$$\\frac{\\left(${base}^{${a}}\\right)^{${b}}\\times ${base}^{${c}}}{${base}^{${d}}}` +
      ` = ${base}^{${a * b}}\\times ${base}^{${c - d}} = ${base}^{${exponent}} = ${result.toLatex()}$$`,
    solution: result,
  });
}

export function generatePracticeExercise(category, difficulty) {
  switch (category) {
    case "linear":
      return generateLinearExercise(difficulty);
    case "quadratic":
      return generateQuadraticExercise(difficulty);
    case "fractions":
      return generateFractionExercise(difficulty);
    case "radicals":
      return generateRadicalExercise(difficulty);
    case "powers":
      return generatePowersExercise(difficulty);
    default:
      return generateLinearExercise(difficulty);
  }
}

export function checkPracticeAnswer(exercise, rawValue) {
  if (!rawValue.trim()) {
    throw new Error("Empty answer");
  }

  if (exercise.answerType === "single") {
    return compareFractions(parseSingleValueAnswer(rawValue), exercise.solution);
  }

  if (exercise.answerType === "solutions") {
    const submitted = parseSolutionSet(rawValue);
    const expected = normalizeFractionList(exercise.solutions);

    if (submitted.length !== expected.length) {
      return false;
    }

    return submitted.every((value, index) => compareFractions(value, expected[index]));
  }

  if (exercise.answerType === "radical") {
    const parsed = parseRadicalAnswer(rawValue);
    return parsed.coefficient === exercise.solution.coefficient && parsed.radicand === exercise.solution.radicand;
  }

  return false;
}

export function answerPreviewKind(exercise) {
  return exercise.answerType;
}
