const MAX_INPUT_LENGTH = 500;
const MAX_TOKENS = 500;
const MAX_PARSE_DEPTH = 60;

const FUNCTION_NAMES = new Set(["abs", "cos", "exp", "ln", "log", "sin", "sqrt"]);
const FREE_CONSTANT_NAMES = new Set(["c", "k"]);

function readBalancedGroup(text, startIndex) {
  if (text[startIndex] !== "{") return null;

  let depth = 0;

  for (let index = startIndex; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    if (text[index] === "}") depth -= 1;

    if (depth === 0) {
      return { content: text.slice(startIndex + 1, index), end: index + 1 };
    }
  }

  return null;
}

function expandLatexStructures(rawText) {
  let text = rawText;
  let marker = text.indexOf("\\frac");

  while (marker !== -1) {
    const numerator = readBalancedGroup(text, marker + 5);
    const denominator = numerator && readBalancedGroup(text, numerator.end);

    if (!numerator || !denominator) {
      throw new Error("Fraction LaTeX incomplète.");
    }

    const replacement = `((${expandLatexStructures(numerator.content)})/(${expandLatexStructures(denominator.content)}))`;
    text = `${text.slice(0, marker)}${replacement}${text.slice(denominator.end)}`;
    marker = text.indexOf("\\frac");
  }

  marker = text.indexOf("\\sqrt");

  while (marker !== -1) {
    const radicand = readBalancedGroup(text, marker + 5);

    if (!radicand) {
      throw new Error("Racine carrée LaTeX incomplète.");
    }

    const replacement = `sqrt(${expandLatexStructures(radicand.content)})`;
    text = `${text.slice(0, marker)}${replacement}${text.slice(radicand.end)}`;
    marker = text.indexOf("\\sqrt");
  }

  return text;
}

function stripAssignment(rawText) {
  const equalityIndex = rawText.lastIndexOf("=");
  return equalityIndex >= 0 ? rawText.slice(equalityIndex + 1) : rawText;
}

export function normalizeCalculusInput(rawValue) {
  const rawText = stripAssignment(String(rawValue ?? "").trim());

  if (!rawText) throw new Error("Réponse vide.");
  if (rawText.length > MAX_INPUT_LENGTH) throw new Error("Expression trop longue.");

  let text = rawText
    .replace(/\$/g, "")
    .replace(/\\(?:dfrac|tfrac)/g, "\\frac")
    .replace(/\\operatorname\s*\{(exp|ln|log|sin|cos|sqrt|abs)\}/gi, "$1")
    .replace(/\\mathrm\s*\{?e\}?/gi, "e")
    .replace(/\\left|\\right/g, "")
    .replace(/\\(?:cdot|times)/g, "*")
    .replace(/\\(?:,|;|!|quad|qquad)/g, " ")
    .replace(/\\(?:sin|cos|exp|ln|log)/gi, (command) => command.slice(1).toLowerCase())
    .replace(/\\sqrt\s*\(([^()]*)\)/gi, "sqrt($1)")
    .replace(/\\sqrt\s+([a-z0-9.]+)/gi, "sqrt($1)")
    .replace(/\\lvert|\\rvert/g, "|")
    .replace(/[×·∙]/g, "*")
    .replace(/[÷:]/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/√\s*\(/g, "sqrt(")
    .replace(/√\s*([a-z0-9.]+)/gi, "sqrt($1)")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/\bln\s*\|([^|]+)\|/gi, "ln(abs($1))")
    .replace(/\|([^|]+)\|/g, "abs($1)");

  text = expandLatexStructures(text)
    .replace(/\^\{([^{}]+)\}/g, "^($1)")
    .replace(/[{}]/g, (character) => (character === "{" ? "(" : ")"))
    .replace(/\b(sin|cos|exp|ln|log|sqrt|abs)\s+([a-z])/gi, "$1($2)")
    .trim()
    .toLowerCase();

  if (!text) throw new Error("Réponse vide.");
  return text;
}

function rawTokens(rawValue) {
  const text = normalizeCalculusInput(rawValue);
  const tokens = [];
  let index = 0;

  while (index < text.length) {
    if (/\s/.test(text[index])) {
      index += 1;
      continue;
    }

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

  if (tokens.length > MAX_TOKENS) throw new Error("Expression trop complexe.");
  return tokens;
}

function tokenize(rawValue) {
  const tokens = rawTokens(rawValue);
  const withProducts = [];

  tokens.forEach((token) => {
    const previous = withProducts[withProducts.length - 1];
    const previousEndsFactor = previous && ["number", "identifier", "right"].includes(previous.type);
    const currentStartsFactor = ["number", "identifier", "left"].includes(token.type);
    const functionCall = previous?.type === "identifier"
      && FUNCTION_NAMES.has(previous.value)
      && token.type === "left";

    if (previousEndsFactor && currentStartsFactor && !functionCall) {
      withProducts.push({ type: "operator", value: "*" });
    }

    withProducts.push(token);
  });

  return withProducts;
}

export function parseCalculusExpression(rawValue) {
  const tokens = tokenize(rawValue);
  let cursor = 0;
  let depth = 0;

  const peek = () => tokens[cursor];
  const consume = () => tokens[cursor++];

  const withinDepthLimit = (callback) => {
    depth += 1;
    if (depth > MAX_PARSE_DEPTH) throw new Error("Expression trop imbriquée.");

    try {
      return callback();
    } finally {
      depth -= 1;
    }
  };

  const parsePrimary = () => withinDepthLimit(() => {
    const token = consume();

    if (!token) throw new Error("Expression incomplète.");

    if (token.type === "number") {
      return { type: "number", value: Number(token.value) };
    }

    if (token.type === "identifier") {
      const name = token.value === "log" ? "ln" : token.value;

      if (FUNCTION_NAMES.has(token.value)) {
        if (consume()?.type !== "left") {
          throw new Error(`Écris ${token.value}(...) avec des parenthèses.`);
        }
        const argument = parseExpression();
        if (consume()?.type !== "right") throw new Error("Parenthèse fermante manquante.");
        return { type: "call", name, argument };
      }

      if (!["t", "x", "e", "pi", "c", "k"].includes(name)) {
        throw new Error(`Symbole inconnu : « ${token.value} ».`);
      }

      return { type: "symbol", name };
    }

    if (token.type === "left") {
      const expression = parseExpression();
      if (consume()?.type !== "right") throw new Error("Parenthèse fermante manquante.");
      return expression;
    }

    throw new Error(`Élément inattendu : « ${token.value} ».`);
  });

  const parsePower = () => {
    let value = parsePrimary();

    if (peek()?.value === "^") {
      consume();
      value = { type: "binary", operator: "^", left: value, right: parseUnary() };
    }

    return value;
  };

  const parseUnary = () => {
    if (peek()?.value === "+" || peek()?.value === "-") {
      const operator = consume().value;
      return { type: "unary", operator, value: parseUnary() };
    }

    return parsePower();
  };

  const parseTerm = () => {
    let value = parseUnary();

    while (peek()?.value === "*" || peek()?.value === "/") {
      const operator = consume().value;
      value = { type: "binary", operator, left: value, right: parseUnary() };
    }

    return value;
  };

  function parseExpression() {
    let value = parseTerm();

    while (peek()?.value === "+" || peek()?.value === "-") {
      const operator = consume().value;
      value = { type: "binary", operator, left: value, right: parseTerm() };
    }

    return value;
  }

  const result = parseExpression();

  if (cursor !== tokens.length) {
    throw new Error(`Élément inattendu : « ${peek().value} ».`);
  }

  return result;
}

function evaluateNode(node, context) {
  if (node.type === "number") return node.value;

  if (node.type === "symbol") {
    if (node.name === "t" || node.name === "x") return context.t;
    if (node.name === "e") return Math.E;
    if (node.name === "pi") return Math.PI;
    if (FREE_CONSTANT_NAMES.has(node.name)) return context.constant ?? 0;
  }

  if (node.type === "unary") {
    const value = evaluateNode(node.value, context);
    return node.operator === "-" ? -value : value;
  }

  if (node.type === "binary") {
    const left = evaluateNode(node.left, context);
    const right = evaluateNode(node.right, context);

    if (node.operator === "+") return left + right;
    if (node.operator === "-") return left - right;
    if (node.operator === "*") return left * right;
    if (node.operator === "/") return right === 0 ? Number.NaN : left / right;
    if (node.operator === "^") return left ** right;
  }

  if (node.type === "call") {
    const value = evaluateNode(node.argument, context);
    if (node.name === "abs") return Math.abs(value);
    if (node.name === "cos") return Math.cos(value);
    if (node.name === "exp") return Math.exp(value);
    if (node.name === "ln") return value > 0 ? Math.log(value) : Number.NaN;
    if (node.name === "sin") return Math.sin(value);
    if (node.name === "sqrt") return value >= 0 ? Math.sqrt(value) : Number.NaN;
  }

  return Number.NaN;
}

export function evaluateCalculusExpression(expression, t, constant = 0) {
  const ast = typeof expression === "string" ? parseCalculusExpression(expression) : expression;
  const value = evaluateNode(ast, { t, constant });
  return Number.isFinite(value) && Math.abs(value) < 1e100 ? value : Number.NaN;
}

function containsFreeConstant(node) {
  if (!node || typeof node !== "object") return false;
  if (node.type === "symbol") return FREE_CONSTANT_NAMES.has(node.name);
  if (node.type === "unary") return containsFreeConstant(node.value);
  if (node.type === "binary") return containsFreeConstant(node.left) || containsFreeConstant(node.right);
  if (node.type === "call") return containsFreeConstant(node.argument);
  return false;
}

function closeEnough(left, right) {
  const scale = Math.max(1, Math.abs(left), Math.abs(right));
  return Math.abs(left - right) <= 1e-7 * scale;
}

const DEFAULT_SAMPLE_POINTS = [-2.4, -1.35, -0.55, 0.4, 1.15, 2.3, 3.4];

function equivalentAtPoints(actual, expected, points, upToConstant) {
  const constants = upToConstant && containsFreeConstant(actual) ? [0, 1.25, -2] : [0];

  return constants.every((constant) => {
    let referenceDifference;

    return points.every((t) => {
      const actualValue = evaluateCalculusExpression(actual, t, constant);
      const expectedValue = evaluateCalculusExpression(expected, t, 0);

      if (!Number.isFinite(actualValue) || !Number.isFinite(expectedValue)) return false;

      if (!upToConstant) return closeEnough(actualValue, expectedValue);

      const difference = actualValue - expectedValue;
      if (referenceDifference === undefined) referenceDifference = difference;
      return closeEnough(difference, referenceDifference);
    });
  });
}

export function areCalculusExpressionsEquivalent(
  actualValue,
  expectedValue,
  { samplePoints = DEFAULT_SAMPLE_POINTS, upToConstant = false, allowFreeConstant = upToConstant } = {},
) {
  const actual = parseCalculusExpression(actualValue);
  if (!allowFreeConstant && containsFreeConstant(actual)) return false;

  const candidates = Array.isArray(expectedValue) ? expectedValue : [expectedValue];
  return candidates.some((candidate) => equivalentAtPoints(
    actual,
    parseCalculusExpression(candidate),
    samplePoints,
    upToConstant,
  ));
}

export function validateCalculusAnswer(rawValue, { expected, question, lang = "fr" }) {
  try {
    const upToConstant = question.validationMode === "primitive";
    const actual = parseCalculusExpression(rawValue);
    const correct = areCalculusExpressionsEquivalent(rawValue, expected, {
      samplePoints: question.validationPoints ?? DEFAULT_SAMPLE_POINTS,
      upToConstant,
      allowFreeConstant: upToConstant,
    });

    if (correct && question.requireIntegrationConstant && !containsFreeConstant(actual)) {
      return {
        correct: false,
        equivalent: true,
        formOk: false,
        status: "equivalent",
        message: lang === "en"
          ? "You found one primitive, but + C is needed to give all primitives."
          : "Tu as trouvé une primitive, mais il manque $+C$ pour donner toutes les primitives.",
      };
    }

    return {
      correct,
      status: correct ? "correct" : "incorrect",
      message: correct
        ? (lang === "en" ? "Correct answer." : "Bonne réponse.")
        : upToConstant
          ? (lang === "en"
            ? "Differentiate your proposed primitive to check it."
            : "Dérive la primitive proposée pour vérifier ton résultat.")
          : (lang === "en"
            ? "The expression is not equivalent to the expected answer."
            : "L'expression n'est pas équivalente à la réponse attendue."),
    };
  } catch (error) {
    return {
      correct: false,
      status: "invalid",
      message: error.message,
    };
  }
}
