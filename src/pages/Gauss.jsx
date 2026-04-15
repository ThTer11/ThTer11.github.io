import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import RichContent from "../components/RichContent";
import { useLang } from "../App";
import { analyzeGaussInput, matrixToLatex, systemToLatex } from "../utils/gauss";
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
  const { t } = useLang();
  const [mode, setMode] = useState("system");
  const [input, setInput] = useState(t.gauss.exampleSystem);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setResult(analyzeGaussInput("system", t.gauss.exampleSystem));
      setError("");
    } catch (currentError) {
      setResult(null);
      setError(currentError.message);
    }
  }, [t.gauss.exampleSystem]);

  const loadExample = (nextMode) => {
    const example = nextMode === "system" ? t.gauss.exampleSystem : t.gauss.exampleMatrix;
    setMode(nextMode);
    setInput(example);

    try {
      setResult(analyzeGaussInput(nextMode, example));
      setError("");
    } catch (currentError) {
      setResult(null);
      setError(currentError.message);
    }
  };

  const runAnalysis = () => {
    try {
      setResult(analyzeGaussInput(mode, input));
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
          <h1 className="showcase-title">{t.gauss.title}</h1>
          <p className="showcase-lead">{t.gauss.lead}</p>
        </section>

        <section className="gauss-layout">
          <section className="showcase-panel showcase-card gauss-input-card animate-defil">
            <h2 className="showcase-section-title">{t.gauss.inputTitle}</h2>

            <div className="gauss-mode-row">
              <button
                type="button"
                onClick={() => loadExample("system")}
                className={mode === "system" ? "gauss-mode gauss-mode-active" : "gauss-mode"}
              >
                {t.gauss.modeSystem}
              </button>
              <button
                type="button"
                onClick={() => loadExample("matrix")}
                className={mode === "matrix" ? "gauss-mode gauss-mode-active" : "gauss-mode"}
              >
                {t.gauss.modeMatrix}
              </button>
            </div>

            <p className="gauss-help">
              {mode === "system" ? t.gauss.systemHelp : t.gauss.matrixHelp}
            </p>

            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="gauss-textarea"
              spellCheck="false"
            />

            <div className="gauss-actions">
              <button type="button" onClick={runAnalysis} className="showcase-action showcase-action-primary">
                {t.gauss.run}
              </button>
              <button
                type="button"
                onClick={() => loadExample(mode)}
                className="showcase-action showcase-action-secondary"
              >
                {t.gauss.resetExample}
              </button>
            </div>

            {error && (
              <div className="gauss-error">
                <strong>{t.gauss.analyzeError}</strong>
                <span>{error}</span>
              </div>
            )}
          </section>

          <section className="showcase-panel showcase-card gauss-result-card animate-defil">
            <h2 className="showcase-section-title">{t.gauss.resultsTitle}</h2>

            {result && (
              <>
                <div className="gauss-summary">
                  <p className="gauss-summary-label">{t.gauss.natureTitle}</p>
                  <span className={statusClass(result.analysis.type)}>
                    {result.analysis.type === "unique"
                      ? t.gauss.statusUnique
                      : result.analysis.type === "infinite"
                        ? t.gauss.statusInfinite
                        : t.gauss.statusInconsistent}
                  </span>
                </div>

                <div className="gauss-block">
                  <h3 className="gauss-block-title">{t.gauss.initialTitle}</h3>
                  <div className="gauss-step-views">
                    <div className="gauss-view-card">
                      <p className="gauss-view-title">{t.gauss.systemView}</p>
                      <RichContent
                        as="div"
                        className="gauss-math"
                        html={systemToLatex(result.initialMatrix, result.variableNames)}
                        enableMathCopy={false}
                      />
                    </div>

                    <div className="gauss-view-card">
                      <p className="gauss-view-title">{t.gauss.matrixView}</p>
                      <RichContent
                        as="div"
                        className="gauss-math"
                        html={matrixToLatex(result.initialMatrix)}
                        enableMathCopy={false}
                      />
                    </div>
                  </div>
                </div>

                <div className="gauss-block">
                  <h3 className="gauss-block-title">{t.gauss.reducedTitle}</h3>
                  <div className="gauss-step-views">
                    <div className="gauss-view-card">
                      <p className="gauss-view-title">{t.gauss.systemView}</p>
                      <RichContent
                        as="div"
                        className="gauss-math"
                        html={systemToLatex(result.finalMatrix, result.variableNames)}
                        enableMathCopy={false}
                      />
                    </div>

                    <div className="gauss-view-card">
                      <p className="gauss-view-title">{t.gauss.matrixView}</p>
                      <RichContent
                        as="div"
                        className="gauss-math"
                        html={matrixToLatex(result.finalMatrix)}
                        enableMathCopy={false}
                      />
                    </div>
                  </div>
                </div>

                <div className="gauss-block">
                  <h3 className="gauss-block-title">{t.gauss.stepsTitle}</h3>

                  <div className="gauss-steps">
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
                            <p className="gauss-view-title">{t.gauss.systemView}</p>
                            <RichContent
                              as="div"
                              className="gauss-math"
                              html={systemToLatex(step.matrix, result.variableNames)}
                              enableMathCopy={false}
                            />
                          </div>

                          <div className="gauss-view-card">
                            <p className="gauss-view-title">{t.gauss.matrixView}</p>
                            <RichContent
                              as="div"
                              className="gauss-math"
                              html={matrixToLatex(step.matrix)}
                              enableMathCopy={false}
                            />
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="gauss-block">
                  <h3 className="gauss-block-title">{t.gauss.solutionTitle}</h3>
                  <div className="gauss-solution-card">
                    <RichContent
                      as="div"
                      className="gauss-math"
                      html={result.solutionLatex}
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
