import { splitAugmentedMatrixInput } from "../utils/augmentedMatrixInput";

function longestLine(text) {
  return Math.max(...text.split("\n").map((line) => line.replace(/\t/g, "    ").length));
}

export default function AugmentedMatrixInput({ value, onChange, labels, containerRef, height }) {
  const contentRows = Math.max(value.coefficients.split("\n").length, value.rightHandSide.split("\n").length);
  const rows = contentRows;
  const pasteMatrix = (event) => {
    const text = event.clipboardData.getData("text/plain");
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length || !lines.every((line) => line.split("|").length === 2)) return;
    event.preventDefault();
    onChange(splitAugmentedMatrixInput(text.trim()));
  };

  return (
    <div className="gauss-augmented-input" ref={containerRef} style={{ height }} role="group" aria-label={labels.modeMatrix}>
      <div className="gauss-augmented-scroll">
        <div className="gauss-augmented-grid" style={{
          "--gauss-coefficient-chars": Math.max(12, longestLine(value.coefficients) + 1),
          "--gauss-rhs-chars": Math.max(4, longestLine(value.rightHandSide) + 1),
          "--gauss-matrix-rows": contentRows,
        }}>
          <textarea id="gauss-matrix-coefficients" className="gauss-augmented-field"
            value={value.coefficients} rows={rows} wrap="off" spellCheck="false"
            aria-label={labels.matrixCoefficients} onPaste={pasteMatrix}
            onChange={(event) => onChange({ ...value, coefficients: event.target.value })} />
          <textarea id="gauss-matrix-rhs" className="gauss-augmented-field gauss-augmented-rhs"
            value={value.rightHandSide} rows={rows} wrap="off" spellCheck="false"
            aria-label={labels.matrixRightHandSide} onPaste={pasteMatrix}
            onChange={(event) => onChange({ ...value, rightHandSide: event.target.value })} />
        </div>
      </div>
    </div>
  );
}
