import { augmentedMatrixToLatex, systemToLatex } from "./gauss";

const unwrapMath = text => text.replace(/^\$\$/, "").replace(/\$\$$/, "");
const variableLatex = name => name.replace(/^([a-zA-Z]+)(\d+)$/, "$1_{$2}");
const escapeHtml = text => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const escapeLatex = text => String(text).replace(/[\\{}$&#%_~^]/g, char => ({
  "\\": "\\textbackslash{}", "{": "\\{", "}": "\\}", "$": "\\$", "&": "\\&",
  "#": "\\#", "%": "\\%", "_": "\\_", "~": "\\textasciitilde{}", "^": "\\textasciicircum{}",
}[char]));

export function gaussOperationLatex(step) {
  if (step.type === "swap") return `L_{${step.row + 1}}\\leftrightarrow L_{${step.withRow + 1}}`;
  if (step.type === "scale") {
    const factor = step.factor.equals(-1) ? "-" : step.factor.toLatex();
    return `L_{${step.row + 1}}\\leftarrow ${factor}L_{${step.row + 1}}`;
  }
  const scalar = step.factor.abs();
  return `L_{${step.row + 1}}\\leftarrow L_{${step.row + 1}}${step.factor.numerator < 0n ? "+" : "-"}${scalar.isOne() ? "" : scalar.toLatex()}L_{${step.withRow + 1}}`;
}

function realTuple(names) {
  return names.length === 1 ? `${names[0]}\\in\\mathbb{R}`
    : `\\left(${names.join(",\\,")}\\right)\\in\\mathbb{R}^{${names.length}}`;
}

export function buildGaussExportData(result, view) {
  const render = matrix => unwrapMath(view === "system"
    ? systemToLatex(matrix, result.variableNames)
    : augmentedMatrixToLatex(matrix, result.variableNames.length));
  const wide = result.variableNames.length > 4 || result.steps.some(step =>
    step.matrix.some(row => row.some(value => value.toString().replace(/\D/g, "").length > 12)));
  return {
    unknowns: view === "system" ? realTuple(result.variableNames.map(variableLatex)) : "",
    initial: render(result.initialMatrix),
    final: render(result.finalMatrix),
    steps: result.steps.slice(1).map(step => ({ operation: gaussOperationLatex(step), expression: render(step.matrix) })),
    relation: view === "system" ? "\\Longleftrightarrow" : "\\leftrightarrow",
    wide,
  };
}

function chainRows(data) {
  const rows = data.steps.length ? data.steps.map((step, index) => ({
    left: index === 0 ? data.initial : "", right: step.expression, operation: step.operation, equivalence: true,
  })) : [{ left: "", right: data.initial, operation: "", equivalence: false }];
  if (data.steps.length > 2) rows.push({ left: data.initial, right: data.final, operation: "", equivalence: true });
  return rows;
}

export function buildGaussLatexDocument(result, view, { labels, lang = "fr" }) {
  const data = buildGaussExportData(result, view);
  const rows = chainRows(data).map(row => [
    row.left ? `\\centering\\gaussfit{${row.left}}` : "",
    row.equivalence ? `\\centering\\(\\displaystyle ${row.operation ? `\\overset{\\gaussop{${row.operation}}}{${data.relation}}` : data.relation}\\)` : "",
    `\\centering\\arraybackslash\\gaussfit{${row.right}}`,
  ].join(" & "));
  return [
    "\\documentclass[11pt,a4paper]{article}",
    "\\usepackage[T1]{fontenc}",
    "\\usepackage[utf8]{inputenc}",
    `\\usepackage[${data.wide ? "landscape," : ""}margin=18mm]{geometry}`,
    "\\usepackage{amsmath,amssymb,graphicx,xcolor,array,longtable}",
    "\\usepackage{newtxtext,newtxmath}",
    "\\definecolor{gaussaccent}{HTML}{255CA8}",
    "\\definecolor{gaussmuted}{HTML}{617184}",
    "\\setlength{\\parindent}{0pt}",
    "\\pagestyle{empty}",
    "\\setlength{\\arraycolsep}{3.5pt}",
    "\\renewcommand{\\arraystretch}{1.12}",
    "\\newsavebox{\\gaussbox}",
    "\\newcommand{\\gaussfit}[1]{%",
    "  \\sbox{\\gaussbox}{$\\displaystyle #1$}%",
    "  \\ifdim\\wd\\gaussbox>\\linewidth",
    "    \\resizebox{\\linewidth}{!}{\\usebox{\\gaussbox}}%",
    "  \\else\\usebox{\\gaussbox}\\fi}",
    "\\newcommand{\\gaussop}[1]{%",
    "  \\sbox{\\gaussbox}{$\\scriptstyle\\color{gaussaccent}#1$}%",
    "  \\ifdim\\wd\\gaussbox>.98\\linewidth",
    "    \\resizebox{.98\\linewidth}{!}{\\usebox{\\gaussbox}}%",
    "  \\else\\usebox{\\gaussbox}\\fi}",
    "\\begin{document}",
    `% ${lang === "en" ? "Successive equivalences; page breaks only between rows." : "Équivalences successives ; coupures de page entre les lignes uniquement."}`,
    ...(data.unknowns ? [`${escapeLatex(labels.let)} \\(${data.unknowns}\\).`] : []),
    "\\setlength{\\LTleft}{0pt}",
    "\\setlength{\\LTright}{0pt}",
    "\\begin{longtable}{@{}m{.40\\textwidth}@{\\hspace{.02\\textwidth}}m{.16\\textwidth}@{\\hspace{.02\\textwidth}}m{.40\\textwidth}@{}}",
    rows.join(" \\\\\n\\noalign{\\vskip1.25em}\n"),
    "\\end{longtable}",
    "\\end{document}",
    "",
  ].join("\n");
}

export function buildGaussPdfHtml(result, view, { title, labels, lang = "fr", autoPrint = true }) {
  const data = buildGaussExportData(result, view);
  const math = latex => `\\[${escapeHtml(latex)}\\]`;
  const subtitle = view === "system" ? labels.systemSubtitle : labels.matrixSubtitle;
  const rows = chainRows(data).map(row => `
    <div class="export-chain-row${row.equivalence ? "" : " export-chain-single"}">
      <div class="export-math export-chain-left">${row.left ? math(row.left) : ""}</div>
      <div class="export-transition">${row.equivalence ? math(row.operation ? `\\overset{\\scriptstyle ${row.operation}}{${data.relation}}` : data.relation) : ""}</div>
      <div class="export-math export-chain-right">${math(row.right)}</div>
    </div>`).join("");
  const failed = JSON.stringify(labels.loadError).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="${lang === "en" ? "en" : "fr"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)} — ${escapeHtml(subtitle)}</title>
  <style>
    :root{color-scheme:light;--accent:#255ca8;--muted:#617184}
    @page{size:A4 ${data.wide ? "landscape" : "portrait"};margin:18mm}
    *{box-sizing:border-box}
    body{margin:0;background:#edf2f7;color:#172b3b;font-family:"STIX Two Text","Times New Roman",serif;font-size:11pt;line-height:1.5}
    .export-toolbar{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:12px;padding:16px;font:14px system-ui,sans-serif}
    .export-toolbar button{min-height:44px;padding:10px 18px;border:0;border-radius:9px;background:var(--accent);color:#fff;font:inherit;font-weight:650;cursor:pointer}
    .export-toolbar button:disabled{opacity:.5;cursor:wait}
    .export-toolbar button:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}
    .export-sheet{width:calc(${data.wide ? "261" : "174"}mm + 48px);max-width:calc(100% - 24px);margin:0 auto 28px;padding:24px;background:#fff;box-shadow:0 5px 24px #172b3b12}
    .export-intro{margin:0 0 24px;font-size:11pt}
    .export-chain-row{display:grid;grid-template-columns:minmax(0,40fr) minmax(0,16fr) minmax(0,40fr);column-gap:2%;align-items:center;padding:12px 0;margin-bottom:18px;break-inside:avoid;page-break-inside:avoid}
    .export-math,.export-transition{min-width:0;max-width:100%;text-align:center}
    .export-transition{color:var(--accent)}
    .export-chain-single{display:block}
    .export-chain-single .export-chain-left,.export-chain-single .export-transition{display:none}
    mjx-container[jax="SVG"]{color:inherit}
    mjx-container[display="true"]{margin:0!important;text-align:center!important}
    mjx-container[jax="SVG"]>svg{max-width:none}
    @media print{body{background:#fff}.export-toolbar{display:none}.export-sheet{width:auto;max-width:none;margin:0;padding:0;box-shadow:none}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  </style>
  <script>
    function fitExportMath(forPrint){
      document.querySelectorAll('.export-math,.export-transition').forEach(function(block){
        var math=block.querySelector('mjx-container'),svg=math&&math.querySelector('svg');
        if(!svg)return;
        math.style.fontSize='100%';
        var width=svg.getBoundingClientRect().width;
        var fraction=block.closest('.export-chain-single')?1:(block.classList.contains('export-transition')?.16:.4);
        var available=(forPrint===true?${(data.wide ? 261 : 174) * 96 / 25.4}*fraction:block.clientWidth)-4;
        if(width>available)math.style.fontSize=(100*available/width)+'%';
      });
    }
    window.addEventListener('beforeprint',function(){fitExportMath(true);});
    window.addEventListener('resize',function(){fitExportMath(false);});
    window.MathJax={tex:{inlineMath:[['\\\\(','\\\\)']],displayMath:[['\\\\[','\\\\]']],processEscapes:true},svg:{fontCache:'local'},startup:{pageReady:function(){
      return MathJax.startup.defaultPageReady().then(function(){return document.fonts.ready;}).then(function(){
        fitExportMath();
        window.gaussExportReady=true;
        document.getElementById('export-print').disabled=false;
        document.getElementById('export-status').textContent='';
        ${autoPrint ? "setTimeout(function(){window.print();},300);" : ""}
      });
    }}};
  </script>
  <script async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js" onerror="document.getElementById('export-status').textContent=${escapeHtml(failed)}"></script>
</head>
<body>
  <div class="export-toolbar"><button id="export-print" type="button" disabled onclick="window.print()">${escapeHtml(labels.print)}</button><span id="export-status" role="status">${escapeHtml(labels.preparing)}</span></div>
  <main class="export-sheet">
    ${data.unknowns ? `<p class="export-intro">${escapeHtml(labels.let)} \\(${escapeHtml(data.unknowns)}\\).</p>` : ""}
    <div class="export-chain">${rows}</div>
  </main>
</body>
</html>`;
}
