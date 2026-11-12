import { useEffect, useMemo, useState } from "react";
import ToolPage, { ToolDetails } from "../components/ToolPage";
import RichContent from "../components/RichContent";
import { useLang } from "../App";
import { analyzeLinearMapInput, canonicalBasisText, canUseSameBasis, inferLinearMapSourceDimension } from "../utils/linearMap";
import "../gauss.css";
import "../linear-map.css";

function unwrapDisplayMath(rawLatex) {
  return rawLatex
    .replace(/^\$\$/, "")
    .replace(/\$\$$/, "")
    .replace(/^\$/, "")
    .replace(/\$$/, "");
}

function basisDimension(text) {
  return text.trim().split("\n").find((line) => line.trim())?.trim().split(/[\s,;]+/).length || 1;
}

export default function LinearMap() {
  const { t } = useLang();
  const examples = useMemo(
    () => ({
      general: {
        sourceBasis: t.linearMap.exampleGeneralSourceBasis,
        targetBasis: t.linearMap.exampleGeneralTargetBasis,
        formula: t.linearMap.exampleGeneralFormula,
      },
      endomorphism: {
        sourceBasis: t.linearMap.exampleEndomorphismBasis,
        targetBasis: t.linearMap.exampleEndomorphismBasis,
        formula: t.linearMap.exampleEndomorphismFormula,
      },
    }),
    [
      t.linearMap.exampleEndomorphismBasis,
      t.linearMap.exampleEndomorphismFormula,
      t.linearMap.exampleGeneralFormula,
      t.linearMap.exampleGeneralSourceBasis,
      t.linearMap.exampleGeneralTargetBasis,
    ],
  );
  const [sameBasis, setSameBasis] = useState(false);
  const [sourceBasisText, setSourceBasisText] = useState(examples.general.sourceBasis);
  const [targetBasisText, setTargetBasisText] = useState(examples.general.targetBasis);
  const [formulaText, setFormulaText] = useState(examples.general.formula);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const sourceDimension = inferLinearMapSourceDimension(formulaText, basisDimension(sourceBasisText));
  const targetDimension = formulaText.split("\n").filter((line) => line.trim()).length || basisDimension(targetBasisText);

  const sameBasisAvailable = canUseSameBasis({
    sourceBasisText,
    targetBasisText,
    imageText: "",
    inputMode: "formula",
    formulaText,
  });

  useEffect(() => {
    try {
      setResult(
        analyzeLinearMapInput({
          sourceBasisText,
          targetBasisText,
          imageText: "",
          formulaText,
          inputMode: "formula",
          sameBasis,
        }),
      );
      setError("");
    } catch (currentError) {
      setResult(null);
      setError(currentError.message);
    }
  }, [formulaText, sameBasis, sourceBasisText, targetBasisText]);

  const runAnalysis = () => {
    try {
      setResult(
        analyzeLinearMapInput({
          sourceBasisText,
          targetBasisText,
          imageText: "",
          formulaText,
          inputMode: "formula",
          sameBasis,
        }),
      );
      setError("");
    } catch (currentError) {
      setResult(null);
      setError(currentError.message);
    }
  };

  const loadExample = () => {
    const currentExample = sameBasis ? examples.endomorphism : examples.general;
    setSourceBasisText(currentExample.sourceBasis);
    setTargetBasisText(currentExample.targetBasis);
    setFormulaText(currentExample.formula);

    try {
      setResult(
        analyzeLinearMapInput({
          sourceBasisText: currentExample.sourceBasis,
          targetBasisText: currentExample.targetBasis,
          imageText: "",
          formulaText: currentExample.formula,
          inputMode: "formula",
          sameBasis,
        }),
      );
      setError("");
    } catch (currentError) {
      setResult(null);
      setError(currentError.message);
    }
  };

  const useCanonicalSourceBasis = () => {
    setSourceBasisText(canonicalBasisText(sourceDimension));
    if (sameBasis && sourceDimension !== targetDimension) setSameBasis(false);
  };

  return (
    <ToolPage title={<RichContent as="span" html={t.linearMap.title} enableMathCopy={false} />} className="gauss-page linear-map-page">
      <div className="gauss-layout">
        <section className="research-panel tool-panel gauss-input-card" aria-labelledby="linear-input-title">
          <h2 id="linear-input-title" className="tool-panel-title">{t.linearMap.inputTitle}</h2>
          <div className="gauss-mode-row" role="group" aria-label={t.linearMap.basesTitle}>
            <button type="button" onClick={() => setSameBasis(false)} aria-pressed={!sameBasis}
              className={!sameBasis ? "gauss-mode gauss-mode-active" : "gauss-mode"}>{t.linearMap.modeTwoBases}</button>
            <button type="button" onClick={() => { if (sameBasisAvailable) setSameBasis(true); }} aria-pressed={sameBasis}
              className={sameBasis ? "gauss-mode gauss-mode-active" : "gauss-mode"} disabled={!sameBasisAvailable && !sameBasis}>
              {t.linearMap.modeEndomorphism}
            </button>
          </div>
          <div className="linear-map-input-grid">
            <div className="linear-map-field">
              <div className="linear-map-field-heading">
                <label className="linear-map-label" htmlFor="source-basis">{t.linearMap.sourceBasisLabel}</label>
                <button type="button" className="tool-button linear-map-canonical" onClick={useCanonicalSourceBasis}
                  aria-label={`${t.linearMap.canonicalBasis} — ${t.linearMap.sourceBasisLabel}`}>{t.linearMap.canonicalBasis}</button>
              </div>
              <textarea id="source-basis" value={sourceBasisText} onChange={(event) => setSourceBasisText(event.target.value)}
                className="gauss-textarea linear-map-textarea" spellCheck="false" />
            </div>
            {!sameBasis && <div className="linear-map-field">
              <div className="linear-map-field-heading">
                <label className="linear-map-label" htmlFor="target-basis">{t.linearMap.targetBasisLabel}</label>
                <button type="button" className="tool-button linear-map-canonical" onClick={() => setTargetBasisText(canonicalBasisText(targetDimension))}
                  aria-label={`${t.linearMap.canonicalBasis} — ${t.linearMap.targetBasisLabel}`}>{t.linearMap.canonicalBasis}</button>
              </div>
              <textarea id="target-basis" value={targetBasisText} onChange={(event) => setTargetBasisText(event.target.value)}
                className="gauss-textarea linear-map-textarea" spellCheck="false" />
            </div>}
            <div className="linear-map-field linear-map-field-full">
              <label className="linear-map-label" htmlFor="formula">{t.linearMap.formulaLabel}</label>
              {result?.variablesLatex && <RichContent as="p" className="linear-map-variables" html={`${t.linearMap.variablesLabel} : $(${result.variablesLatex})$`} enableMathCopy={false} />}
              <textarea id="formula" value={formulaText} onChange={(event) => setFormulaText(event.target.value)}
                className="gauss-textarea linear-map-textarea" spellCheck="false" />
            </div>
          </div>
          <div className="gauss-actions">
            <button type="button" onClick={runAnalysis} className="tool-button tool-button-primary">{t.linearMap.run}</button>
            <button type="button" onClick={loadExample} className="tool-button">{t.linearMap.resetExample}</button>
          </div>
          {error && <div className="gauss-error" role="alert"><strong>{t.linearMap.analyzeError}</strong><span>{error}</span></div>}
        </section>
        <section className="research-panel tool-panel gauss-result-card" aria-labelledby="linear-result-title">
          <h2 id="linear-result-title" className="tool-panel-title">{t.linearMap.resultsTitle}</h2>
          {result && <>
            <div className="tool-result">
              <RichContent as="div" className="gauss-math"
                html={`$$${unwrapDisplayMath(result.matrixTitleLatex)} = ${unwrapDisplayMath(result.matrixLatex)}$$`} enableMathCopy={false} responsiveMath />
            </div>
            <ToolDetails title={t.tools.steps}>
              {result.formulaLatex && <div className="gauss-block">
                <h3 className="gauss-block-title">{t.linearMap.formulaTitle}</h3>
                <RichContent as="div" className="gauss-math" html={result.formulaLatex} enableMathCopy={false} responsiveMath />
              </div>}
              <div className="linear-map-bases">
                <div>
                  <h3 className="gauss-block-title">{t.linearMap.sourceBasisLabel}</h3>
                  <RichContent as="div" className="gauss-math" html={result.sourceBasisLatex} enableMathCopy={false} responsiveMath />
                </div>
                <div>
                  <h3 className="gauss-block-title">{t.linearMap.targetBasisLabel}</h3>
                  <RichContent as="div" className="gauss-math" html={result.targetBasisLatex} enableMathCopy={false} responsiveMath />
                </div>
              </div>
              <div className="gauss-block">
                <h3 className="gauss-block-title">{t.linearMap.explanationTitle}</h3>
                <div className="linear-map-columns">
                  {result.columns.map((column) => (
                    <article key={column.sourceLabel} className="linear-map-image">
                      <div className="linear-map-formulas">
                        <RichContent as="div" className="gauss-math" html={`$$f(${column.sourceLabel}) = ${unwrapDisplayMath(column.imageLatex)} = ${column.vectorDecompositionLatex}$$`} enableMathCopy={false} responsiveMath />
                        <RichContent as="p" className="linear-map-conclusion gauss-math" html={`${t.linearMap.therefore} $f(${column.sourceLabel}) = ${column.decompositionLatex}$.`} enableMathCopy={false} responsiveMath />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </ToolDetails>
          </>}
        </section>
      </div>
    </ToolPage>
  );
}
