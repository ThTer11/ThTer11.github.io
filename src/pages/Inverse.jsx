import { useEffect, useRef, useState } from "react";
import ToolPage, { ToolDetails } from "../components/ToolPage";
import RichContent from "../components/RichContent";
import { useLang } from "../App";
import { analyzeInverseInput, augmentedMatrixToLatex, matrixToLatex } from "../utils/gauss";
import "../gauss.css";

function describeStep(step) {
  if (step.type === "initial") {
    return "$$\\text{Initial}$$";
  }

  if (step.type === "swap") {
    return `$$L_{${step.row + 1}} \\leftrightarrow L_{${step.withRow + 1}}$$`;
  }

  if (step.type === "scale") {
    const factorLatex =
      step.factor.equals(-1)
        ? "-"
        : (step.factor.toFactorLatex?.() ?? step.factor.toLatex());
    return `$$L_{${step.row + 1}} \\leftarrow ${factorLatex}L_{${step.row + 1}}$$`;
  }

  const factor = step.factor;
  const sign = (factor.isNegative?.() ?? factor.numerator < 0n) ? "+" : "-";
  const absolute = factor.abs();
  const scalar = absolute.isOne() ? "" : (absolute.toFactorLatex?.() ?? absolute.toLatex());
  return `$$L_{${step.row + 1}} \\leftarrow L_{${step.row + 1}} ${sign} ${scalar}L_{${step.withRow + 1}}$$`;
}

function statusClass(isInvertible) {
  return isInvertible
    ? "gauss-status gauss-status-success"
    : "gauss-status gauss-status-danger";
}

export default function Inverse() {
  const { t, lang } = useLang();
  const [input, setInput] = useState(t.inverse.exampleMatrix);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const requestVersion = useRef(0);

  useEffect(() => {
    requestVersion.current++;
    try {
      setResult(analyzeInverseInput(t.inverse.exampleMatrix));
      setError("");
    } catch (currentError) {
      setResult(null);
      setError(currentError.message);
    }
    return () => { requestVersion.current++; };
  }, [t.inverse.exampleMatrix]);

  const loadExample = () => {
    requestVersion.current++;
    setBusy(false);
    setInput(t.inverse.exampleMatrix);

    try {
      setResult(analyzeInverseInput(t.inverse.exampleMatrix));
      setError("");
    } catch (currentError) {
      setResult(null);
      setError(currentError.message);
    }
  };

  const runAnalysis = async () => {
    const request = ++requestVersion.current;
    setBusy(true);
    try {
      let next;
      try { next = analyzeInverseInput(input); }
      catch (_) {
        const { analyzeSymbolicInverseInput } = await import("../utils/symbolicMatrix");
        next = analyzeSymbolicInverseInput(input, lang);
      }
      if (request !== requestVersion.current) return;
      setResult(next);
      setError("");
    } catch (currentError) {
      if (request !== requestVersion.current) return;
      setResult(null);
      setError(currentError.message);
    } finally {
      if (request === requestVersion.current) setBusy(false);
    }
  };

  return (
    <ToolPage title={t.inverse.title} className="gauss-page inverse-page">
      <div className="gauss-layout">
        <section className="research-panel tool-panel gauss-input-card" aria-labelledby="inverse-input-title">
          <h2 id="inverse-input-title" className="tool-panel-title">{t.inverse.inputTitle}</h2>
          <textarea id="inverse-input" value={input} onChange={(event) => setInput(event.target.value)}
            className="gauss-textarea" spellCheck="false" aria-labelledby="inverse-input-title" />
          <div className="gauss-actions">
            <button type="button" onClick={runAnalysis} className="tool-button tool-button-primary" disabled={busy}>{busy ? t.inverse.computing : t.inverse.run}</button>
            <button type="button" onClick={loadExample} className="tool-button">{t.inverse.resetExample}</button>
          </div>
          {error && <div className="gauss-error" role="alert"><strong>{t.inverse.analyzeError}</strong><span>{error}</span></div>}
        </section>
        <section className="research-panel tool-panel gauss-result-card" aria-labelledby="inverse-result-title">
          <div className="tool-panel-heading">
            <h2 id="inverse-result-title" className="tool-panel-title">{t.inverse.resultsTitle}</h2>
            {result && <span className={result.isInvertible && result.hasParameters ? "gauss-status gauss-status-warning" : statusClass(result.isInvertible)}>
              {result.isInvertible ? (result.hasParameters ? t.inverse.statusConditional : t.inverse.statusInvertible) : t.inverse.statusSingular}
            </span>}
          </div>
          {result && <>
            <div className="tool-result">
              <RichContent as="div" className="gauss-math" html={result.isInvertible && result.inverseMatrix
                ? `$$A^{-1} = ${matrixToLatex(result.inverseMatrix).replace(/^\$\$|\$\$$/g, "")}$$`
                : `$$${t.inverse.noInverseLatex}$$`} enableMathCopy={false} responsiveMath />
              {result.isInvertible && result.hasParameters && <RichContent as="p" className="tool-result-label inverse-conditions"
                html={`${t.inverse.coefficientsDefined}${result.determinant.isProvablyNonZero() ? "." : `, $\\det(A)=${result.determinant.toLatex()}\\ne0$.`}`} enableMathCopy={false} responsiveMath />}
            </div>
            <ToolDetails title={t.tools.steps}>
              {result.pivotConditions?.length > 0 && <RichContent as="p" className="tool-result-label"
                html={`${t.inverse.stepConditions} $${[...new Set(result.pivotConditions.map(value => `${value.toLatex()}\\ne0`))].join(",\\;")}$.`} enableMathCopy={false} responsiveMath />}
              <div className="gauss-block">
                <h3 className="gauss-block-title">{t.inverse.augmentedView}</h3>
                <RichContent as="div" className="gauss-math" html={augmentedMatrixToLatex(result.initialAugmented, result.size)} enableMathCopy={false} responsiveMath />
              </div>
              <div className="gauss-steps">
                {result.steps.slice(1).map((step, index) => (
                  <article key={`${step.type}-${index}`} className="gauss-step-card">
                    <div className="gauss-step-header">
                      <span className="gauss-step-index">{index + 1}</span>
                      <RichContent as="div" className="gauss-math gauss-step-formula" html={describeStep(step)} enableMathCopy={false} responsiveMath />
                    </div>
                    <RichContent as="div" className="gauss-math" html={augmentedMatrixToLatex(step.matrix, result.size)} enableMathCopy={false} responsiveMath />
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
