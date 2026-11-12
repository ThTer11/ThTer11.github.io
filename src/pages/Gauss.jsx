import { useEffect, useRef, useState } from "react";
import ToolPage, { ToolDetails } from "../components/ToolPage";
import RichContent from "../components/RichContent";
import AugmentedMatrixInput from "../components/AugmentedMatrixInput";
import { CodeBracketIcon } from "@heroicons/react/24/outline";
import { FaFilePdf } from "react-icons/fa";
import { buildGaussLatexDocument, buildGaussPdfHtml, gaussOperationLatex } from "../utils/gaussExport";
import { useLang } from "../App";
import { analyzeGaussInput, augmentedMatrixToLatex, systemToLatex, getSolutionGeometry, parseSystemInput, parseMatrixInput, runGaussianElimination } from "../utils/gauss";
import { joinAugmentedMatrixInput, matrixInputFromSystem, systemInputFromMatrix } from "../utils/augmentedMatrixInput";
import "../gauss.css";

function describeStep(step) {
  return `$$${gaussOperationLatex(step)}$$`;
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function statusClass(type) {
  if (type === "unique") {
    return "gauss-status gauss-status-success";
  }

  if (type === "infinite") {
    return "gauss-status gauss-status-warning";
  }

  return "gauss-status gauss-status-danger";
}

export default function Gauss() {
  const { t, lang } = useLang();
  const [mode, setMode] = useState("system");
  const [view, setView] = useState("system");
  const [input, setInput] = useState(t.gauss.exampleSystem);
  const [result, setResult] = useState(() => analyzeGaussInput("system", t.gauss.exampleSystem));
  const [matrixInput, setMatrixInput] = useState(() => matrixInputFromSystem({ augmentedMatrix: result.initialMatrix }));
  const [matrixVariables, setMatrixVariables] = useState(() => result.variableNames);
  const [editedMode, setEditedMode] = useState(null);
  const [error, setError] = useState("");
  const [inputHeight, setInputHeight] = useState("8rem");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!inputRef.current || typeof ResizeObserver === "undefined") return;
    const element = inputRef.current;
    const observer = new ResizeObserver(() => setInputHeight(element.getBoundingClientRect().height));
    observer.observe(element);
    return () => observer.disconnect();
  }, [mode]);

  const parseCurrentInput = () => {
    if (mode === "matrix" || editedMode === null) {
      const parsed = parseMatrixInput(joinAugmentedMatrixInput(matrixInput));
      if (matrixVariables.length === parsed.variableNames.length) parsed.variableNames = matrixVariables;
      return parsed;
    }
    const parsed = parseSystemInput(input);
    const names = [
      ...matrixVariables.filter((name) => parsed.variableNames.includes(name)),
      ...parsed.variableNames.filter((name) => !matrixVariables.includes(name)),
    ];
    return {
      variableNames: names,
      augmentedMatrix: parsed.augmentedMatrix.map((row) => [
        ...names.map((name) => row[parsed.variableNames.indexOf(name)]), row[row.length - 1],
      ]),
    };
  };

  const changeMode = (nextMode) => {
    if (nextMode === mode) return;
    const empty = mode === "system" ? !input.trim() : !matrixInput.coefficients.trim() && !matrixInput.rightHandSide.trim();
    if (empty) {
      setInput("");
      setMatrixInput({ coefficients: "", rightHandSide: "" });
      setMatrixVariables([]);
      setEditedMode(null);
      setMode(nextMode);
      setView(nextMode);
      setResult(null);
      setError("");
      return;
    }

    try {
      const parsed = parseCurrentInput();
      const nextResult = runGaussianElimination(parsed);
      if (editedMode === "system") setMatrixInput(matrixInputFromSystem(parsed));
      if (editedMode === "matrix") setInput(systemInputFromMatrix(parsed));
      setMatrixVariables(parsed.variableNames);
      setEditedMode(null);
      setMode(nextMode);
      setView(nextMode);
      setResult(nextResult);
      setError("");
    } catch (currentError) {
      setResult(null);
      setError(currentError.message);
    }
  };

  const runAnalysis = () => {
    try {
      setResult(runGaussianElimination(parseCurrentInput()));
      setError("");
    } catch (currentError) {
      setResult(null);
      setError(currentError.message);
    }
  };

  const exportLatex = (view) => {
    if (!result) {
      return;
    }

    downloadTextFile(
      view === "system" ? "gauss-systeme.tex" : "gauss-matrice.tex",
      buildGaussLatexDocument(result, view, { title: t.gauss.title, labels: t.gauss.exportDocument, lang }),
    );
  };

  const exportPdf = (view) => {
    if (!result) return;
    const popup = window.open("", "_blank");
    if (!popup) return;
    popup.document.open();
    popup.document.write(buildGaussPdfHtml(result, view, { title: t.gauss.title, labels: t.gauss.exportDocument, lang }));
    popup.document.close();
  };

  const renderMatrix = (matrix) => view === "system"
    ? systemToLatex(matrix, result.variableNames)
    : augmentedMatrixToLatex(matrix, result.variableNames.length);
  const geometry = result ? getSolutionGeometry(result) : null;

  return (
    <ToolPage title={t.gauss.title} className="gauss-page">
      <div className="gauss-layout">
        <section className="research-panel tool-panel gauss-input-card" aria-labelledby="gauss-input-title">
          <h2 id="gauss-input-title" className="tool-panel-title">{t.gauss.inputTitle}</h2>
          <div className="gauss-mode-row" role="group" aria-label={t.tools.inputFormat}>
            {["system", "matrix"].map((value) => (
              <button key={value} type="button" onClick={() => changeMode(value)} aria-pressed={mode === value}
                className={mode === value ? "gauss-mode gauss-mode-active" : "gauss-mode"}>
                {value === "system" ? t.gauss.modeSystem : t.gauss.modeMatrix}
              </button>
            ))}
          </div>
          {mode === "matrix" ? (
            <AugmentedMatrixInput value={matrixInput} onChange={(value) => { setMatrixInput(value); setEditedMode("matrix"); }} labels={t.gauss}
              containerRef={inputRef} height={inputHeight} />
          ) : (
            <textarea id="gauss-input" ref={inputRef} style={{ height: inputHeight }} value={input} onChange={(event) => { setInput(event.target.value); setEditedMode("system"); }}
              className="gauss-textarea" spellCheck="false" aria-labelledby="gauss-input-title" />
          )}
          <div className="gauss-actions">
            <button type="button" onClick={runAnalysis} className="tool-button tool-button-primary">{t.gauss.run}</button>
          </div>
          <section className="tool-export" aria-label={t.gauss.exportTitle}>
            <h3 className="gauss-block-title">{t.gauss.exportTitle}</h3>
            <div className="gauss-export-options">
              {[
                { view: "system", label: t.gauss.exportSystem },
                { view: "matrix", label: t.gauss.exportMatrix },
              ].map((option) => (
                <div className="gauss-export-option" key={option.view}>
                  <h4>{option.label}</h4>
                  <div className="gauss-export-actions">
                    <button type="button" onClick={() => exportLatex(option.view)} className="tool-button" disabled={!result}
                      aria-label={t.gauss.exportLatexLabel.replace("{view}", option.label)} title={t.gauss.exportLatexLabel.replace("{view}", option.label)}>
                      <CodeBracketIcon aria-hidden="true" />LaTeX
                    </button>
                    <button type="button" onClick={() => exportPdf(option.view)} className="tool-button gauss-export-pdf" disabled={!result}
                      aria-label={t.gauss.exportPdfLabel.replace("{view}", option.label)} title={t.gauss.exportPdfLabel.replace("{view}", option.label)}>
                      <FaFilePdf aria-hidden="true" />PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
          {error && <div className="gauss-error" role="alert"><strong>{t.gauss.analyzeError}</strong><span>{error}</span></div>}
        </section>

        <section className="research-panel tool-panel gauss-result-card" aria-labelledby="gauss-result-title">
          <div className="tool-panel-heading">
            <h2 id="gauss-result-title" className="tool-panel-title">{t.gauss.resultsTitle}</h2>
            {result && <span className={statusClass(result.analysis.type)}>
              {t.gauss.geometry[geometry.kind].replace("{dimension}", geometry.dimension)}
            </span>}
          </div>
          {result && <>
            <div className="tool-result">
              <RichContent as="div" className="gauss-math" html={result.solutionLatex} enableMathCopy={false} responsiveMath />
            </div>
            <ToolDetails title={t.tools.steps}>
              <div className="gauss-mode-row" role="group" aria-label={t.tools.display}>
                {["system", "matrix"].map((value) => (
                  <button key={value} type="button" onClick={() => setView(value)} aria-pressed={view === value}
                    className={view === value ? "gauss-mode gauss-mode-active" : "gauss-mode"}>
                    {value === "system" ? t.gauss.modeSystem : t.gauss.modeMatrix}
                  </button>
                ))}
              </div>
              <div className="gauss-block">
                <h3 className="gauss-block-title">{t.gauss.initialTitle}</h3>
                <RichContent as="div" className="gauss-math" html={renderMatrix(result.initialMatrix)} enableMathCopy={false} responsiveMath />
              </div>
              <div className="gauss-steps">
                {result.steps.slice(1).map((step, index) => (
                  <article key={`${step.type}-${index}`} className="gauss-step-card">
                    <div className="gauss-step-header">
                      <span className="gauss-step-index">{index + 1}</span>
                      <RichContent as="div" className="gauss-math gauss-step-formula" html={describeStep(step)} enableMathCopy={false} responsiveMath />
                    </div>
                    <RichContent as="div" className="gauss-math" html={renderMatrix(step.matrix)} enableMathCopy={false} responsiveMath />
                  </article>
                ))}
              </div>
            </ToolDetails>

          </>}
        </section>
      </div>
    </ToolPage>
  );
}
