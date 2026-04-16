import { useEffect, useMemo, useState } from "react";
import NavBar from "../components/NavBar";
import RichContent from "../components/RichContent";
import { useLang } from "../App";
import { analyzeLinearMapInput, canUseSameBasis } from "../utils/linearMap";
import "../showcase.css";
import "../gauss.css";
import "../linear-map.css";

function unwrapDisplayMath(rawLatex) {
  return rawLatex
    .replace(/^\$\$/, "")
    .replace(/\$\$$/, "")
    .replace(/^\$/, "")
    .replace(/\$$/, "");
}

function statusClass() {
  return "gauss-status gauss-status-success";
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

  return (
    <div className="showcase-page showcase-page-teaching gauss-page linear-map-page min-w-screen min-h-screen pb-10">
      <NavBar />

      <div className="showcase-shell">
        <div className="showcase-orb showcase-orb-a" />
        <div className="showcase-orb showcase-orb-b" />

        <section className="showcase-panel showcase-card animate-defil">
          <p className="showcase-eyebrow">{t.teaching.sectionResources}</p>
          <h1 className="showcase-title">{t.linearMap.title}</h1>
          <p className="showcase-lead">{t.linearMap.lead}</p>
        </section>

        <section className="gauss-layout">
          <section className="showcase-panel showcase-card gauss-input-card animate-defil">
            <h2 className="showcase-section-title">{t.linearMap.inputTitle}</h2>

            <div className="gauss-mode-row">
              <button
                type="button"
                onClick={() => setSameBasis(false)}
                className={!sameBasis ? "gauss-mode gauss-mode-active" : "gauss-mode"}
              >
                {t.linearMap.modeTwoBases}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sameBasisAvailable) {
                    setSameBasis(true);
                  }
                }}
                className={sameBasis ? "gauss-mode gauss-mode-active" : "gauss-mode"}
                disabled={!sameBasisAvailable && !sameBasis}
              >
                {t.linearMap.modeEndomorphism}
              </button>
            </div>

            {!sameBasisAvailable && (
              <p className="gauss-help">{t.linearMap.sameBasisHelp}</p>
            )}

            <div className="linear-map-input-grid">
              <div className="linear-map-field">
                <label className="linear-map-label" htmlFor="source-basis">
                  {t.linearMap.sourceBasisLabel}
                </label>
                <p className="gauss-help">{t.linearMap.basisHelp}</p>
                <textarea
                  id="source-basis"
                  value={sourceBasisText}
                  onChange={(event) => setSourceBasisText(event.target.value)}
                  className="gauss-textarea linear-map-textarea"
                  spellCheck="false"
                />
              </div>

              {!sameBasis && (
                <div className="linear-map-field">
                  <label className="linear-map-label" htmlFor="target-basis">
                    {t.linearMap.targetBasisLabel}
                  </label>
                  <p className="gauss-help">{t.linearMap.basisHelp}</p>
                  <textarea
                    id="target-basis"
                    value={targetBasisText}
                    onChange={(event) => setTargetBasisText(event.target.value)}
                    className="gauss-textarea linear-map-textarea"
                    spellCheck="false"
                  />
                </div>
              )}

              <div className="linear-map-field linear-map-field-full">
                <label className="linear-map-label" htmlFor="formula">
                  {t.linearMap.formulaLabel}
                </label>
                <p className="gauss-help">{t.linearMap.formulaHelp}</p>
                <textarea
                  id="formula"
                  value={formulaText}
                  onChange={(event) => setFormulaText(event.target.value)}
                  className="gauss-textarea linear-map-textarea"
                  spellCheck="false"
                />
              </div>
            </div>

            <div className="gauss-actions">
              <button type="button" onClick={runAnalysis} className="showcase-action showcase-action-primary">
                {t.linearMap.run}
              </button>
              <button
                type="button"
                onClick={loadExample}
                className="showcase-action showcase-action-secondary"
              >
                {t.linearMap.resetExample}
              </button>
            </div>

            {error && (
              <div className="gauss-error">
                <strong>{t.linearMap.analyzeError}</strong>
                <span>{error}</span>
              </div>
            )}
          </section>

          <section className="showcase-panel showcase-card gauss-result-card animate-defil">
            <h2 className="showcase-section-title">{t.linearMap.resultsTitle}</h2>

            {result && (
              <>
                <div className="gauss-summary">
                  <p className="gauss-summary-label">{t.linearMap.summaryTitle}</p>
                  <span className={statusClass()}>
                    {t.linearMap.summaryReady} {result.dimension}
                  </span>
                </div>

                {result.formulaLatex && (
                  <div className="gauss-block">
                    <RichContent
                      as="h3"
                      className="gauss-block-title"
                      html={t.linearMap.formulaTitle}
                      enableMathCopy={false}
                    />
                    <div className="gauss-solution-card">
                      <RichContent as="div" className="gauss-math" html={result.formulaLatex} enableMathCopy={false} />
                    </div>
                  </div>
                )}

                <div className="gauss-block">
                  <RichContent
                    as="h3"
                    className="gauss-block-title"
                    html={t.linearMap.basesTitle}
                    enableMathCopy={false}
                  />
                  <div className="gauss-step-views">
                    <div className="gauss-view-card">
                      <p className="gauss-view-title">{t.linearMap.sourceBasisLabel}</p>
                      <RichContent as="div" className="gauss-math" html={result.sourceBasisLatex} enableMathCopy={false} />
                    </div>

                    <div className="gauss-view-card">
                      <p className="gauss-view-title">{t.linearMap.targetBasisLabel}</p>
                      <RichContent as="div" className="gauss-math" html={result.targetBasisLatex} enableMathCopy={false} />
                    </div>
                  </div>
                </div>

                <div className="gauss-block">
                  <RichContent
                    as="h3"
                    className="gauss-block-title"
                    html={t.linearMap.explanationTitle}
                    enableMathCopy={false}
                  />

                  <div className="linear-map-columns">
                    {result.columns.map((column) => (
                      <article key={column.sourceLabel} className="gauss-step-card">
                        <div className="linear-map-column-header">
                          <span className="gauss-step-index">{column.index + 1}</span>
                          <RichContent
                            as="strong"
                            className="linear-map-column-title"
                            html={`$${column.sourceLabel}$`}
                            enableMathCopy={false}
                          />
                        </div>

                        <div className="linear-map-formulas">
                          <RichContent
                            as="div"
                            className="gauss-math"
                            html={`$$f(${column.sourceLabel}) = ${unwrapDisplayMath(column.imageLatex)} = ${column.vectorDecompositionLatex} = ${column.decompositionLatex}$$`}
                            enableMathCopy={false}
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="gauss-block">
                  <RichContent
                    as="h3"
                    className="gauss-block-title"
                    html={t.linearMap.matrixTitle}
                    enableMathCopy={false}
                  />
                  <div className="gauss-solution-card">
                    <RichContent
                      as="div"
                      className="gauss-math"
                      html={`$$${unwrapDisplayMath(result.matrixTitleLatex)} = ${unwrapDisplayMath(result.matrixLatex)}$$`}
                      enableMathCopy={false}
                    />
                  </div>
                </div>
              </>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}
