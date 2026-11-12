export function matrixScalarLatex(value) {
  return typeof value?.toLatex === "function" ? value.toLatex() : String(value);
}

function factor(value) {
  const latex = matrixScalarLatex(value);
  return latex.startsWith("-") ? `\\left(${latex}\\right)` : latex;
}

export function matrixCoefficientCalculation(question, row, column) {
  const terms = question.left[row].map((a, k) => `${factor(a)}\\times ${factor(question.right[k][column])}`);
  const result = matrixScalarLatex(question.expected.matrix[row][column]);
  return { terms: terms.join(" + "), result };
}
