import { matrixVectorProduct } from "./linearAlgebra";
import { asFraction, Fraction } from "./rational";

export function signedTermLatex(value, variable = "") {
  if (value.isZero()) return "";
  const magnitude = value.abs();
  return `${value.numerator < 0n ? "-" : "+"}${variable && magnitude.isOne() ? "" : magnitude.toLatex()}${variable}`;
}

export function characteristicPolynomialLatex([linear, constant]) {
  return `\\lambda^2${signedTermLatex(asFraction(linear), "\\lambda")}${signedTermLatex(asFraction(constant))}`;
}

export function eigenSystem(matrix, eigenvalue) {
  const lambda = asFraction(eigenvalue);
  return matrix.map((row, i) => [
    ...row.map((entry, j) => i === j ? entry.sub(lambda) : entry),
    Fraction.zero(),
  ]);
}

export function isEigenvector(matrix, vector, eigenvalue) {
  return vector.some((entry) => !entry.isZero())
    && matrixVectorProduct(matrix, vector).every((entry, i) => entry.equals(vector[i].mul(eigenvalue)));
}
