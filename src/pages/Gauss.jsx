import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import RichContent from "../components/RichContent";
import { useLang } from "../App";
import { analyzeGaussInput, augmentedMatrixToLatex, systemToLatex } from "../utils/gauss";
import "../showcase.css";
import "../gauss.css";

function stepOperationLatex(step) {
  if (step.type === "initial") {
    return "\\text{Initial}";
  }

  if (step.type === "swap") {
    return `L_{${step.row + 1}} \\leftrightarrow L_{${step.withRow + 1}}`;
  }

  if (step.type === "scale") {
    const factorLatex =
      step.factor.numerator === -step.factor.denominator
        ? "-"
        : step.factor.toLatex();
    return `L_{${step.row + 1}} \\leftarrow ${factorLatex}L_{${step.row + 1}}`;
  }

  const factor = step.factor;
  const sign = factor.numerator < 0n ? "+" : "-";
  const absolute = factor.abs();
  const scalar = absolute.isOne() ? "" : absolute.toLatex();
  return `L_{${step.row + 1}} \\leftarrow L_{${step.row + 1}} ${sign} ${scalar}L_{${step.withRow + 1}}`;
}

function describeStep(step) {
  return `$$${stepOperationLatex(step)}$$`;
}

function unwrapDisplayMath(rawLatex) {
  return rawLatex.replace(/^\$\$/, "").replace(/\$\$$/, "");
}

function buildGaussExportData(result, view) {
  const render =
    view === "system"
      ? (matrix) => unwrapDisplayMath(systemToLatex(matrix, result.variableNames))
      : (matrix) => unwrapDisplayMath(augmentedMatrixToLatex(matrix, result.variableNames.length));
  const equivalence = view === "system" ? "\\Longleftrightarrow" : "\\leftrightarrow";
  const initial = render(result.initialMatrix);
  const final = render(result.finalMatrix);

  return {
    initial,
    final,
    equivalence,
    rows: result.steps.slice(1).map((step, index) => ({
      left: index === 0 ? initial : "",
      symbol: equivalence,
      right: render(step.matrix),
      operation: stepOperationLatex(step),
    })),
  };
}

function latexMiddleCellMath(symbol, operation) {
  if (!operation) {
    return `\\displaystyle ${symbol}`;
  }

  return (
    "\\begin{array}{c}" +
    `\\displaystyle ${symbol} \\\\[0.15em]` +
    `{\\color{blue}\\tiny \\displaystyle ${operation}}` +
    "\\end{array}"
  );
}

function buildGaussLatexDocument(result, view, title) {
  const exportData = buildGaussExportData(result, view);
  const rows = exportData.rows.map((row) => ({
    left: row.left ? `\\displaystyle ${row.left}` : "",
    middle: latexMiddleCellMath(row.symbol, row.operation),
    right: row.right ? `\\displaystyle ${row.right}` : "",
  }));

  const summaryRow = {
    left: `\\displaystyle ${exportData.initial}`,
    middle: latexMiddleCellMath(exportData.equivalence, ""),
    right: `\\displaystyle ${exportData.final}`,
  };

  const systemArrayRows = [...rows, summaryRow]
    .map((row) => `${row.left} & ${row.middle} & ${row.right}`)
    .join(" \\\\[1.4em]\n");

  const matrixRows = rows
    .map((row) => {
      const leftCell = row.left ? `\\(${row.left}\\)` : "";
      const rightCell = row.right ? `\\(${row.right}\\)` : "";
      return `${leftCell} & \\(${row.middle}\\) & ${rightCell} \\\\[1.35em]`;
    })
    .join("\n");

  const matrixSummaryRow =
    `\\(${summaryRow.left}\\) & \\(${summaryRow.middle}\\) & \\(${summaryRow.right}\\) \\\\`;

  return [
    "\\documentclass[11pt]{article}",
    "\\usepackage[margin=1.8cm]{geometry}",
    "\\usepackage{xcolor}",
    "\\usepackage{amsmath,amssymb,mathtools,array,longtable}",
    "\\usepackage{newtxtext,newtxmath}",
    "\\pagestyle{empty}",
    "\\begin{document}",
    `\\section*{${title}}`,
    view === "system"
      ? [
          "\\scriptsize",
          "\\setlength{\\arraycolsep}{0.45em}",
          "\\renewcommand{\\arraystretch}{1.15}",
          "\\[",
          "\\begin{array}{c@{\\hspace{1.25em}}c@{\\hspace{1.25em}}c}",
          systemArrayRows,
          "\\end{array}",
          "\\]",
        ].join("\n")
      : [
          "\\small",
          "\\setlength{\\LTleft}{\\fill}",
          "\\setlength{\\LTright}{\\fill}",
          "\\setlength{\\tabcolsep}{0.35em}",
          "\\renewcommand{\\arraystretch}{1.2}",
          "\\begin{longtable}{>{\\centering\\arraybackslash}p{0.36\\textwidth} >{\\centering\\arraybackslash}p{0.14\\textwidth} >{\\centering\\arraybackslash}p{0.36\\textwidth}}",
          matrixRows,
          matrixSummaryRow,
          "\\end{longtable}",
        ].join("\n"),
    "\\end{document}",
    "",
  ].join("\n");
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildPdfMiddleHtml(symbol, operation) {
  return `
    <div class="pdf-middle-inner">
      <div class="pdf-symbol">${symbol ? `\\(${symbol}\\)` : ""}</div>
      <div class="pdf-operation">${operation ? `\\(${operation}\\)` : ""}</div>
    </div>
  `;
}

function buildPdfRowsHtml(result, view) {
  const exportData = buildGaussExportData(result, view);

  const stepsHtml = exportData.rows
    .map((row) => `
      <div class="pdf-row">
        <div class="pdf-left">${row.left ? `\\(${row.left}\\)` : ""}</div>
        <div class="pdf-middle">${buildPdfMiddleHtml(row.symbol, row.operation)}</div>
        <div class="pdf-right">${row.right ? `\\(${row.right}\\)` : ""}</div>
      </div>
    `)
    .join("");

  const summaryHtml = `
    <div class="pdf-row pdf-row-summary">
      <div class="pdf-left">\\(${exportData.initial}\\)</div>
      <div class="pdf-middle">${buildPdfMiddleHtml(exportData.equivalence, "")}</div>
      <div class="pdf-right">\\(${exportData.final}\\)</div>
    </div>
  `;

  return {
    initial: exportData.initial,
    rowsHtml: stepsHtml,
    summaryHtml,
  };
}

function openPdfPreview(title, result, view) {
  const popup = window.open("", "_blank");

  if (!popup) {
    return;
  }

  const exportData = buildPdfRowsHtml(result, view);
  const safeTitle = escapeHtml(title);

  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
    <style>
      :root { color-scheme: light; }
      @page {
        size: A4;
        margin: 16mm 12mm;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #0f172a;
        font-family: "STIX Two Text", "Times New Roman", serif;
      }
      .pdf-shell {
        padding: 0;
      }
      h1 {
        margin: 0 0 1rem;
        font-size: 1.1rem;
        font-weight: 700;
      }
      .pdf-table {
        display: grid;
        gap: .7rem;
        justify-items: center;
      }
      .pdf-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 8.25rem minmax(0, 1fr);
        align-items: center;
        gap: 1.2rem;
        width: 100%;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .pdf-row-summary {
        margin-top: .35rem;
      }
      .pdf-left,
      .pdf-right {
        display: flex;
        justify-content: center;
        align-items: center;
        min-width: 0;
        font-size: .66rem;
      }
      .pdf-middle {
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .pdf-middle-inner {
        display: grid;
        justify-items: center;
        gap: .18rem;
        width: 100%;
      }
      .pdf-symbol {
        text-align: center;
        font-size: .74rem;
      }
      .pdf-operation {
        text-align: center;
        color: #2563eb;
        font-size: .56rem;
      }
      mjx-container {
        max-width: 100%;
        overflow: hidden;
      }
      .pdf-left mjx-container,
      .pdf-right mjx-container {
        font-size: .76em !important;
      }
      .pdf-symbol mjx-container {
        font-size: .82em !important;
      }
      .pdf-operation mjx-container {
        font-size: .64em !important;
        color: #2563eb !important;
      }
    </style>
    <script>
      window.MathJax = {
        tex: {
          inlineMath: [["$", "$"], ["\\\\(", "\\\\)"]],
          displayMath: [["$$", "$$"], ["\\\\[", "\\\\]"]],
          processEscapes: true,
          macros: {
            e: ["_{\\\\mathrm{#1}}", 1],
            dd: "\\\\mathop{}\\\\!\\\\mathrm{d}",
            vect: ["\\\\overrightarrow{#1}", 1],
            f: ["\\\\dfrac{#1}{#2}", 2],
          },
        },
        svg: {
          fontCache: "global",
        },
        startup: {
          pageReady: () => {
            return MathJax.startup.defaultPageReady().then(() => {
              setTimeout(() => window.print(), 250);
            });
          }
        }
      };
    </script>
    <script async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
  </head>
  <body>
    <div class="pdf-shell">
      <h1>${safeTitle}</h1>
      <div class="pdf-table">${exportData.rowsHtml}${exportData.summaryHtml}</div>
    </div>
  </body>
</html>`;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
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

  const exportLatex = (view) => {
    if (!result) {
      return;
    }

    const title = `${t.gauss.title} - ${view === "system" ? t.gauss.systemView : t.gauss.matrixView}`;
    downloadTextFile(
      view === "system" ? "gauss-systeme.tex" : "gauss-matrice.tex",
      buildGaussLatexDocument(result, view, title),
    );
  };

  const exportPdf = (view) => {
    if (!result) {
      return;
    }

    const title = `${t.gauss.title} - ${view === "system" ? t.gauss.systemView : t.gauss.matrixView}`;
    openPdfPreview(title, result, view);
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

            <div className="gauss-export-box">
              <div>
                <p className="gauss-export-title">{t.gauss.exportTitle}</p>
                <p className="gauss-export-lead">{t.gauss.exportLead}</p>
              </div>

              <div className="gauss-export-grid">
                <button
                  type="button"
                  onClick={() => exportLatex("system")}
                  className="showcase-action showcase-action-secondary gauss-export-action"
                  disabled={!result}
                >
                  {t.gauss.exportSystemLatex}
                </button>
                <button
                  type="button"
                  onClick={() => exportLatex("matrix")}
                  className="showcase-action showcase-action-secondary gauss-export-action"
                  disabled={!result}
                >
                  {t.gauss.exportMatrixLatex}
                </button>
                <button
                  type="button"
                  onClick={() => exportPdf("system")}
                  className="showcase-action showcase-action-secondary gauss-export-action"
                  disabled={!result}
                >
                  {t.gauss.exportSystemPdf}
                </button>
                <button
                  type="button"
                  onClick={() => exportPdf("matrix")}
                  className="showcase-action showcase-action-secondary gauss-export-action"
                  disabled={!result}
                >
                  {t.gauss.exportMatrixPdf}
                </button>
              </div>
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
                        html={augmentedMatrixToLatex(result.initialMatrix, result.variableNames.length)}
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
                        html={augmentedMatrixToLatex(result.finalMatrix, result.variableNames.length)}
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
                              html={augmentedMatrixToLatex(step.matrix, result.variableNames.length)}
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
