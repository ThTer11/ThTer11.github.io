import { Fraction, parseFraction } from "../../utils/gauss";

const MAX_INPUT_LENGTH = 300;
const MAX_EXPONENT = 20;

function constantPolynomial(value) {
  const fraction = Fraction.from(value);
  return fraction.isZero() ? new Map() : new Map([["", fraction]]);
}

function variablePolynomial(name) {
  return new Map([[`${name}^1`, Fraction.one()]]);
}

function parseMonomialKey(key) {
  if (!key) {
    return {};
  }

  return Object.fromEntries(
    key.split("*").map((part) => {
      const [variable, exponent] = part.split("^");
      return [variable, Number(exponent)];
    }),
  );
}

function monomialKey(exponents) {
  return Object.entries(exponents)
    .filter(([, exponent]) => exponent !== 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([variable, exponent]) => `${variable}^${exponent}`)
    .join("*");
}

function addTerm(polynomial, key, coefficient) {
  const previous = polynomial.get(key) ?? Fraction.zero();
  const next = previous.add(coefficient);

  if (next.isZero()) {
    polynomial.delete(key);
  } else {
    polynomial.set(key, next);
  }
}

function addPolynomials(left, right) {
  const result = new Map(left);
  right.forEach((coefficient, key) => addTerm(result, key, coefficient));
  return result;
}

function negatePolynomial(polynomial) {
  return new Map([...polynomial].map(([key, value]) => [key, value.neg()]));
}

function multiplyPolynomials(left, right) {
  const result = new Map();

  left.forEach((leftCoefficient, leftKey) => {
    right.forEach((rightCoefficient, rightKey) => {
      const exponents = parseMonomialKey(leftKey);

      Object.entries(parseMonomialKey(rightKey)).forEach(([variable, exponent]) => {
        exponents[variable] = (exponents[variable] ?? 0) + exponent;
      });

      addTerm(
        result,
        monomialKey(exponents),
        leftCoefficient.mul(rightCoefficient),
      );
    });
  });

  return result;
}

function dividePolynomial(polynomial, divisor) {
  if (divisor.size !== 1 || !divisor.has("")) {
    throw new Error("Seule la division par une constante est prise en charge.");
  }

  const constant = divisor.get("");
  return new Map(
    [...polynomial].map(([key, coefficient]) => [key, coefficient.div(constant)]),
  );
}

function powerPolynomial(polynomial, exponent) {
  if (!Number.isSafeInteger(exponent) || exponent < 0 || exponent > MAX_EXPONENT) {
    throw new Error(`L'exposant doit être un entier entre 0 et ${MAX_EXPONENT}.`);
  }

  let result = constantPolynomial(1);
  let factor = polynomial;
  let remaining = exponent;

  while (remaining > 0) {
    if (remaining % 2 === 1) {
      result = multiplyPolynomials(result, factor);
    }
    remaining = Math.floor(remaining / 2);
    if (remaining > 0) {
      factor = multiplyPolynomials(factor, factor);
    }
  }

  return result;
}

function readBalancedGroup(text, startIndex) {
  if (text[startIndex] !== "{") {
    return null;
  }

  let depth = 0;

  for (let index = startIndex; index < text.length; index += 1) {
    if (text[index] === "{") {
      depth += 1;
    } else if (text[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return { content: text.slice(startIndex + 1, index), end: index + 1 };
      }
    }
  }

  return null;
}

function expandLatexFractions(rawText) {
  let text = rawText;
  let marker = text.indexOf("\\frac");

  while (marker !== -1) {
    const numerator = readBalancedGroup(text, marker + 5);
    const denominator = numerator && readBalancedGroup(text, numerator.end);

    if (!numerator || !denominator) {
      throw new Error("Fraction LaTeX incomplète.");
    }

    const replacement = `((${expandLatexFractions(numerator.content)})/(${expandLatexFractions(denominator.content)}))`;
    text = `${text.slice(0, marker)}${replacement}${text.slice(denominator.end)}`;
    marker = text.indexOf("\\frac");
  }

  return text;
}

export function normalizeExpressionInput(rawValue) {
  const rawText = String(rawValue ?? "").trim();

  if (!rawText) {
    throw new Error("Réponse vide.");
  }

  if (rawText.length > MAX_INPUT_LENGTH) {
    throw new Error("Expression trop longue.");
  }

  return expandLatexFractions(
    rawText
      .replace(/\\(?:dfrac|tfrac)/g, "\\frac")
      .replace(/\\left|\\right/g, "")
      .replace(/\\(?:cdot|times)/g, "*")
      .replace(/[×·∙]/g, "*")
      .replace(/[÷:]/g, "/")
      .replace(/[−–—]/g, "-")
      .replace(/²/g, "^2")
      .replace(/³/g, "^3")
      .replace(/(\d),(\d)/g, "$1.$2")
      .replace(/\s+/g, "")
      .toLowerCase(),
  )
    .replace(/\^\{([^{}]+)\}/g, "^($1)")
    .replace(/[{}]/g, (character) => (character === "{" ? "(" : ")"));
}

function tokenize(rawValue) {
  const text = normalizeExpressionInput(rawValue);
  const tokens = [];
  let index = 0;

  while (index < text.length) {
    const rest = text.slice(index);
    const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    const identifier = rest.match(/^[a-z][a-z0-9_]*/);

    if (number) {
      tokens.push({ type: "number", value: number[0] });
      index += number[0].length;
      continue;
    }

    if (identifier) {
      tokens.push({ type: "identifier", value: identifier[0] });
      index += identifier[0].length;
      continue;
    }

    if ("+-*/^()".includes(text[index])) {
      const character = text[index];
      tokens.push({
        type: character === "(" ? "left" : character === ")" ? "right" : "operator",
        value: character,
      });
      index += 1;
      continue;
    }

    throw new Error(`Symbole non pris en charge : « ${text[index]} ».`);
  }

  const withProducts = [];
  tokens.forEach((token) => {
    const previous = withProducts[withProducts.length - 1];
    const previousEndsFactor = previous && ["number", "identifier", "right"].includes(previous.type);
    const currentStartsFactor = ["number", "identifier", "left"].includes(token.type);

    if (previousEndsFactor && currentStartsFactor) {
      withProducts.push({ type: "operator", value: "*" });
    }

    withProducts.push(token);
  });

  return withProducts;
}

function constantInteger(polynomial) {
  if (polynomial.size === 0) {
    return 0;
  }

  if (polynomial.size !== 1 || !polynomial.has("")) {
    throw new Error("L'exposant doit être constant.");
  }

  const value = polynomial.get("");
  if (value.denominator !== 1n) {
    throw new Error("L'exposant doit être entier.");
  }

  const asNumber = Number(value.numerator);
  if (!Number.isSafeInteger(asNumber)) {
    throw new Error("Exposant trop grand.");
  }

  return asNumber;
}

export function parsePolynomialExpression(rawValue) {
  const tokens = tokenize(rawValue);
  let cursor = 0;

  const peek = () => tokens[cursor];
  const consume = () => tokens[cursor++];

  const parsePrimary = () => {
    const token = consume();

    if (!token) {
      throw new Error("Expression incomplète.");
    }

    if (token.type === "number") {
      return constantPolynomial(parseFraction(token.value));
    }

    if (token.type === "identifier") {
      return variablePolynomial(token.value);
    }

    if (token.type === "left") {
      const expression = parseExpression();
      if (consume()?.type !== "right") {
        throw new Error("Parenthèse fermante manquante.");
      }
      return expression;
    }

    throw new Error(`Élément inattendu : « ${token.value} ».`);
  };

  const parsePower = () => {
    let value = parsePrimary();

    if (peek()?.value === "^") {
      consume();
      const exponent = parseUnary();
      value = powerPolynomial(value, constantInteger(exponent));
    }

    return value;
  };

  const parseUnary = () => {
    if (peek()?.value === "+") {
      consume();
      return parseUnary();
    }

    if (peek()?.value === "-") {
      consume();
      return negatePolynomial(parseUnary());
    }

    return parsePower();
  };

  const parseTerm = () => {
    let value = parseUnary();

    while (peek()?.value === "*" || peek()?.value === "/") {
      const operator = consume().value;
      const right = parseUnary();
      value = operator === "*"
        ? multiplyPolynomials(value, right)
        : dividePolynomial(value, right);
    }

    return value;
  };

  function parseExpression() {
    let value = parseTerm();

    while (peek()?.value === "+" || peek()?.value === "-") {
      const operator = consume().value;
      const right = parseTerm();
      value = addPolynomials(value, operator === "+" ? right : negatePolynomial(right));
    }

    return value;
  }

  const result = parseExpression();

  if (cursor !== tokens.length) {
    throw new Error(`Élément inattendu : « ${peek().value} ».`);
  }

  return result;
}

export function polynomialSignature(polynomial) {
  return [...polynomial.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, coefficient]) => `${key || "1"}:${coefficient.toString()}`)
    .join("|");
}

export function arePolynomialExpressionsEquivalent(left, right) {
  return polynomialSignature(parsePolynomialExpression(left)) ===
    polynomialSignature(parsePolynomialExpression(right));
}

export function hasFactorizedForm(rawValue) {
  const value = normalizeExpressionInput(rawValue);
  const groupedFactors = (value.match(/\([^()]+\)/g) ?? []).length;
  return groupedFactors >= 2 ||
    /(?:\d|[a-z]|\))\(/.test(value) ||
    /(?:\d|[a-z])\*\(/.test(value);
}

export function hasDevelopedForm(rawValue) {
  const value = normalizeExpressionInput(rawValue);
  return !value.includes("(") && !value.includes(")");
}
