function lines(text) {
  return text.replace(/\r\n?/g, "\n").split("\n");
}

export function splitAugmentedMatrixInput(text) {
  const rows = lines(text).map((line) => {
    const separator = line.indexOf("|");
    return separator < 0
      ? [line.trim(), ""]
      : [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
  });
  return {
    coefficients: rows.map(([left]) => left).join("\n"),
    rightHandSide: rows.map(([, right]) => right).join("\n"),
  };
}

export function joinAugmentedMatrixInput({ coefficients, rightHandSide }) {
  const left = lines(coefficients);
  const right = lines(rightHandSide);
  return Array.from({ length: Math.max(left.length, right.length) }, (_, index) => {
    const a = left[index] ?? "";
    const b = right[index] ?? "";
    return a.trim() || b.trim() ? `${a} | ${b}` : "";
  }).join("\n");
}

export function matrixInputFromSystem({ augmentedMatrix }) {
  return {
    coefficients: augmentedMatrix.map((row) => row.slice(0, -1).map(String).join(" ")).join("\n"),
    rightHandSide: augmentedMatrix.map((row) => String(row[row.length - 1])).join("\n"),
  };
}

export function systemInputFromMatrix({ augmentedMatrix, variableNames }) {
  const zeroColumns = variableNames.map((_, column) => augmentedMatrix.every((row) => row[column].isZero()));
  return augmentedMatrix.map((row, rowIndex) => {
    const terms = [];
    variableNames.forEach((variable, column) => {
      const value = row[column];
      // Keep an unknown that is absent from every equation, so conversion preserves the ambient dimension.
      if (value.isZero() && !(rowIndex === 0 && zeroColumns[column])) return;
      const negative = value.numerator < 0n;
      const sign = negative ? (terms.length ? " - " : "-") : terms.length ? " + " : "";
      const magnitude = value.abs();
      terms.push(`${sign}${magnitude.isOne() ? "" : magnitude.toString()}${variable}`);
    });
    return `${terms.join("") || "0"} = ${row[row.length - 1]}`;
  }).join("\n");
}
