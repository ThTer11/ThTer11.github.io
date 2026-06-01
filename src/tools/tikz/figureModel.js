const WIDTH = 860;
const HEIGHT = 560;
const SCALE = 40;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
const POINT_RADIUS = 4.5;
const GRID_MIN_X = -10;
const GRID_MAX_X = 10;
const GRID_MIN_Y = -6;
const GRID_MAX_Y = 6;

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function round(value, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function fmt(value) {
  const rounded = round(value, 3);
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
}

function toScreen(point) {
  return {
    x: CENTER.x + point.x * SCALE,
    y: CENTER.y - point.y * SCALE,
  };
}

function fromScreen(x, y, snap = true) {
  const raw = {
    x: (x - CENTER.x) / SCALE,
    y: (CENTER.y - y) / SCALE,
  };
  if (!snap) {
    return { x: round(raw.x), y: round(raw.y) };
  }
  return { x: Math.round(raw.x), y: Math.round(raw.y) };
}

function snapPoint(point) {
  return { x: Math.round(point.x), y: Math.round(point.y) };
}

function snapObject(object) {
  if (!object) return object;
  if ("x" in object && "y" in object) return { ...object, ...snapPoint(object) };
  if (object.type === "circle") return { ...object, center: snapPoint(object.center) };
  if (object.type === "ellipse") return { ...object, center: snapPoint(object.center) };
  if (object.type === "rectangle") return { ...object, a: snapPoint(object.a), b: snapPoint(object.b) };
  if ("a" in object && "b" in object) {
    return {
      ...object,
      a: snapPoint(object.a),
      b: snapPoint(object.b),
      vertex: object.vertex ? snapPoint(object.vertex) : object.vertex,
    };
  }
  if ("point" in object) return { ...object, point: snapPoint(object.point) };
  return object;
}

function pointerCoords(event) {
  const svg = event.currentTarget.ownerSVGElement || event.currentTarget;
  const rect = svg.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
  };
}

function normalizeScreenRect(a, b) {
  return {
    minX: Math.min(a.x, b.x),
    maxX: Math.max(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxY: Math.max(a.y, b.y),
  };
}

function screenPointInRect(point, rect) {
  return point.x >= rect.minX && point.x <= rect.maxX && point.y >= rect.minY && point.y <= rect.maxY;
}

function scaleValue(value, unitScale = 1) {
  return value * unitScale;
}

function latexCoord(point, unitScale = 1) {
  return `(${fmt(scaleValue(point.x, unitScale))},${fmt(scaleValue(point.y, unitScale))})`;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function segmentLabelRatio(position = "midway") {
  if (position === "near start") return 0;
  if (position === "near end") return 1;
  const numeric = Number(position);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : 0.5;
}

function segmentLabelPoint(segment) {
  const ratio = segmentLabelRatio(segment.labelPosition);

  return {
    x: segment.a.x + (segment.b.x - segment.a.x) * ratio + (segment.labelXShift || 0),
    y: segment.a.y + (segment.b.y - segment.a.y) * ratio + (segment.labelYShift || 0),
  };
}

function segmentPointAt(segment, position = "midway") {
  const ratio = position === "near start" ? 1 / 3 : position === "near end" ? 2 / 3 : 0.5;
  const control = segmentBendControlPoint(segment);

  if (control) {
    const t = ratio;
    const oneMinusT = 1 - t;
    return {
      x: oneMinusT * oneMinusT * segment.a.x + 2 * oneMinusT * t * control.x + t * t * segment.b.x,
      y: oneMinusT * oneMinusT * segment.a.y + 2 * oneMinusT * t * control.y + t * t * segment.b.y,
    };
  }

  return {
    x: segment.a.x + (segment.b.x - segment.a.x) * ratio,
    y: segment.a.y + (segment.b.y - segment.a.y) * ratio,
  };
}

function segmentLabelTikzOptions(segment, includePosition = true) {
  const options = [segment.labelSide || "above"];
  if (includePosition) {
    options.unshift(segment.labelPosition || "midway");
  }
  if (segment.labelXShift) options.push(`xshift=${fmt(segment.labelXShift)}cm`);
  if (segment.labelYShift) options.push(`yshift=${fmt(segment.labelYShift)}cm`);
  return options.join(", ");
}

function segmentMirrorTicks(segment) {
  const length = distance(segment.a, segment.b);
  if (!segment.mirror || length < 0.2) return [];

  const ux = (segment.b.x - segment.a.x) / length;
  const uy = (segment.b.y - segment.a.y) / length;
  const nx = uy;
  const ny = -ux;
  const spacing = 0.5;
  const along = 0.42;
  const normal = 0.16;
  const count = Math.max(1, Math.floor(length / spacing));

  return Array.from({ length: count }, (_, index) => {
    const t = Math.min(index * spacing, Math.max(0, length - spacing));
    const start = {
      x: segment.a.x + ux * t,
      y: segment.a.y + uy * t,
    };
    const end = {
      x: start.x + ux * along + nx * normal,
      y: start.y + uy * along + ny * normal,
    };
    return { start, end };
  });
}

function pointToSegmentDistance(point, a, b) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const lengthSquared = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * vx + (point.y - a.y) * vy) / lengthSquared));
  const projection = { x: a.x + t * vx, y: a.y + t * vy };
  return { distance: distance(point, projection), projection };
}

function segmentBendControlPoint(segment) {
  if (!segment.bendDirection || segment.bendDirection === "none") return null;
  const mid = midpoint(segment.a, segment.b);
  const length = distance(segment.a, segment.b) || 1;
  const ux = (segment.b.x - segment.a.x) / length;
  const uy = (segment.b.y - segment.a.y) / length;
  const normal =
    segment.bendDirection === "left"
      ? { x: -uy, y: ux }
      : { x: uy, y: -ux };
  const amount = Math.max(5, Math.min(80, Number(segment.bendAngle) || 30));
  const offset = length * (amount / 90) * 0.45;
  return {
    x: mid.x + normal.x * offset,
    y: mid.y + normal.y * offset,
  };
}

function segmentSvgPath(segment) {
  const a = toScreen(segment.a);
  const b = toScreen(segment.b);
  const control = segmentBendControlPoint(segment);
  if (!control) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  const c = toScreen(control);
  return `M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`;
}

function projectPointOnLine(point, a, b) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const lengthSquared = vx * vx + vy * vy || 1;
  const t = ((point.x - a.x) * vx + (point.y - a.y) * vy) / lengthSquared;
  return { x: a.x + t * vx, y: a.y + t * vy };
}

function lineIntersection(first, second) {
  const x1 = first.a.x;
  const y1 = first.a.y;
  const x2 = first.b.x;
  const y2 = first.b.y;
  const x3 = second.a.x;
  const y3 = second.a.y;
  const x4 = second.b.x;
  const y4 = second.b.y;
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denominator) < 1e-9) {
    return null;
  }

  return {
    x: ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denominator,
    y: ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denominator,
  };
}

function anglePointOnSegmentRay(segment, vertex) {
  const da = distance(segment.a, vertex);
  const db = distance(segment.b, vertex);
  const target = da >= db ? segment.a : segment.b;
  const length = distance(target, vertex) || 1;
  return {
    x: vertex.x + (target.x - vertex.x) / length,
    y: vertex.y + (target.y - vertex.y) / length,
  };
}

function rightAngleMarker(point, foot, a, b) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const vLength = Math.hypot(vx, vy) || 1;
  const ux = vx / vLength;
  const uy = vy / vLength;
  const wx = point.x - foot.x;
  const wy = point.y - foot.y;
  const wLength = Math.hypot(wx, wy) || 1;
  const nx = wx / wLength;
  const ny = wy / wLength;
  const size = 0.22;
  return [
    { x: foot.x + ux * size, y: foot.y + uy * size },
    { x: foot.x + ux * size + nx * size, y: foot.y + uy * size + ny * size },
    { x: foot.x + nx * size, y: foot.y + ny * size },
  ];
}

function angleData(a, vertex, b, radius) {
  const start = Math.atan2(a.y - vertex.y, a.x - vertex.x);
  const end = Math.atan2(b.y - vertex.y, b.x - vertex.x);
  let delta = end - start;
  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;
  const startPoint = {
    x: vertex.x + radius * Math.cos(start),
    y: vertex.y + radius * Math.sin(start),
  };
  const endPoint = {
    x: vertex.x + radius * Math.cos(end),
    y: vertex.y + radius * Math.sin(end),
  };
  const midAngle = start + delta / 2;
  const labelPoint = {
    x: vertex.x + (radius + 0.32) * Math.cos(midAngle),
    y: vertex.y + (radius + 0.32) * Math.sin(midAngle),
  };
  return {
    startAngle: (start * 180) / Math.PI,
    endAngle: (end * 180) / Math.PI,
    startPoint,
    endPoint,
    labelPoint,
    largeArc: Math.abs(delta) > Math.PI ? 1 : 0,
    sweep: delta >= 0 ? 0 : 1,
  };
}

function svgAnglePath(a, vertex, b, radius) {
  const data = angleData(a, vertex, b, radius);
  const start = toScreen(data.startPoint);
  const end = toScreen(data.endPoint);
  return `M ${start.x} ${start.y} A ${radius * SCALE} ${radius * SCALE} 0 ${data.largeArc} ${data.sweep} ${end.x} ${end.y}`;
}

function tikzOptions(object, fallback = "thick") {
  const parts = [fallback];
  if (object.arrow) parts.unshift(object.arrow);
  if (object.dashed) parts.push("dashed");
  return parts.join(", ");
}

function segmentDrawCommand(segment, unitScale = 1) {
  const startLabel = segment.label && segment.labelPosition === "near start"
    ? ` node[${segmentLabelTikzOptions(segment, false)}] {${segment.label}}`
    : "";
  const middleLabel = segment.label && segment.labelPosition !== "near start" && segment.labelPosition !== "near end"
    ? ` node[${segmentLabelTikzOptions(segment, true)}] {${segment.label}}`
    : "";
  const endLabel = segment.label && segment.labelPosition === "near end"
    ? ` node[${segmentLabelTikzOptions(segment, false)}] {${segment.label}}`
    : "";
  const markTex = segment.midMark === ">>" ? ">\\!\\!>" : segment.midMark;
  const markNode = segment.midMark
    ? ` node[${segment.midMarkPosition || "midway"}, sloped, allow upside down] {$${markTex}$}`
    : "";
  const bend =
    segment.bendDirection && segment.bendDirection !== "none"
      ? ` to[bend ${segment.bendDirection}=${fmt(segment.bendAngle || 30)}]${middleLabel || markNode} `
      : ` --${markNode}${middleLabel} `;

  return `  \\draw[${tikzOptions(segment)}] ${latexCoord(segment.a, unitScale)}${startLabel}${bend}${latexCoord(segment.b, unitScale)}${endLabel};`;
}

function hatchBounds(shape) {
  if (shape.type === "rectangle") {
    return {
      minX: Math.min(shape.a.x, shape.b.x),
      maxX: Math.max(shape.a.x, shape.b.x),
      minY: Math.min(shape.a.y, shape.b.y),
      maxY: Math.max(shape.a.y, shape.b.y),
    };
  }

  if (shape.type === "circle") {
    return {
      minX: shape.center.x - shape.radius,
      maxX: shape.center.x + shape.radius,
      minY: shape.center.y - shape.radius,
      maxY: shape.center.y + shape.radius,
    };
  }

  return {
    minX: shape.center.x - shape.rx,
    maxX: shape.center.x + shape.rx,
    minY: shape.center.y - shape.ry,
    maxY: shape.center.y + shape.ry,
  };
}

function hatchClipCommand(shape, unitScale = 1) {
  if (shape.type === "rectangle") {
    return `\\clip ${latexCoord(shape.a, unitScale)} rectangle ${latexCoord(shape.b, unitScale)};`;
  }

  if (shape.type === "circle") {
    return `\\clip ${latexCoord(shape.center, unitScale)} circle (${fmt(scaleValue(shape.radius, unitScale))});`;
  }

  return `\\clip ${latexCoord(shape.center, unitScale)} ellipse (${fmt(scaleValue(shape.rx, unitScale))} and ${fmt(scaleValue(shape.ry, unitScale))});`;
}

function hatchScopeLines(shape, spacing = 0.35) {
  const bounds = hatchBounds(shape);
  const margin = 0.8;
  const minX = bounds.minX - margin;
  const maxX = bounds.maxX + margin;
  const minY = bounds.minY - margin;
  const maxY = bounds.maxY + margin;
  const width = maxX - minX;
  const height = maxY - minY;
  const lines = [];

  for (let offset = -height; offset <= width; offset += spacing) {
    lines.push([
      round(minX + offset, 3),
      round(minY, 3),
      round(minX + offset + height, 3),
      round(maxY, 3),
    ]);
  }

  return lines;
}

function hatchTikzLines(shape, unitScale = 1) {
  if (!shape.hatched) return [];
  return [
    "  \\begin{scope}",
    `    ${hatchClipCommand(shape, unitScale)}`,
    ...hatchScopeLines(shape).map(
      ([x1, y1, x2, y2]) => `    \\draw[gray!65, thin] (${fmt(scaleValue(x1, unitScale))},${fmt(scaleValue(y1, unitScale))}) -- (${fmt(scaleValue(x2, unitScale))},${fmt(scaleValue(y2, unitScale))});`
    ),
    "  \\end{scope}",
  ];
}

function mirrorTikzLines(segment, unitScale = 1) {
  const ticks = segmentMirrorTicks(segment);
  if (!segment.mirror || ticks.length === 0) return [];

  const length = distance(segment.a, segment.b) || 1;
  const nx = (segment.b.y - segment.a.y) / length;
  const ny = -(segment.b.x - segment.a.x) / length;
  const width = 0.36;
  const clip = [
    { x: segment.a.x + nx * width, y: segment.a.y + ny * width },
    { x: segment.b.x + nx * width, y: segment.b.y + ny * width },
    { x: segment.b.x - nx * width, y: segment.b.y - ny * width },
    { x: segment.a.x - nx * width, y: segment.a.y - ny * width },
  ];

  return [
    "  \\begin{scope}",
    `    \\clip ${clip.map((point) => latexCoord(point, unitScale)).join(" -- ")} -- cycle;`,
    ...ticks.map(
      (tick) => `    \\draw ${latexCoord(tick.start, unitScale)} -- ${latexCoord(tick.end, unitScale)};`
    ),
    "  \\end{scope}",
  ];
}

function hatchRectangleLines(shape, spacing = 0.35) {
  const minX = Math.min(shape.a.x, shape.b.x);
  const maxX = Math.max(shape.a.x, shape.b.x);
  const minY = Math.min(shape.a.y, shape.b.y);
  const maxY = Math.max(shape.a.y, shape.b.y);
  const width = maxX - minX;
  const height = maxY - minY;
  const lines = [];

  for (let offset = -height; offset <= width; offset += spacing) {
    const x1 = Math.max(minX, minX + offset);
    const y1 = offset < 0 ? minY - offset : minY;
    const x2 = Math.min(maxX, minX + offset + height);
    const y2 = offset + height > width ? minY + width - offset : maxY;

    if (x2 >= minX && x1 <= maxX && y1 >= minY && y2 <= maxY) {
      lines.push([round(x1, 3), round(y1, 3), round(x2, 3), round(y2, 3)]);
    }
  }

  return lines;
}

function hatchCircleLines(shape, spacing = 0.35) {
  const lines = [];
  for (let offset = -shape.radius; offset <= shape.radius; offset += spacing) {
    const half = Math.sqrt(Math.max(0, shape.radius * shape.radius - offset * offset));
    lines.push([
      round(shape.center.x + offset - half / Math.SQRT2, 3),
      round(shape.center.y + offset + half / Math.SQRT2, 3),
      round(shape.center.x + offset + half / Math.SQRT2, 3),
      round(shape.center.y + offset - half / Math.SQRT2, 3),
    ]);
  }
  return lines;
}

function hatchEllipseLines(shape, spacing = 0.35) {
  const lines = [];
  const radius = Math.max(shape.rx, shape.ry);
  for (let offset = -radius; offset <= radius; offset += spacing) {
    const normalized = Math.abs(offset / radius);
    if (normalized > 1) continue;
    const half = Math.sqrt(1 - normalized * normalized);
    lines.push([
      round(shape.center.x + offset * (shape.rx / radius) - half * shape.rx / Math.SQRT2, 3),
      round(shape.center.y + offset * (shape.ry / radius) + half * shape.ry / Math.SQRT2, 3),
      round(shape.center.x + offset * (shape.rx / radius) + half * shape.rx / Math.SQRT2, 3),
      round(shape.center.y + offset * (shape.ry / radius) - half * shape.ry / Math.SQRT2, 3),
    ]);
  }
  return lines;
}

function hatchLines(shape) {
  if (!shape.hatched) return [];
  if (shape.type === "rectangle") return hatchRectangleLines(shape);
  if (shape.type === "circle") return hatchCircleLines(shape);
  return hatchEllipseLines(shape);
}

function makePoint(coords) {
  return {
    id: uid("point"),
    name: "",
    x: coords.x,
    y: coords.y,
    label: "",
    labelDx: 0.35,
    labelDy: 0.35,
    dashed: false,
  };
}

function blankScene() {
  return {
    points: [],
    segments: [],
    perpendiculars: [],
    angles: [],
    shapes: [],
    texts: [],
  };
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildDocument(tikzCode) {
  return [
    "\\documentclass[tikz,border=4pt]{standalone}",
    "\\usepackage{amsmath,amssymb}",
    "\\usetikzlibrary{calc}",
    "\\begin{document}",
    tikzCode,
    "\\end{document}",
    "",
  ].join("\n");
}

function buildPointNameMap(points) {
  const used = new Set();
  return Object.fromEntries(
    points.map((point, index) => {
      const cleaned = point.name.replace(/[^A-Za-z0-9]/g, "");
      const preferred = /^[A-Za-z][A-Za-z0-9]*$/.test(cleaned) ? cleaned : `P${index + 1}`;
      let name = preferred;
      let suffix = 2;
      while (used.has(name)) {
        name = `${preferred}${suffix}`;
        suffix += 1;
      }
      used.add(name);
      return [point.id, name];
    })
  );
}

function buildTikz(scene, showGrid, unitScale = 1) {
  const lines = [];
  lines.push("\\begin{tikzpicture}[scale=1]");
  const names = buildPointNameMap(scene.points);

  if (showGrid) {
    lines.push(`  \\draw[step=${fmt(unitScale)}, gray!25, very thin] (${fmt(-10 * unitScale)},${fmt(-6 * unitScale)}) grid (${fmt(10 * unitScale)},${fmt(6 * unitScale)});`);
    lines.push(`  \\draw[->, gray!60] (${fmt(-10 * unitScale)},0) -- (${fmt(10.3 * unitScale)},0);`);
    lines.push(`  \\draw[->, gray!60] (0,${fmt(-6 * unitScale)}) -- (0,${fmt(6.3 * unitScale)});`);
  }

  scene.points.forEach((point) => {
    lines.push(`  \\coordinate (${names[point.id]}) at ${latexCoord(point, unitScale)};`);
  });

  scene.shapes.forEach((shape) => {
    if (shape.type === "rectangle") {
      lines.push(`  \\draw[${tikzOptions(shape)}] ${latexCoord(shape.a, unitScale)} rectangle ${latexCoord(shape.b, unitScale)};`);
      lines.push(...hatchTikzLines(shape, unitScale));
      return;
    }
    if (shape.type === "circle") {
      lines.push(`  \\draw[${tikzOptions(shape)}] ${latexCoord(shape.center, unitScale)} circle (${fmt(scaleValue(shape.radius, unitScale))});`);
      lines.push(...hatchTikzLines(shape, unitScale));
      return;
    }
    lines.push(`  \\draw[${tikzOptions(shape)}] ${latexCoord(shape.center, unitScale)} ellipse (${fmt(scaleValue(shape.rx, unitScale))} and ${fmt(scaleValue(shape.ry, unitScale))});`);
    lines.push(...hatchTikzLines(shape, unitScale));
  });

  scene.segments.forEach((segment) => {
    lines.push(segmentDrawCommand(segment, unitScale));
    lines.push(...mirrorTikzLines(segment, unitScale));
  });

  scene.perpendiculars.forEach((perpendicular) => {
    const segment = scene.segments.find((item) => item.id === perpendicular.segmentId);
    if (!segment) return;
    const foot = projectPointOnLine(perpendicular.point, segment.a, segment.b);
    const marker = rightAngleMarker(perpendicular.point, foot, segment.a, segment.b);
    lines.push(`  \\draw[${tikzOptions(perpendicular, "dashed")}] ${latexCoord(perpendicular.point, unitScale)} -- ${latexCoord(foot, unitScale)};`);
    lines.push(`  \\draw ${latexCoord(marker[0], unitScale)} -- ${latexCoord(marker[1], unitScale)} -- ${latexCoord(marker[2], unitScale)};`);
  });

  scene.angles.forEach((angle) => {
    const data = angleData(angle.a, angle.vertex, angle.b, angle.radius);
    lines.push(`  \\draw[${tikzOptions(angle)}] ${latexCoord(angle.vertex, unitScale)} ++(${fmt(data.startAngle)}:${fmt(scaleValue(angle.radius, unitScale))}) arc[start angle=${fmt(data.startAngle)}, end angle=${fmt(data.endAngle)}, radius=${fmt(scaleValue(angle.radius, unitScale))}];`);
    if (angle.label) {
      lines.push(`  \\node at ${latexCoord(data.labelPoint, unitScale)} {${angle.label}};`);
    }
  });

  scene.points.forEach((point) => {
    lines.push(`  \\fill[black] (${names[point.id]}) circle (1.6pt);`);
    if (point.label) {
      lines.push(`  \\node at ($(${names[point.id]})+(${fmt(scaleValue(point.labelDx, unitScale))},${fmt(scaleValue(point.labelDy, unitScale))})$) {${point.label}};`);
    }
  });

  scene.texts.forEach((text) => {
    lines.push(`  \\node at ${latexCoord(text, unitScale)} {${text.text || "\\ "}};`);
  });

  lines.push("\\end{tikzpicture}");
  return lines.join("\n");
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

function parseTikzOptions(raw = "") {
  const options = raw.split(",").map((item) => item.trim()).filter(Boolean);
  const bend = options.find((option) => /^bend\s+(left|right)(?:\s*=\s*[-+]?\d*\.?\d+)?$/.test(option));
  const bendMatch = bend?.match(/^bend\s+(left|right)(?:\s*=\s*([-+]?\d*\.?\d+))?$/);
  return {
    dashed: options.includes("dashed"),
    arrow: options.find((option) => ["->", "<-", "<->"].includes(option)) || "",
    bendDirection: bendMatch?.[1] || "none",
    bendAngle: bendMatch?.[2] ? Number(bendMatch[2]) : 30,
  };
}

function normalizeTikzCode(code) {
  return code
    .replace(/%.*$/gm, "")
    .replace(/\\dd\s+/g, "\\dd ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCoordinateTokens(value) {
  const tokens = [];
  let depth = 0;
  let start = -1;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "(") {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        tokens.push(value.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return tokens;
}

function splitTopLevelComma(value) {
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "{" || char === "(") depth += 1;
    if (char === "}" || char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      return [value.slice(0, index), value.slice(index + 1)];
    }
  }
  return null;
}

function evaluateTikzNumber(raw) {
  const expression = raw
    .trim()
    .replace(/[{}]/g, "")
    .replace(/\b(cos|sin|tan)\s*\(/g, (_, fn) => `${fn}Deg(`);

  if (!/^[-+*/().\d\sA-Za-z_]+$/.test(expression)) return Number.NaN;

  try {
    const cosDeg = (value) => Math.cos((Number(value) * Math.PI) / 180);
    const sinDeg = (value) => Math.sin((Number(value) * Math.PI) / 180);
    const tanDeg = (value) => Math.tan((Number(value) * Math.PI) / 180);
    const value = Function("cosDeg", "sinDeg", "tanDeg", `"use strict"; return (${expression});`)(cosDeg, sinDeg, tanDeg);
    return Number.isFinite(value) ? round(value, 3) : Number.NaN;
  } catch (error) {
    return Number.NaN;
  }
}

function parseCoord(raw) {
  if (!raw) return null;
  const inner = raw.trim().replace(/^\(/, "").replace(/\)$/, "");
  const parts = splitTopLevelComma(inner);
  if (!parts) return null;
  const x = evaluateTikzNumber(parts[0]);
  const y = evaluateTikzNumber(parts[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function splitTikzCommands(code) {
  return normalizeTikzCode(code)
    .replace(/\\begin\{tikzpicture\}(?:\[[^\]]*\])?/g, "")
    .replace(/\\end\{tikzpicture\}/g, "")
    .replace(/\\begin\{scope\}/g, "")
    .replace(/\\end\{scope\}/g, "")
    .split(";")
    .map((command) => command.trim())
    .filter(Boolean);
}

function tikzRadius(raw) {
  const value = evaluateTikzNumber(raw.replace(/pt|cm/g, ""));
  return Number.isFinite(value) ? value : null;
}

function parsePolarOffset(raw) {
  const match = raw.match(/\+\+\(\s*([-+]?\d*\.?\d+)\s*:\s*([-+]?\d*\.?\d+)(?:cm)?\s*\)/);
  if (!match) return null;
  const angle = Number(match[1]);
  const radius = Number(match[2]);
  return {
    angle,
    radius,
    x: round(radius * Math.cos((angle * Math.PI) / 180), 3),
    y: round(radius * Math.sin((angle * Math.PI) / 180), 3),
  };
}

function findShapeForClip(scene, clipShape) {
  return scene.shapes.find((shape) => {
    if (shape.type !== clipShape.type) return false;
    if (shape.type === "rectangle") {
      return distance(shape.a, clipShape.a) < 0.02 && distance(shape.b, clipShape.b) < 0.02;
    }
    if (shape.type === "circle") {
      return distance(shape.center, clipShape.center) < 0.02 && Math.abs(shape.radius - clipShape.radius) < 0.02;
    }
    return distance(shape.center, clipShape.center) < 0.02 && Math.abs(shape.rx - clipShape.rx) < 0.02 && Math.abs(shape.ry - clipShape.ry) < 0.02;
  });
}

function pushShape(scene, shape) {
  const exists = findShapeForClip(scene, shape);
  if (exists && Boolean(exists.dashed) === Boolean(shape.dashed)) return exists;
  scene.shapes.push(shape);
  return shape;
}

function pushText(scene, text) {
  const exists = scene.texts.some(
    (item) => distance(item, text) < 0.02 && item.text.trim() === text.text.trim()
  );
  if (!exists) {
    scene.texts.push(text);
  }
}

function extractTikzNodes(body) {
  const nodes = [];
  let index = 0;

  while (index < body.length) {
    const nodeIndex = body.indexOf("node", index);
    if (nodeIndex < 0) break;
    let cursor = nodeIndex + 4;
    while (/\s/.test(body[cursor] || "")) cursor += 1;

    let options = "";
    if (body[cursor] === "[") {
      let depth = 1;
      const start = cursor + 1;
      cursor += 1;
      while (cursor < body.length && depth > 0) {
        if (body[cursor] === "[") depth += 1;
        if (body[cursor] === "]") depth -= 1;
        cursor += 1;
      }
      options = body.slice(start, cursor - 1);
      while (/\s/.test(body[cursor] || "")) cursor += 1;
    }

    if (body[cursor] !== "{") {
      index = cursor + 1;
      continue;
    }

    let depth = 1;
    const contentStart = cursor + 1;
    cursor += 1;
    while (cursor < body.length && depth > 0) {
      if (body[cursor] === "{") depth += 1;
      if (body[cursor] === "}") depth -= 1;
      cursor += 1;
    }

    nodes.push({
      index: nodeIndex,
      raw: body.slice(nodeIndex, cursor),
      options: options.split(",").map((item) => item.trim()).filter(Boolean),
      content: body.slice(contentStart, cursor - 1).trim(),
    });
    index = cursor;
  }

  return nodes;
}

function parseSegmentDecoration(body) {
  const nodes = extractTikzNodes(body);
  const labelNode = nodes.find((node) => !node.options.includes("sloped") && !node.options.includes("allow upside down"));
  const markNode = nodes.find((node) => node.options.includes("sloped") || node.options.includes("allow upside down"));
  if (!labelNode && !markNode) return {};

  const options = labelNode?.options || [];
  const explicitPosition = options.find((item) => ["midway", "near start", "near end"].includes(item));
  const labelSide = options.find((item) => ["above", "below", "left", "right"].includes(item)) || "above";
  const xShift = options.find((item) => item.startsWith("xshift="))?.match(/=([-+]?\d*\.?\d+)/)?.[1];
  const yShift = options.find((item) => item.startsWith("yshift="))?.match(/=([-+]?\d*\.?\d+)/)?.[1];
  let inferredPosition = "near end";

  if (labelNode && !explicitPosition) {
    const coordMatches = [...body.matchAll(/\([^()]*,[^()]*\)/g)];
    const lastCoord = coordMatches[coordMatches.length - 1];
    const connectorIndex = body.search(/\s(?:--|to)\s/);

    if (lastCoord && labelNode.index > lastCoord.index + lastCoord[0].length) {
      inferredPosition = "near end";
    } else if (connectorIndex >= 0 && labelNode.index < connectorIndex) {
      inferredPosition = "near end";
    }
  }

  const markContent = markNode?.content.replace(/^\$/, "").replace(/\$$/, "").replace(/\\!+/g, "");

  return {
    label: labelNode?.content || "",
    labelPosition: explicitPosition || inferredPosition,
    labelSide,
    labelXShift: xShift ? Number(xShift) : 0,
    labelYShift: yShift ? Number(yShift) : 0,
    midMark: markContent === ">" || markContent === ">>" ? markContent : "",
    midMarkPosition: markNode?.options.find((item) => ["midway", "near start", "near end"].includes(item)) || "midway",
  };
}

function sceneBounds(scene) {
  const coords = [
    ...scene.points.map((point) => ({ x: point.x, y: point.y })),
    ...scene.texts.map((text) => ({ x: text.x, y: text.y })),
    ...scene.segments.flatMap((segment) => [segment.a, segment.b]),
    ...scene.shapes.flatMap((shape) => {
      if (shape.type === "rectangle") return [shape.a, shape.b];
      if (shape.type === "circle") {
        return [
          { x: shape.center.x - shape.radius, y: shape.center.y - shape.radius },
          { x: shape.center.x + shape.radius, y: shape.center.y + shape.radius },
        ];
      }
      return [
        { x: shape.center.x - shape.rx, y: shape.center.y - shape.ry },
        { x: shape.center.x + shape.rx, y: shape.center.y + shape.ry },
      ];
    }),
  ].filter(Boolean);

  if (coords.length === 0) return null;
  return coords.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );
}

function parseImportedTikz(code) {
  const scene = blankScene();
  const namedCoords = {};
  const normalizedCode = normalizeTikzCode(code);
  const commands = splitTikzCommands(code);

  let ignoringMirrorTicks = false;

  commands.forEach((command) => {
    const coordinate = command.match(/^\\coordinate\s*\(([A-Za-z][A-Za-z0-9]*)\)\s*at\s*(.+)$/);
    if (coordinate) {
      const coord = parseCoord(extractCoordinateTokens(coordinate[2])[0]);
      if (!coord) return;
      const point = makePoint(coord);
      point.name = coordinate[1];
      namedCoords[coordinate[1]] = { x: point.x, y: point.y, id: point.id };
      scene.points.push(point);
    }
  });

  commands.forEach((command) => {
    const pointLabel = command.match(/^\\node\s+at\s+\(\$\(([A-Za-z][A-Za-z0-9]*)\)\+\(([-+]?\d*\.?\d+),([-+]?\d*\.?\d+)\)\$\)\s*\{([\s\S]*)\}$/);
    if (pointLabel && namedCoords[pointLabel[1]]) {
      const point = scene.points.find((item) => item.id === namedCoords[pointLabel[1]].id);
      if (point) {
        point.labelDx = Number(pointLabel[2]);
        point.labelDy = Number(pointLabel[3]);
        point.label = pointLabel[4];
      }
      return;
    }

    const fillNamed = command.match(/^\\fill(?:\[[^\]]*\])?\s+\(([A-Za-z][A-Za-z0-9]*)\)\s+circle\s*\(([^)]+)\)(?:\s+node(?:\[([^\]]*)\])?\s*\{([\s\S]*)\})?$/);
    if (fillNamed) return;

    const fillPoint = command.match(/^\\fill(?:\[[^\]]*\])?\s+(.+?)\s+circle\s*\(([^)]+)\)(?:\s+node(?:\[([^\]]*)\])?\s*\{([\s\S]*)\})?$/);
    if (fillPoint) {
      const coord = parseCoord(extractCoordinateTokens(fillPoint[1])[0]);
      if (!coord) return;
      const point = makePoint(coord);
      point.label = fillPoint[4]?.trim() || "";
      if (fillPoint[3]?.includes("below")) {
        point.labelDx = 0;
        point.labelDy = -0.42;
      }
      scene.points.push(point);
      return;
    }

    const text = command.match(/^\\node(?:\[([^\]]*)\])?\s+at\s+(.+?)\s*\{([\s\S]*)\}$/);
    if (text) {
      const point = parseCoord(extractCoordinateTokens(text[2])[0]);
      if (!point) return;
      pushText(scene, { id: uid("text"), ...point, text: text[3] });
      return;
    }

    const clip = command.match(/^\\clip\s+([\s\S]+)$/);
    if (clip) {
      const clipBody = clip[1];
      const coords = extractCoordinateTokens(clipBody);
      let clipShape = null;
      if (clipBody.includes(" rectangle ") && coords.length >= 2) {
        const a = parseCoord(coords[0]);
        const b = parseCoord(coords[1]);
        clipShape = a && b ? { type: "rectangle", a, b } : null;
      } else if (clipBody.includes(" ellipse ") && coords.length >= 1) {
        const radii = clipBody.match(/ellipse\s*\(\s*\{?([-+]?\d*\.?\d+)\}?\s+and\s+\{?([-+]?\d*\.?\d+)\}?\s*\)/);
        const center = parseCoord(coords[0]);
        clipShape = radii && center ? { type: "ellipse", center, rx: Number(radii[1]), ry: Number(radii[2]) } : null;
      } else if (clipBody.includes(" circle ") && coords.length >= 1) {
        const radius = clipBody.match(/circle\s*\(([^)]+)\)/);
        const center = parseCoord(coords[0]);
        clipShape = radius && center ? { type: "circle", center, radius: tikzRadius(radius[1]) } : null;
      }
      if (clipShape) {
        const shape = findShapeForClip(scene, clipShape);
        if (shape) shape.hatched = true;
      } else if (scene.segments.length > 0) {
        scene.segments[scene.segments.length - 1].mirror = true;
        ignoringMirrorTicks = true;
      }
      return;
    }

    const draw = command.match(/^\\draw(?:\[([^\]]*)\])?\s+([\s\S]+)$/);
    if (!draw) return;

    const style = parseTikzOptions(draw[1] || "");
    const body = draw[2];
    const coords = extractCoordinateTokens(body);

    if (body.includes(" rectangle ") && coords.length >= 2) {
      const a = parseCoord(coords[0]);
      const b = parseCoord(coords[1]);
      if (!a || !b) return;
      pushShape(scene, { id: uid("shape"), type: "rectangle", a, b, dashed: style.dashed, hatched: false });
      const label = parseSegmentDecoration(body);
      if (label.label) {
        pushText(scene, { id: uid("text"), ...midpoint(a, b), text: label.label });
      }
      return;
    }

    const circle = body.match(/circle\s*\(([^)]+)\)/);
    if (circle && coords.length >= 1) {
      const center = parseCoord(coords[0]);
      if (!center) return;
      pushShape(scene, { id: uid("shape"), type: "circle", center, radius: tikzRadius(circle[1]) || 0.1, dashed: style.dashed, hatched: false });
      return;
    }

    const ellipse = body.match(/ellipse\s*\(\s*\{?([-+]?\d*\.?\d+)\}?\s+and\s+\{?([-+]?\d*\.?\d+)\}?\s*\)/);
    if (ellipse && coords.length >= 1) {
      const center = parseCoord(coords[0]);
      if (!center) return;
      pushShape(scene, { id: uid("shape"), type: "ellipse", center, rx: Number(ellipse[1]), ry: Number(ellipse[2]), dashed: style.dashed, hatched: false });
      return;
    }

    const arc = body.match(/arc\s*\[\s*start angle\s*=\s*([-+]?\d*\.?\d+)\s*,\s*end angle\s*=\s*([-+]?\d*\.?\d+)\s*,\s*x\s+radius\s*=\s*\{?([-+]?\d*\.?\d+)\}?\s*,\s*y\s+radius\s*=\s*\{?([-+]?\d*\.?\d+)\}?/);
    if (arc && coords.length >= 1) {
      const start = parseCoord(coords[0]);
      if (!start) return;
      const startAngle = Number(arc[1]);
      const endAngle = Number(arc[2]);
      const rx = Number(arc[3]);
      const ry = Number(arc[4]);
      const center = {
        x: round(start.x - rx * Math.cos((startAngle * Math.PI) / 180), 3),
        y: round(start.y - ry * Math.sin((startAngle * Math.PI) / 180), 3),
      };
      if (Math.abs(rx - ry) < 0.02) {
        scene.angles.push({
          id: uid("angle"),
          a: {
            x: round(center.x + rx * Math.cos((startAngle * Math.PI) / 180), 3),
            y: round(center.y + rx * Math.sin((startAngle * Math.PI) / 180), 3),
          },
          vertex: center,
          b: {
            x: round(center.x + rx * Math.cos((endAngle * Math.PI) / 180), 3),
            y: round(center.y + rx * Math.sin((endAngle * Math.PI) / 180), 3),
          },
          radius: rx,
          label: "",
          dashed: style.dashed,
        });
        return;
      }
      pushShape(scene, { id: uid("shape"), type: "ellipse", center, rx, ry, dashed: style.dashed, hatched: false });
      return;
    }

    const circularArc = body.match(/arc\s*\[\s*start angle\s*=\s*([-+]?\d*\.?\d+)\s*,\s*end angle\s*=\s*([-+]?\d*\.?\d+)\s*,\s*radius\s*=\s*([-+]?\d*\.?\d+)(?:cm)?/);
    if (circularArc && coords.length >= 1) {
      const base = parseCoord(coords[0]);
      const polar = parsePolarOffset(body);
      if (!base) return;
      const startAngle = Number(circularArc[1]);
      const endAngle = Number(circularArc[2]);
      const radius = Number(circularArc[3]);
      const start = polar
        ? { x: round(base.x + polar.x, 3), y: round(base.y + polar.y, 3) }
        : base;
      const center = {
        x: round(start.x - radius * Math.cos((startAngle * Math.PI) / 180), 3),
        y: round(start.y - radius * Math.sin((startAngle * Math.PI) / 180), 3),
      };
      scene.angles.push({
        id: uid("angle"),
        a: start,
        vertex: center,
        b: {
          x: round(center.x + radius * Math.cos((endAngle * Math.PI) / 180), 3),
          y: round(center.y + radius * Math.sin((endAngle * Math.PI) / 180), 3),
        },
        radius,
        label: "",
        dashed: style.dashed,
      });
      return;
    }

    if ((body.includes("--") || body.includes(" to ")) && coords.length >= 2) {
      const label = parseSegmentDecoration(body);
      const a = parseCoord(coords[0]);
      const b = parseCoord(coords[1]);
      if (!a || !b) return;
      if (ignoringMirrorTicks && distance(a, b) < 0.9) {
        return;
      }
      ignoringMirrorTicks = false;
      scene.segments.push({
        id: uid("segment"),
        a,
        b,
        dashed: style.dashed,
        arrow: style.arrow,
        bendDirection: style.bendDirection,
        bendAngle: style.bendAngle,
        mirror: false,
        midMark: label.midMark || "",
        midMarkPosition: label.midMarkPosition || "midway",
        label: label.label || "",
        labelPosition: label.labelPosition || "midway",
        labelSide: label.labelSide || "above",
        labelXShift: label.labelXShift || 0,
        labelYShift: label.labelYShift || 0,
      });
    }
  });

  const rectanglePattern = /\\draw(?:\[([^\]]*)\])?\s+(\([^;{}]*?,[^;{}]*?\))\s+rectangle\s+(\([^;{}]*?,[^;{}]*?\))(?:\s+node(?:\[([^\]]*)\])?\s*\{([\s\S]*?)\})?\s*;/g;
  for (const match of normalizedCode.matchAll(rectanglePattern)) {
    const style = parseTikzOptions(match[1] || "");
    const a = parseCoord(match[2]);
    const b = parseCoord(match[3]);
    if (!a || !b) continue;
    pushShape(scene, { id: uid("shape"), type: "rectangle", a, b, dashed: style.dashed, hatched: false });
    if (match[5]) {
      pushText(scene, { id: uid("text"), ...midpoint(a, b), text: match[5].trim() });
    }
  }

  const nodePattern = /\\node(?:\[([^\]]*)\])?\s+at\s+(\([^;{}]*?,[^;{}]*?\))\s*\{([\s\S]*?)\}\s*;/g;
  for (const match of normalizedCode.matchAll(nodePattern)) {
    const point = parseCoord(match[2]);
    if (!point) continue;
    pushText(scene, { id: uid("text"), ...point, text: match[3].trim() });
  }

  const bounds = sceneBounds(scene);
  const width = bounds ? bounds.maxX - bounds.minX : 1;
  const height = bounds ? bounds.maxY - bounds.minY : 1;
  const suggestedUnitScale = Math.max(0.1, round(Math.max(width / (GRID_MAX_X - GRID_MIN_X), height / (GRID_MAX_Y - GRID_MIN_Y), 1), 1));

  return { scene, unitScale: suggestedUnitScale };
}


export {
  WIDTH,
  HEIGHT,
  SCALE,
  CENTER,
  POINT_RADIUS,
  GRID_MIN_X,
  GRID_MAX_X,
  GRID_MIN_Y,
  GRID_MAX_Y,
  uid,
  round,
  fmt,
  toScreen,
  fromScreen,
  snapPoint,
  snapObject,
  pointerCoords,
  normalizeScreenRect,
  screenPointInRect,
  distance,
  midpoint,
  segmentLabelPoint,
  segmentPointAt,
  segmentMirrorTicks,
  segmentSvgPath,
  pointToSegmentDistance,
  projectPointOnLine,
  lineIntersection,
  anglePointOnSegmentRay,
  rightAngleMarker,
  angleData,
  svgAnglePath,
  makePoint,
  blankScene,
  escapeHtml,
  buildDocument,
  buildTikz,
  downloadTextFile,
  parseImportedTikz,
};
