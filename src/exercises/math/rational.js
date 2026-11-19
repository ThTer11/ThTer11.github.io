import { InputError } from "../../utils/inputError";
import { Fraction, parseFraction } from "../../utils/gauss";

const MAX_DIGITS = 80;
const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;

function normalizeNumberToken(rawValue) {
  return String(rawValue ?? "")
    .trim()
    .replace(/[−–—]/g, "-")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/\s+/g, "");
}

function normalizeLatexFraction(value) {
  const match = value.match(/^\\(?:dfrac|tfrac|frac)\{([^{}]+)\}\{([^{}]+)\}$/);
  return match ? `${match[1]}/${match[2]}` : value;
}

function validateNumberToken(token) {
  if (!NUMBER_PATTERN.test(token)) {
    throw new InputError(`Nombre invalide : « ${token} ».`, `Invalid number: “${token}”.`);
  }

  if ((token.match(/\d/g) ?? []).length > MAX_DIGITS) {
    throw new InputError("Nombre trop long.", "The number is too long.");
  }
}

export function parseExactNumber(rawValue) {
  const normalized = normalizeLatexFraction(normalizeNumberToken(rawValue));
  const parts = normalized.split("/");

  if (parts.length > 2 || parts.some((part) => !part)) {
    throw new InputError("Écriture fractionnaire invalide.", "Invalid fraction format.");
  }

  parts.forEach(validateNumberToken);
  return parseFraction(normalized);
}

function absBigInt(value) {
  return value < 0n ? -value : value;
}

export function gcdBigInt(left, right) {
  let a = absBigInt(left);
  let b = absBigInt(right);

  while (b !== 0n) {
    [a, b] = [b, a % b];
  }

  return a;
}

export function inspectFractionInput(rawValue) {
  const normalized = normalizeLatexFraction(normalizeNumberToken(rawValue));
  const parts = normalized.split("/");

  if (parts.length !== 2 || parts.some((part) => !/^[+-]?\d+$/.test(part))) {
    return {
      isFraction: false,
      isDecimal: normalized.includes("."),
      isReduced: false,
    };
  }

  const numerator = BigInt(parts[0]);
  const denominator = BigInt(parts[1]);

  return {
    isFraction: true,
    isDecimal: false,
    isReduced: denominator !== 0n && gcdBigInt(numerator, denominator) === 1n,
    numerator,
    denominator,
  };
}

export function asFraction(value) {
  return value instanceof Fraction ? value : parseExactNumber(value);
}

export { Fraction };
