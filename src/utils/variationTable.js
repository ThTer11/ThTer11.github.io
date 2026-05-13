const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const POSITION_RANK = {
  low: 0,
  middle: 1,
  high: 2,
};

export const VARIATION_ROW_TYPES = ["variation", "sign", "custom"];
export const VARIATION_BARRIERS = ["none", "bar", "zero", "double"];
export const VARIATION_POSITIONS = ["high", "middle", "low"];
export const VARIATION_ARROW_MODES = ["auto", "up", "down", "flat", "none", "discontinuity"];
export const VARIATION_EXAMPLES = ["simple", "minimum", "forbidden", "manyZeros", "asymptote", "custom"];

export function createVariationColumn(value = "") {
  return {
    id: uid("variation-column"),
    value,
    barrier: "none",
    barrierText: "",
  };
}

function createPointCell() {
  return {
    value: "",
    position: "middle",
    leftValue: "",
    rightValue: "",
    barrier: "none",
    barrierText: "",
  };
}

function createIntervalCell() {
  return {
    value: "",
    arrow: "auto",
  };
}

export function createVariationRow(columnCount, type = "variation", label = "") {
  return {
    id: uid("variation-row"),
    type,
    label,
    height: type === "variation" ? 8.2 : 5.2,
    points: Array.from({ length: columnCount }, createPointCell),
    intervals: Array.from({ length: Math.max(0, columnCount - 1) }, createIntervalCell),
  };
}

export function createExampleVariationTable() {
  return createVariationTableExample("simple");
}

export function createBlankVariationTable() {
  const columns = [createVariationColumn(""), createVariationColumn("")];
  return {
    variableLabel: "$x$",
    style: "classic",
    labelColumnWidth: 11,
    intervalWidth: 9.5,
    columns,
    rows: [createVariationRow(columns.length, "variation", "")],
  };
}

export function createVariationTableExample(example = "simple") {
  if (example === "minimum") {
    const table = {
      variableLabel: "$x$",
      style: "classic",
      columns: [createVariationColumn("$-\\infty$"), createVariationColumn("$1$"), createVariationColumn("$+\\infty$")],
      rows: [],
    };
    table.rows = [
      {
        ...createVariationRow(table.columns.length, "sign", "$f'$"),
        points: [{ ...createPointCell() }, { ...createPointCell(), value: "$0$" }, { ...createPointCell() }],
        intervals: [{ ...createIntervalCell(), value: "$-$" }, { ...createIntervalCell(), value: "$+$" }],
      },
      {
        ...createVariationRow(table.columns.length, "variation", "$f$"),
        points: [
          { ...createPointCell(), value: "$+\\infty$", position: "high" },
          { ...createPointCell(), value: "$m$", position: "low" },
          { ...createPointCell(), value: "$+\\infty$", position: "high" },
        ],
      },
    ];
    return table;
  }

  if (example === "forbidden" || example === "asymptote") {
    const forbidden = createVariationColumn("$0$");
    forbidden.barrier = "double";
    const table = {
      variableLabel: "$x$",
      style: "classic",
      columns: [createVariationColumn("$-\\infty$"), forbidden, createVariationColumn("$+\\infty$")],
      rows: [],
    };
    table.rows = [
      {
        ...createVariationRow(table.columns.length, "variation", "$f$"),
        points: [
          { ...createPointCell(), value: "$0$", position: "middle" },
          { ...createPointCell(), leftValue: "$-\\infty$", rightValue: "$+\\infty$", position: "middle" },
          { ...createPointCell(), value: "$0$", position: "middle" },
        ],
        intervals: [{ ...createIntervalCell(), arrow: "down" }, { ...createIntervalCell(), arrow: "down" }],
      },
    ];
    return table;
  }

  if (example === "manyZeros") {
    const table = {
      variableLabel: "$x$",
      style: "classic",
      columns: [createVariationColumn("$-\\infty$"), createVariationColumn("$-2$"), createVariationColumn("$0$"), createVariationColumn("$3$"), createVariationColumn("$+\\infty$")],
      rows: [],
    };
    table.rows = [
      {
        ...createVariationRow(table.columns.length, "sign", "$f'$"),
        points: [
          { ...createPointCell() },
          { ...createPointCell(), value: "$0$" },
          { ...createPointCell(), value: "$0$" },
          { ...createPointCell(), value: "$0$" },
          { ...createPointCell() },
        ],
        intervals: [
          { ...createIntervalCell(), value: "$+$" },
          { ...createIntervalCell(), value: "$-$" },
          { ...createIntervalCell(), value: "$+$" },
          { ...createIntervalCell(), value: "$-$" },
        ],
      },
    ];
    return table;
  }

  if (example === "custom") {
    const table = createVariationTableExample("simple");
    table.rows.push({
      ...createVariationRow(table.columns.length, "custom", "convexité"),
      intervals: [{ ...createIntervalCell(), value: "convexe" }, { ...createIntervalCell(), value: "concave" }],
    });
    return table;
  }

  const table = {
    variableLabel: "$x$",
    style: "classic",
    columns: [
      createVariationColumn("$-\\infty$"),
      createVariationColumn("$-1$"),
      createVariationColumn("$1$"),
      createVariationColumn("$+\\infty$"),
    ],
    rows: [],
  };

  table.rows = [
    {
      ...createVariationRow(table.columns.length, "sign", "$f'$"),
      points: [
        { ...createPointCell(), value: "", position: "middle" },
        { ...createPointCell(), value: "$0$", position: "middle" },
        { ...createPointCell(), value: "$0$", position: "middle" },
        { ...createPointCell(), value: "", position: "middle" },
      ],
      intervals: [
        { ...createIntervalCell(), value: "$+$" },
        { ...createIntervalCell(), value: "$-$" },
        { ...createIntervalCell(), value: "$+$" },
      ],
    },
    {
      ...createVariationRow(table.columns.length, "variation", "$f$"),
      points: [
        { ...createPointCell(), value: "$-\\infty$", position: "low" },
        { ...createPointCell(), value: "$3$", position: "high" },
        { ...createPointCell(), value: "$-1$", position: "low" },
        { ...createPointCell(), value: "$+\\infty$", position: "high" },
      ],
      intervals: [
        { ...createIntervalCell(), arrow: "auto" },
        { ...createIntervalCell(), arrow: "auto" },
        { ...createIntervalCell(), arrow: "auto" },
      ],
    },
  ];

  return table;
}

export function syncVariationTable(table) {
  const fallback = table && typeof table === "object" ? table : createExampleVariationTable();
  const columns = (fallback.columns || fallback.values || []).map((column, index) => {
    if (typeof column === "string") {
      return {
        id: uid("variation-column"),
        value: column,
        barrier: fallback.separators?.[index] || "none",
        barrierText: "",
      };
    }
    return {
      id: column.id || uid("variation-column"),
      value: column.value || "",
      barrier: column.barrier || "none",
      barrierText: column.barrierText || "",
    };
  });

  return {
    variableLabel: fallback.variableLabel ?? "$x$",
    style: fallback.style || "classic",
    labelColumnWidth: Math.max(11, Number(fallback.labelColumnWidth) || 11),
    intervalWidth: Math.max(9.5, Number(fallback.intervalWidth) || 9.5),
    columns,
    rows: (fallback.rows || []).map((row) => ({
      id: row.id || uid("variation-row"),
      type: row.type || "variation",
      label: row.label || "",
      height: Math.max(row.type === "variation" ? 8.2 : 5.2, Number(row.height) || (row.type === "variation" ? 8.2 : 5.2)),
      points: Array.from({ length: columns.length }, (_, index) => ({
        ...createPointCell(),
        ...(row.points?.[index] || (row.cells?.[index * 2] ? { value: row.cells[index * 2].text || "", position: "middle" } : {})),
      })),
      intervals: Array.from({ length: Math.max(0, columns.length - 1) }, (_, index) => ({
        ...createIntervalCell(),
        ...(row.intervals?.[index] || (row.cells?.[index * 2 + 1] ? { value: row.cells[index * 2 + 1].text || "", arrow: row.cells[index * 2 + 1].arrow || "auto" } : {})),
      })),
    })),
  };
}

export function addVariationColumn(table, afterIndex = table.columns.length - 1) {
  const current = syncVariationTable(table);
  const insertAt = Math.max(0, Math.min(current.columns.length, afterIndex + 1));
  return syncVariationTable({
    ...current,
    columns: [
      ...current.columns.slice(0, insertAt),
      createVariationColumn(""),
      ...current.columns.slice(insertAt),
    ],
    rows: current.rows.map((row) => ({
      ...row,
      points: [
        ...row.points.slice(0, insertAt),
        createPointCell(),
        ...row.points.slice(insertAt),
      ],
      intervals: [
        ...row.intervals.slice(0, Math.max(0, insertAt - 1)),
        createIntervalCell(),
        ...(insertAt > 0 && insertAt < current.columns.length ? [createIntervalCell()] : []),
        ...row.intervals.slice(Math.max(0, insertAt)),
      ].slice(0, current.columns.length),
    })),
  });
}

export function removeVariationColumn(table, index) {
  const current = syncVariationTable(table);
  if (current.columns.length <= 1) return current;
  return syncVariationTable({
    ...current,
    columns: current.columns.filter((_, itemIndex) => itemIndex !== index),
    rows: current.rows.map((row) => ({
      ...row,
      points: row.points.filter((_, itemIndex) => itemIndex !== index),
      intervals: row.intervals.filter((_, itemIndex) => itemIndex !== Math.max(0, index - 1)).slice(0, current.columns.length - 2),
    })),
  });
}

export function moveVariationRow(table, rowId, direction) {
  const current = syncVariationTable(table);
  const index = current.rows.findIndex((row) => row.id === rowId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= current.rows.length) return current;
  const rows = [...current.rows];
  [rows[index], rows[target]] = [rows[target], rows[index]];
  return { ...current, rows };
}

export function getVariationArrow(row, intervalIndex) {
  const interval = row.intervals[intervalIndex];
  if (interval?.arrow === "none" || interval?.arrow === "discontinuity") return interval.arrow;
  if (!interval || interval.arrow !== "auto") return interval?.arrow || "flat";
  const left = row.points[intervalIndex]?.position || "middle";
  const right = row.points[intervalIndex + 1]?.position || "middle";
  if (POSITION_RANK[right] > POSITION_RANK[left]) return "up";
  if (POSITION_RANK[right] < POSITION_RANK[left]) return "down";
  return "flat";
}

export function variationArrowEndpointLevels(row, intervalIndex) {
  const interval = row.intervals[intervalIndex];
  const mode = interval?.arrow || "auto";
  const left = row.points[intervalIndex]?.position || "middle";
  const right = row.points[intervalIndex + 1]?.position || "middle";
  if (mode === "up") return { left: "low", right: "high" };
  if (mode === "down") return { left: "high", right: "low" };
  if (mode === "flat") return { left: "middle", right: "middle" };
  return { left, right };
}

export function latexOrSpace(value) {
  return (value || "").trim() || "\\ ";
}

const formatNumber = (value) => {
  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
};

function boundedNode(x, y, text, width, options = "") {
  const parts = [
    `text width=${formatNumber(width)}cm`,
    "align=center",
    "inner sep=1pt",
    options,
  ].filter(Boolean);
  return `  \\node[${parts.join(", ")}] at (${formatNumber(x)},${formatNumber(y)}) {${latexOrSpace(text)}};`;
}

function barrierLines(column, x, yTop, yBottom) {
  if (!column || column.barrier === "none") return [];
  if (column.barrier === "double") {
    return [
      `  \\draw[black] (${formatNumber(x - 0.04)},${formatNumber(yTop)}) -- (${formatNumber(x - 0.04)},${formatNumber(yBottom)});`,
      `  \\draw[black] (${formatNumber(x + 0.04)},${formatNumber(yTop)}) -- (${formatNumber(x + 0.04)},${formatNumber(yBottom)});`,
    ];
  }
  const lines = [`  \\draw[black] (${formatNumber(x)},${formatNumber(yTop)}) -- (${formatNumber(x)},${formatNumber(yBottom)});`];
  const text = column.barrier === "zero" ? (column.barrierText || "$0$") : column.barrierText;
  if (text) lines.push(boundedNode(x, (yTop + yBottom) / 2, text, 0.42, "fill=white"));
  return lines;
}

function rowLabel(row) {
  return latexOrSpace(row.label);
}

export function generateVariationTableTikz(table) {
  const clean = syncVariationTable(table);
  const labelWidth = 1.75;
  const intervalWidth = 1.8;
  const endPadding = 0.55;
  const headerHeight = 0.78;
  const rowHeights = clean.rows.map((row) => (row.type === "variation" ? 1.55 : 0.85));
  const graphWidth = Math.max(1, clean.columns.length - 1) * intervalWidth + endPadding * 2;
  const totalWidth = labelWidth + graphWidth;
  const totalHeight = headerHeight + rowHeights.reduce((sum, height) => sum + height, 0);
  const pointX = (index) => labelWidth + endPadding + index * intervalWidth;
  const intervalCenterX = (index) => labelWidth + endPadding + (index + 0.5) * intervalWidth;

  const lines = ["\\begin{tikzpicture}[x=1cm, y=1cm]"];
  lines.push(`  \\draw[black] (0,0) rectangle (${formatNumber(totalWidth)},${formatNumber(-totalHeight)});`);
  lines.push(`  \\draw[black] (${formatNumber(labelWidth)},0) -- (${formatNumber(labelWidth)},${formatNumber(-totalHeight)});`);
  lines.push(`  \\draw[black] (0,${formatNumber(-headerHeight)}) -- (${formatNumber(totalWidth)},${formatNumber(-headerHeight)});`);

  let yCursor = -headerHeight;
  clean.rows.forEach((_, index) => {
    yCursor -= rowHeights[index];
    const y = yCursor;
    lines.push(`  \\draw[black] (0,${formatNumber(y)}) -- (${formatNumber(totalWidth)},${formatNumber(y)});`);
  });

  lines.push(boundedNode(labelWidth / 2, -headerHeight / 2, clean.variableLabel, labelWidth - 0.12));
  clean.columns.forEach((column, index) => {
    const x = pointX(index);
    lines.push(boundedNode(x, -headerHeight / 2, column.value, intervalWidth - 0.3));
  });

  yCursor = -headerHeight;
  clean.rows.forEach((row, rowIndex) => {
    const top = yCursor;
    const rowHeight = rowHeights[rowIndex];
    const bottom = top - rowHeight;
    const middle = (top + bottom) / 2;
    yCursor = bottom;
    const yForPosition = (position) => {
      if (position === "high") return top - 0.24;
      if (position === "low") return bottom + 0.24;
      return middle;
    };

    lines.push(boundedNode(labelWidth / 2, middle, rowLabel(row), labelWidth - 0.12));
    row.points.forEach((point, pointIndex) => {
      lines.push(...barrierLines(point, pointX(pointIndex), top, bottom));
    });

    if (row.type === "variation") {
      row.points.forEach((point, pointIndex) => {
        const x = pointX(pointIndex);
        const y = yForPosition(point.position);
        if (point.value) lines.push(boundedNode(x, y, point.value, intervalWidth - 0.55));
        if (point.barrier === "double") {
          if (point.leftValue) lines.push(boundedNode(x - 0.28, y, point.leftValue, intervalWidth / 2 - 0.25, "anchor=east"));
          if (point.rightValue) lines.push(boundedNode(x + 0.28, y, point.rightValue, intervalWidth / 2 - 0.25, "anchor=west"));
        }
      });

      row.intervals.forEach((interval, intervalIndex) => {
        if (interval.arrow === "none" || interval.arrow === "discontinuity") return;
        const levels = variationArrowEndpointLevels(row, intervalIndex);
        const leftDouble = row.points[intervalIndex]?.barrier === "double";
        const rightDouble = row.points[intervalIndex + 1]?.barrier === "double";
        const x1 = pointX(intervalIndex) + (leftDouble ? 0.34 : 0.42);
        const x2 = pointX(intervalIndex + 1) - (rightDouble ? 0.34 : 0.42);
        const y1Base = yForPosition(levels.left);
        const y2Base = yForPosition(levels.right);
        const ySign = Math.sign(y2Base - y1Base);
        const y1 = y1Base + ySign * 0.12;
        const y2 = y2Base - ySign * 0.12;
        lines.push(`  \\draw[black, ->, shorten >=2pt, shorten <=2pt] (${formatNumber(x1)},${formatNumber(y1)}) -- (${formatNumber(x2)},${formatNumber(y2)});`);
      });
      return;
    }

    row.points.forEach((point, pointIndex) => {
      const x = pointX(pointIndex);
      if (point.value) lines.push(boundedNode(x, middle, point.value, intervalWidth - 0.55));
    });
    row.intervals.forEach((interval, intervalIndex) => {
      const x = intervalCenterX(intervalIndex);
      if (interval.value) lines.push(boundedNode(x, middle, interval.value, intervalWidth - 0.4));
    });
  });

  lines.push("\\end{tikzpicture}");
  return lines.join("\n");
}

export const buildVariationTikz = generateVariationTableTikz;
