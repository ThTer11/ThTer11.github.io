import { useRef, useState } from "react";
import MathRenderer from "./MathRenderer";
import { matrixCoefficientCalculation, matrixScalarLatex } from "../../exercises/math/matrixProductCalculation";
import "./matrix-product-explanation.css";

function DisplayMatrix({ name, values, selectedRow, selectedColumn, onSelect, selected, lang, cellRefs }) {
  return <div className="matrix-explorer-factor">
    <MathRenderer as="span" content={`$${name}=$`} className="matrix-explorer-name" responsiveMath={false} />
    <div className="matrix-explorer-parentheses">
      <table className="matrix-explorer-table" aria-label={lang === "en" ? `Matrix ${name}` : `Matrice ${name}`}>
        <tbody>{values.map((row, i) => <tr key={i}>{row.map((value, j) => {
          const highlighted = i === selectedRow || j === selectedColumn;
          return <td key={j} className={highlighted ? selectedRow !== undefined ? "matrix-explorer-row" : "matrix-explorer-column" : undefined}>
            {onSelect ? <button type="button" className="matrix-explorer-coefficient"
              ref={(node) => { cellRefs.current[i * row.length + j] = node; }}
              aria-label={`${lang === "en" ? "Entry" : "Coefficient"} ${i + 1}, ${j + 1} : ${String(value)}`}
              aria-pressed={selected[0] === i && selected[1] === j}
              onClick={() => onSelect([i, j])}
              onKeyDown={(event) => {
                const movement = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[event.key];
                if (!movement) return;
                event.preventDefault();
                const nextRow = (i + movement[0] + values.length) % values.length;
                const nextColumn = (j + movement[1] + row.length) % row.length;
                onSelect([nextRow, nextColumn]);
                cellRefs.current[nextRow * row.length + nextColumn]?.focus({ preventScroll: true });
              }}>
              <MathRenderer as="span" content={`$${matrixScalarLatex(value)}$`} responsiveMath={false} />
            </button> : <MathRenderer as="span" content={`$${matrixScalarLatex(value)}$`} responsiveMath={false} />}
          </td>;
        })}</tr>)}</tbody>
      </table>
    </div>
  </div>;
}

export default function MatrixProductExplanation({ question, lang = "fr" }) {
  const [selected, setSelected] = useState([0, 0]);
  const cellRefs = useRef([]);
  const [row, column] = selected;
  const calculation = matrixCoefficientCalculation(question, row, column);
  const [leftName, rightName] = question.product;
  const coefficient = `(${question.product})_{${row + 1},${column + 1}}`;
  return <div className="matrix-product-explorer">
    <div className="matrix-explorer-products">
      <div className="matrix-explorer-factors">
        <DisplayMatrix name={leftName} values={question.left} selectedRow={row} lang={lang} />
        <DisplayMatrix name={rightName} values={question.right} selectedColumn={column} lang={lang} />
      </div>
      <div className="matrix-explorer-result">
        <DisplayMatrix name={question.product} values={question.expected.matrix} selected={selected}
          onSelect={setSelected} cellRefs={cellRefs} lang={lang} />
      </div>
    </div>
    <p className="matrix-explorer-instruction">{lang === "en" ? "Select an entry of the product to see the details." : "Cliquer sur un coefficient du produit pour voir le détail."}</p>
    <div className="matrix-explorer-calculation" aria-live="polite" aria-atomic="true">
      <MathRenderer content={`$$${coefficient}=${calculation.terms}=${calculation.result}$$`} />
    </div>
  </div>;
}
