import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import RichContent from "../components/RichContent";
import { useLang } from "../App";
import { analyzeInverseInput, augmentedMatrixToLatex, matrixToLatex } from "../utils/gauss";
import "../showcase.css";
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
      step.factor.numerator === -step.factor.denominator
        ? "-"
        : step.factor.toLatex();
    return `$$L_{${step.row + 1}} \\leftarrow ${factorLatex}L_{${step.row + 1}}$$`;
  }

  const factor = step.factor;
  const sign = factor.numerator < 0n ? "+" : "-";
  const absolute = factor.abs();
  const scalar = absolute.isOne() ? "" : absolute.toLatex();
  return `$$L_{${step.row + 1}} \\leftarrow L_{${step.row + 1}} ${sign} ${scalar}L_{${step.withRow + 1}}$$`;
}

function statusClass(isInvertible) {
  return isInvertible
    ? "gauss-status gauss-status-success"
    : "gauss-status gauss-status-danger";
}

export default function Inverse() {
  const { t } = useLang();
  const [input, setInput] = useState(t.inverse.exampleMatrix);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setResult(analyzeInverseInput(t.inverse.exampleMatrix));
      setError("");
    } catch (currentError) {
      setResult(null);
      setError(currentError.message);
    }
  }, [t.inverse.exampleMatrix]);

  const loadExample = () => {
    setInput(t.inverse.exampleMatrix);

    try {
      setResult(analyzeInverseInput(t.inverse.exampleMatrix));
      setError("");
    } catch (currentError) {
      setResult(null);
      setError(currentError.message);
    }
  };

  const runAnalysis = () => {
    try {
      setResult(analyzeInverseInput(input));
      setError("");
    } catch (currentError) {
      setResult(null);
      setError(currentError.message);
    }
  };

  return (
    <div className="showcase-page showcase-page-teaching gauss-page min-w-screen min-h-screen pb-10">
      <NavBar />

      <div className="showcase-shell">
        <div className="showcase-orb showcase-orb-a" />
        <div className="showcase-orb showcase-orb-b" />

        <section className="showcase-panel showcase-card animate-defil">
          <p className="showcase-eyebrow">{t.teaching.sectionResources}</p>
          <h1 className="showcase-title">{t.inverse.title}</h1>
          <p className="showcase-lead">{t.inverse.lead}</p>
        </section>

        <section className="gauss-layout">
          <section className="showcase-panel showcase-card gauss-input-card animate-defil">
            <h2 className="showcase-section-title">{t.inverse.inputTitle}</h2>

            <p className="gauss-help">{t.inverse.matrixHelp}</p>

            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="gauss-textarea"
              spellCheck="false"
            />

            <div className="gauss-actions">
              <button type="button" onClick={runAnalysis} className="showcase-action showcase-action-primary">
                {t.inverse.run}
              </button>
              <button
                type="button"
                onClick={loadExample}
                className="showcase-action showcase-action-secondary"
              >
                {t.inverse.resetExample}
              </button>
            </div>

            {error && (
              <div className="gauss-error">
                <strong>{t.inverse.analyzeError}</strong>
                <span>{error}</span>
              </div>
            )}
          </section>

          <section className="showcase-panel showcase-card gauss-result-card animate-defil">
            <h2 className="showcase-section-title">{t.inverse.resultsTitle}</h2>

            {result && (
              <>
                <div className="gauss-summary">
                  <p className="gauss-summary-label">{t.inverse.natureTitle}</p>
                  <span className={statusClass(result.isInvertible)}>
                    {result.isInvertible ? t.inverse.statusInvertible : t.inverse.statusSingular}
                  </span>
                </div>

                <div className="gauss-block">
                  <h3 className="gauss-block-title">{t.inverse.initialTitle}</h3>
                  <div className="gauss-step-views">
                    <div className="gauss-view-card">
                      <p className="gauss-view-title">{t.inverse.matrixView}</p>
                      <RichContent
                        as="div"
                        className="gauss-math"
                        html={matrixToLatex(result.initialMatrix)}
                        enableMathCopy={false}
                      />
                    </div>

                    <div className="gauss-view-card">
                      <p className="gauss-view-title">{t.inverse.augmentedView}</p>
                      <RichContent
                        as="div"
                        className="gauss-math"
                        html={augmentedMatrixToLatex(result.initialAugmented, result.size)}
                        enableMathCopy={false}
                      />
                    </div>
                  </div>
                </div>

                <div className="gauss-block">
                  <h3 className="gauss-block-title">{t.inverse.stepsTitle}</h3>

                  <div className="gauss-steps inverse-steps-grid">
                    {result.steps.slice(1).map((step, index) => (
                      <article key={`${step.type}-${index}`} className="gauss-step-card">
                        <div className="gauss-step-header">
                          <span className="gauss-step-index">{index + 1}</span>
                          <RichContent
                            as="div"
                            className="gauss-step-label gauss-step-formula"
                            html={describeStep(step)}
                            enableMathCopy={false}
                          />
                        </div>

                        <div className="gauss-step-views">
                          <div className="gauss-view-card">
                            <p className="gauss-view-title">{t.inverse.augmentedView}</p>
                            <RichContent
                              as="div"
                              className="gauss-math"
                              html={augmentedMatrixToLatex(step.matrix, result.size)}
                              enableMathCopy={false}
                            />
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="gauss-block">
                  <h3 className="gauss-block-title">{t.inverse.reducedTitle}</h3>
                  <div className="gauss-step-views">
                    <div className="gauss-view-card">
                      <p className="gauss-view-title">{t.inverse.augmentedView}</p>
                      <RichContent
                        as="div"
                        className="gauss-math"
                        html={augmentedMatrixToLatex(result.finalAugmented, result.size)}
                        enableMathCopy={false}
                      />
                    </div>
                  </div>
                </div>

                <div className="gauss-block">
                  <h3 className="gauss-block-title">{t.inverse.inverseTitle}</h3>
                  <div className="gauss-solution-card">
                    <RichContent
                      as="div"
                      className="gauss-math"
                      html={
                        result.isInvertible && result.inverseMatrix
                          ? matrixToLatex(result.inverseMatrix)
                          : `$$${t.inverse.noInverseLatex}$$`
                      }
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
