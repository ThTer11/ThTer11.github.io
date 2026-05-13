import { useEffect, useMemo, useState } from "react";
import NavBar from "../components/NavBar";
import { useLang } from "../App";
import RichContent from "../components/RichContent";
import {
  VARIATION_ARROW_MODES,
  VARIATION_BARRIERS,
  VARIATION_POSITIONS,
  VARIATION_ROW_TYPES,
  addVariationColumn,
  buildVariationTikz,
  createExampleVariationTable,
  createBlankVariationTable,
  createVariationRow,
  getVariationArrow,
  moveVariationRow,
  removeVariationColumn,
  syncVariationTable,
  variationArrowEndpointLevels,
} from "../utils/variationTable";
import {
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  CursorArrowRaysIcon,
  EyeIcon,
  EyeSlashIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import "../showcase.css";
import "../tikz-editor.css";

const WIDTH = 860;
const HEIGHT = 560;
const SCALE = 40;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
const POINT_RADIUS = 4.5;
const GRID_MIN_X = -10;
const GRID_MAX_X = 10;
const GRID_MIN_Y = -6;
const GRID_MAX_Y = 6;

function GeometryIcon({ className, children }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function PointToolIcon({ className }) {
  return (
    <GeometryIcon className={className}>
      <path d="M4 12h16" opacity=".35" />
      <path d="M12 4v16" opacity=".35" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </GeometryIcon>
  );
}

function SegmentToolIcon({ className }) {
  return (
    <GeometryIcon className={className}>
      <path d="M5 17 19 7" />
      <circle cx="5" cy="17" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="19" cy="7" r="1.7" fill="currentColor" stroke="none" />
    </GeometryIcon>
  );
}

function PerpendicularToolIcon({ className }) {
  return (
    <GeometryIcon className={className}>
      <path d="M5 18h14" />
      <path d="M12 18V6" />
      <path d="M12 14h4v4" />
    </GeometryIcon>
  );
}

function AngleToolIcon({ className }) {
  return (
    <GeometryIcon className={className}>
      <path d="M5 18 18 6" />
      <path d="M5 18h15" />
      <path d="M10 18a5 5 0 0 1 1.45-3.52" />
    </GeometryIcon>
  );
}

function CircleToolIcon({ className }) {
  return (
    <GeometryIcon className={className}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </GeometryIcon>
  );
}

function EllipseToolIcon({ className }) {
  return (
    <GeometryIcon className={className}>
      <ellipse cx="12" cy="12" rx="8" ry="4.8" />
      <path d="M4 12h16" opacity=".35" />
    </GeometryIcon>
  );
}

function RectangleToolIcon({ className }) {
  return (
    <GeometryIcon className={className}>
      <rect x="5" y="7" width="14" height="10" rx="1" />
    </GeometryIcon>
  );
}

function TextToolIcon({ className }) {
  return (
    <GeometryIcon className={className}>
      <path d="M5 7h14" />
      <path d="M12 7v11" />
      <path d="M9 18h6" />
    </GeometryIcon>
  );
}

function GridSnapIcon({ className }) {
  return (
    <GeometryIcon className={className}>
      <path d="M4 4h16v16H4z" />
      <path d="M9.33 4v16M14.67 4v16M4 9.33h16M4 14.67h16" opacity=".55" />
      <circle cx="14.67" cy="9.33" r="2.1" fill="currentColor" stroke="none" />
    </GeometryIcon>
  );
}

const TOOLS = [
  { id: "select", icon: CursorArrowRaysIcon },
  { id: "point", icon: PointToolIcon },
  { id: "segment", icon: SegmentToolIcon },
  { id: "perpendicular", icon: PerpendicularToolIcon },
  { id: "angle", icon: AngleToolIcon },
  { id: "circle", icon: CircleToolIcon },
  { id: "ellipse", icon: EllipseToolIcon },
  { id: "rectangle", icon: RectangleToolIcon },
  { id: "text", icon: TextToolIcon },
];

const ARROW_OPTIONS = [
  { value: "", label: "$-$" },
  { value: "->", label: "$\\rightarrow$" },
  { value: "<-", label: "$\\leftarrow$" },
  { value: "<->", label: "$\\leftrightarrow$" },
];

const SEGMENT_MARK_OPTIONS = [
  { value: "", label: "$-$" },
  { value: ">", label: "$>$" },
  { value: ">>", label: "$>\\!>$" },
];

const SEGMENT_MARK_POSITIONS = [
  { value: "near start", key: "start" },
  { value: "midway", key: "middle" },
  { value: "near end", key: "end" },
];

const SEGMENT_LABEL_POSITIONS = ["midway", "near start", "near end"];

const SEGMENT_LABEL_SIDES = ["above", "below", "left", "right"];

const POSITION_PRESETS = [
  { label: "↖", dx: -0.38, dy: 0.38 },
  { label: "↑", dx: 0, dy: 0.42 },
  { label: "↗", dx: 0.38, dy: 0.38 },
  { label: "←", dx: -0.42, dy: 0 },
  { label: "•", dx: 0, dy: 0 },
  { label: "→", dx: 0.42, dy: 0 },
  { label: "↙", dx: -0.38, dy: -0.38 },
  { label: "↓", dx: 0, dy: -0.42 },
  { label: "↘", dx: 0.38, dy: -0.38 },
];

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

export default function TikzEditor() {
  const { t } = useLang();
  const tt = t.tikz || {};
  const copyText = t.teaching?.copy || "Copier";
  const copiedText = t.teaching?.copied || "Copié";
  const [scene, setScene] = useState(blankScene);
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);
  const [tool, setTool] = useState("select");
  const [showGrid, setShowGrid] = useState(false);
  const [snap, setSnap] = useState(true);
  const [unitScale, setUnitScale] = useState(1);
  const [pending, setPending] = useState([]);
  const [angleChoices, setAngleChoices] = useState([]);
  const [selection, setSelection] = useState(null);
  const [selectionGroup, setSelectionGroup] = useState([]);
  const [drag, setDrag] = useState(null);
  const [selectionBox, setSelectionBox] = useState(null);
  const [segmentArrow, setSegmentArrow] = useState("");
  const [suppressClick, setSuppressClick] = useState(false);
  const [copied, setCopied] = useState(false);
  const [includeDocument, setIncludeDocument] = useState(false);
  const [importCode, setImportCode] = useState("");
  const [tikzMode, setTikzMode] = useState("figure");
  const variationToolsEnabled = false;
  const [variationTable, setVariationTable] = useState(() => {
    try {
      const saved = window.localStorage.getItem("tikz-variation-table");
      return saved ? syncVariationTable(JSON.parse(saved)) : createExampleVariationTable();
    } catch (error) {
      return createExampleVariationTable();
    }
  });
  const [status, setStatus] = useState(tt.statusStart || "Cliquer sur la grille. Les points s'alignent sur les intersections.");

  const bodyCode = useMemo(
    () => (variationToolsEnabled && tikzMode === "variation" ? buildVariationTikz(variationTable) : buildTikz(scene, showGrid, unitScale)),
    [scene, showGrid, tikzMode, unitScale, variationTable, variationToolsEnabled]
  );
  const tikzCode = includeDocument ? buildDocument(bodyCode) : bodyCode;
  const canUndo = historyPast.length > 0;
  const canRedo = historyFuture.length > 0;
  const variationColumnCount = variationTable.columns.length * 2 - 1;

  useEffect(() => {
    try {
      window.localStorage.setItem("tikz-variation-table", JSON.stringify(variationTable));
    } catch (error) {
      // Local persistence is optional.
    }
  }, [variationTable]);

  const selectedObject = useMemo(() => {
    if (!selection || selectionGroup.length > 0) return null;
    const list = scene[`${selection.type}s`];
    return list?.find((object) => object.id === selection.id) || null;
  }, [scene, selection, selectionGroup]);

  const commitScene = (updater) => {
    setScene((current) => {
      const next = updater(current);
      if (next === current) return current;
      setHistoryPast((past) => [...past.slice(-49), current]);
      setHistoryFuture([]);
      return next;
    });
  };

  const undo = () => {
    setHistoryPast((past) => {
      if (past.length === 0) return past;
      const previous = past[past.length - 1];
      setHistoryFuture((future) => [scene, ...future].slice(0, 50));
      setScene(previous);
      setSelection(null);
      setSelectionGroup([]);
      setPending([]);
      setAngleChoices([]);
      setStatus(tt.statusUndo || "Annulation.");
      return past.slice(0, -1);
    });
  };

  const redo = () => {
    setHistoryFuture((future) => {
      if (future.length === 0) return future;
      const next = future[0];
      setHistoryPast((past) => [...past.slice(-49), scene]);
      setScene(next);
      setSelection(null);
      setSelectionGroup([]);
      setPending([]);
      setAngleChoices([]);
      setStatus(tt.statusRedo || "Rétablissement.");
      return future.slice(1);
    });
  };

  const isSelected = (type, id) => {
    if (selectionGroup.length > 0) {
      return selectionGroup.some((item) => item.type === type && item.id === id);
    }
    return selection?.type === type && selection.id === id;
  };

  const snapToSegmentIfClose = (coords, screenCoords) => {
    let best = null;
    scene.segments.forEach((segment) => {
      const a = toScreen(segment.a);
      const b = toScreen(segment.b);
      const candidate = pointToSegmentDistance(screenCoords, a, b);
      if (candidate.distance < 12 && (!best || candidate.distance < best.distance)) {
        best = candidate;
      }
    });
    if (!best) return coords;
    const projected = fromScreen(best.projection.x, best.projection.y, false);
    return snap ? snapPoint(projected) : projected;
  };

  const objectSelectionPoint = (type, object) => {
    if (type === "point" || type === "text") return toScreen(object);
    if (type === "segment") return toScreen(midpoint(object.a, object.b));
    if (type === "shape") {
      if (object.type === "rectangle") return toScreen(midpoint(object.a, object.b));
      return toScreen(object.center);
    }
    if (type === "angle") return toScreen(object.vertex);
    if (type === "perpendicular") return toScreen(object.point);
    return null;
  };

  const collectObjectsInRect = (rect) => {
    const groups = [
      ["point", scene.points],
      ["segment", scene.segments],
      ["shape", scene.shapes],
      ["text", scene.texts],
      ["angle", scene.angles],
      ["perpendicular", scene.perpendiculars],
    ];

    return groups.flatMap(([type, objects]) =>
      objects
        .filter((object) => {
          const point = objectSelectionPoint(type, object);
          return point && screenPointInRect(point, rect);
        })
        .map((object) => ({ type, id: object.id }))
    );
  };

  const selectObject = (type, id) => {
    setSelection({ type, id });
    setSelectionGroup([]);
    setStatus(type === "point" ? tt.statusPointSelected : type === "text" ? tt.statusTextSelected : tt.statusSelected);
  };

  const updateObject = (type, id, patch) => {
    commitScene((current) => ({
      ...current,
      [`${type}s`]: current[`${type}s`].map((object) => (object.id === id ? { ...object, ...patch } : object)),
    }));
  };

  const updateSelected = (patch) => {
    if (!selection) return;
    updateObject(selection.type, selection.id, patch);
  };

  const updateSelectedStyle = (dashed) => {
    if (!selection || selection.type === "text") return;
    updateSelected({ dashed });
  };

  const deleteSelected = () => {
    const targets = selectionGroup.length > 0 ? selectionGroup : selection ? [selection] : [];
    if (targets.length === 0) return;
    const byType = targets.reduce((acc, item) => {
      acc[item.type] = acc[item.type] || new Set();
      acc[item.type].add(item.id);
      return acc;
    }, {});

    commitScene((current) => ({
      ...current,
      points: current.points.filter((object) => !byType.point?.has(object.id)),
      segments: current.segments.filter((object) => !byType.segment?.has(object.id)),
      shapes: current.shapes.filter((object) => !byType.shape?.has(object.id)),
      texts: current.texts.filter((object) => !byType.text?.has(object.id)),
      angles: current.angles.filter((object) => !byType.angle?.has(object.id)),
      perpendiculars: current.perpendiculars.filter(
        (object) => !byType.perpendicular?.has(object.id) && !byType.segment?.has(object.segmentId)
      ),
    }));
    setSelection(null);
    setSelectionGroup([]);
    setStatus(targets.length > 1 ? tt.statusDeletedMany : tt.statusDeleted);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      const isEditingField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      if (isEditingField) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if ((selection || selectionGroup.length > 0) && (event.key === "Delete" || event.key === "Backspace")) {
        event.preventDefault();
        deleteSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selection, selectionGroup, scene, historyPast, historyFuture]);

  const addSegment = (a, b) => {
    const segment = {
      id: uid("segment"),
      a,
      b,
      dashed: false,
      arrow: segmentArrow,
      bendDirection: "none",
      bendAngle: 30,
      mirror: false,
      midMark: "",
      midMarkPosition: "midway",
      label: "",
      labelPosition: "midway",
      labelSide: "above",
      labelXShift: 0,
      labelYShift: 0,
    };
    commitScene((current) => ({ ...current, segments: [...current.segments, segment] }));
    setSelection({ type: "segment", id: segment.id });
    setStatus(tt.statusSegmentAdded);
  };

  const addShape = (type, a, b) => {
    const shape =
      type === "rectangle"
        ? { id: uid("shape"), type, a, b, dashed: false, hatched: false }
        : type === "circle"
          ? { id: uid("shape"), type, center: a, radius: Math.max(0.1, distance(a, b)), dashed: false, hatched: false }
          : {
              id: uid("shape"),
              type,
              center: midpoint(a, b),
              rx: Math.max(0.1, Math.abs(b.x - a.x) / 2),
              ry: Math.max(0.1, Math.abs(b.y - a.y) / 2),
              dashed: false,
              hatched: false,
            };
    commitScene((current) => ({ ...current, shapes: [...current.shapes, shape] }));
    setSelection({ type: "shape", id: shape.id });
    setStatus(type === "circle" ? tt.statusCircleAdded : type === "ellipse" ? tt.statusEllipseAdded : tt.statusRectangleAdded);
  };

  const addAngle = (points) => {
    const angle = { id: uid("angle"), a: points[0], vertex: points[1], b: points[2], radius: 0.6, label: "$\\theta$", dashed: false };
    commitScene((current) => ({ ...current, angles: [...current.angles, angle] }));
    setSelection({ type: "angle", id: angle.id });
    setAngleChoices([]);
    setStatus(tt.statusAngleAdded);
  };

  const showAngleChoicesFromSegments = (firstSegmentId, secondSegmentId) => {
    const first = scene.segments.find((segment) => segment.id === firstSegmentId);
    const second = scene.segments.find((segment) => segment.id === secondSegmentId);

    if (!first || !second) {
      return;
    }

    const vertex = lineIntersection(first, second);
    if (!vertex) {
      setStatus(tt.statusParallel);
      return;
    }

    const cleanVertex = { x: round(vertex.x), y: round(vertex.y) };
    const firstRays = [
      anglePointOnSegmentRay({ a: cleanVertex, b: first.a }, cleanVertex),
      anglePointOnSegmentRay({ a: cleanVertex, b: first.b }, cleanVertex),
    ];
    const secondRays = [
      anglePointOnSegmentRay({ a: cleanVertex, b: second.a }, cleanVertex),
      anglePointOnSegmentRay({ a: cleanVertex, b: second.b }, cleanVertex),
    ];
    const choices = firstRays.flatMap((firstRay, firstIndex) =>
      secondRays.map((secondRay, secondIndex) => ({
        id: `angle-choice-${firstIndex}-${secondIndex}`,
        a: firstRay,
        vertex: cleanVertex,
        b: secondRay,
        radius: 0.75,
      }))
    );

    setAngleChoices(choices);
    setStatus(tt.statusChooseAngle);
  };

  const addPerpendicular = (point, segmentId) => {
    const perpendicular = { id: uid("perpendicular"), point, segmentId, dashed: true };
    commitScene((current) => ({ ...current, perpendiculars: [...current.perpendiculars, perpendicular] }));
    setSelection({ type: "perpendicular", id: perpendicular.id });
    setStatus(tt.statusPerpendicularAdded);
  };

  const handleCoordinateInput = (coords) => {
    if (tool === "select") {
      setSelection(null);
      setSelectionGroup([]);
      setAngleChoices([]);
      setStatus(tt.statusNoSelection);
      return;
    }

    if (tool === "point") {
      const point = makePoint(coords);
      commitScene((current) => ({ ...current, points: [...current.points, point] }));
      setSelection({ type: "point", id: point.id });
      setStatus(tt.statusPointAdded);
      return;
    }

    if (tool === "text") {
      const text = { id: uid("text"), x: coords.x, y: coords.y, text: "$\\theta$" };
      commitScene((current) => ({ ...current, texts: [...current.texts, text] }));
      setSelection({ type: "text", id: text.id });
      setStatus(tt.statusTextAdded);
      return;
    }

    if (tool === "perpendicular") {
      if (pending.length === 0) {
        setPending([coords]);
        setStatus(tt.statusSegmentSupport);
        return;
      }
      setStatus(tt.statusSegmentDirect);
      return;
    }

    const nextPending = [...pending, coords];
    if (tool === "angle") {
      setAngleChoices([]);
      if (pending.some((item) => item.segmentId)) {
        setPending([coords]);
        setStatus(tt.statusAngleByPoints);
        return;
      }

      if (nextPending.length < 3) {
        setPending(nextPending);
        setStatus(nextPending.length === 1 ? tt.statusAngleVertex : tt.statusAngleSecondSide);
        return;
      }
      addAngle(nextPending);
      setPending([]);
      return;
    }

    if (nextPending.length < 2) {
      setPending(nextPending);
      setStatus(tt.statusSecondPoint);
      return;
    }

    if (tool === "segment") addSegment(nextPending[0], nextPending[1]);
    if (["circle", "ellipse", "rectangle"].includes(tool)) addShape(tool, nextPending[0], nextPending[1]);
    setPending([]);
  };

  const handleCanvasClick = (event) => {
    if (suppressClick) {
      setSuppressClick(false);
      return;
    }
    const screenCoords = pointerCoords(event);
    const coords = snapToSegmentIfClose(fromScreen(screenCoords.x, screenCoords.y, snap), screenCoords);
    handleCoordinateInput(coords);
  };

  const handleCanvasPointerDown = (event) => {
    if (tool !== "select" || event.target !== event.currentTarget.querySelector(".tikz-canvas-bg")) {
      return;
    }
    const start = pointerCoords(event);
    setSelection(null);
    setSelectionGroup([]);
    setSelectionBox({ start, current: start, moved: false });
  };

  const startDrag = (event, type, id) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const screen = pointerCoords(event);
    if (selectionGroup.some((item) => item.type === type && item.id === id)) {
      setDrag({ type: "group", start: fromScreen(screen.x, screen.y, false), moved: false, originalScene: scene });
      return;
    }
    selectObject(type, id);
    setDrag({ type, id, start: fromScreen(screen.x, screen.y, false), moved: false, originalScene: scene });
  };

  const startSegmentLabelDrag = (event, id) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const screen = pointerCoords(event);
    selectObject("segment", id);
    setDrag({ type: "segment", id, part: "label", start: fromScreen(screen.x, screen.y, false), moved: false, originalScene: scene });
  };

  const startSegmentEndpointDrag = (event, id, endpoint) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const screen = pointerCoords(event);
    selectObject("segment", id);
    setDrag({ type: "segment", id, part: endpoint, start: fromScreen(screen.x, screen.y, false), moved: false, originalScene: scene });
  };

  const routeObjectClickToCanvas = (event) => {
    event.stopPropagation();
    handleCanvasClick(event);
  };

  const handlePointClick = (event, point) => {
    event.stopPropagation();
    if (tool === "select" || tool === "point") {
      selectObject("point", point.id);
      return;
    }
    handleCoordinateInput({ x: point.x, y: point.y });
  };

  const moveObject = (object, delta) => {
    if (!object) return object;
    if ("x" in object && "y" in object) return { ...object, x: round(object.x + delta.x), y: round(object.y + delta.y) };
    if (object.type === "circle") return { ...object, center: { x: round(object.center.x + delta.x), y: round(object.center.y + delta.y) } };
    if (object.type === "ellipse") return { ...object, center: { x: round(object.center.x + delta.x), y: round(object.center.y + delta.y) } };
    if (object.type === "rectangle") {
      return {
        ...object,
        a: { x: round(object.a.x + delta.x), y: round(object.a.y + delta.y) },
        b: { x: round(object.b.x + delta.x), y: round(object.b.y + delta.y) },
      };
    }
    if ("a" in object && "b" in object) {
      return {
        ...object,
        a: { x: round(object.a.x + delta.x), y: round(object.a.y + delta.y) },
        b: { x: round(object.b.x + delta.x), y: round(object.b.y + delta.y) },
        vertex: object.vertex ? { x: round(object.vertex.x + delta.x), y: round(object.vertex.y + delta.y) } : object.vertex,
      };
    }
    if ("point" in object) return { ...object, point: { x: round(object.point.x + delta.x), y: round(object.point.y + delta.y) } };
    return object;
  };

  const moveSegmentLabel = (segment, delta) => ({
    ...segment,
    labelXShift: round((segment.labelXShift || 0) + delta.x),
    labelYShift: round((segment.labelYShift || 0) + delta.y),
  });

  const moveSegmentEndpoint = (segment, delta, endpoint) => ({
    ...segment,
    [endpoint]: {
      x: round(segment[endpoint].x + delta.x),
      y: round(segment[endpoint].y + delta.y),
    },
  });

  const handlePointerMove = (event) => {
    if (selectionBox) {
      const current = pointerCoords(event);
      const moved = selectionBox.moved || Math.hypot(current.x - selectionBox.start.x, current.y - selectionBox.start.y) > 4;
      setSelectionBox({ ...selectionBox, current, moved });
      return;
    }

    if (!drag) return;
    const screen = pointerCoords(event);
    const coords = fromScreen(screen.x, screen.y, snap && drag.part !== "label");
    const delta = { x: coords.x - drag.start.x, y: coords.y - drag.start.y };
    if (Math.abs(delta.x) < 0.01 && Math.abs(delta.y) < 0.01) return;
    if (drag.type === "group") {
      const groupDelta = snap ? { x: Math.round(delta.x), y: Math.round(delta.y) } : delta;
      if (Math.abs(groupDelta.x) < 0.01 && Math.abs(groupDelta.y) < 0.01) return;
      const byType = selectionGroup.reduce((acc, item) => {
        acc[item.type] = acc[item.type] || new Set();
        acc[item.type].add(item.id);
        return acc;
      }, {});
      setScene((current) => ({
        ...current,
        points: current.points.map((object) => (byType.point?.has(object.id) ? moveObject(object, groupDelta) : object)),
        segments: current.segments.map((object) => (byType.segment?.has(object.id) ? moveObject(object, groupDelta) : object)),
        shapes: current.shapes.map((object) => (byType.shape?.has(object.id) ? moveObject(object, groupDelta) : object)),
        texts: current.texts.map((object) => (byType.text?.has(object.id) ? moveObject(object, groupDelta) : object)),
        angles: current.angles.map((object) => (byType.angle?.has(object.id) ? moveObject(object, groupDelta) : object)),
        perpendiculars: current.perpendiculars.map((object) =>
          byType.perpendicular?.has(object.id) ? moveObject(object, groupDelta) : object
        ),
      }));
      setDrag({ ...drag, start: { x: drag.start.x + groupDelta.x, y: drag.start.y + groupDelta.y }, moved: true });
      return;
    }
    setScene((current) => ({
      ...current,
      [`${drag.type}s`]: current[`${drag.type}s`].map((object) => {
        if (object.id !== drag.id) return object;
        if (drag.part === "a" || drag.part === "b") return snap ? snapObject(moveSegmentEndpoint(object, delta, drag.part)) : moveSegmentEndpoint(object, delta, drag.part);
        if (drag.part === "label") return moveSegmentLabel(object, delta);
        return snap ? snapObject(moveObject(object, delta)) : moveObject(object, delta);
      }),
    }));
    setDrag({ ...drag, start: coords, moved: true });
  };

  const endDrag = () => {
    if (selectionBox) {
      const rect = normalizeScreenRect(selectionBox.start, selectionBox.current);
      const selected = selectionBox.moved ? collectObjectsInRect(rect) : [];
      setSelectionBox(null);
      if (selected.length > 1) {
        setSelectionGroup(selected);
        setSelection(null);
        setStatus(`${selected.length} ${tt.editor?.selectedMany || "objets sélectionnés"}.`);
        setSuppressClick(true);
        return;
      }
      if (selected.length === 1) {
        setSelection(selected[0]);
        setSelectionGroup([]);
        setStatus(tt.statusSelected);
        setSuppressClick(true);
        return;
      }
    }

    if (drag?.moved) {
      if (drag.originalScene) {
        setHistoryPast((past) => [...past.slice(-49), drag.originalScene]);
        setHistoryFuture([]);
      }
      setSuppressClick(true);
    }
    setDrag(null);
  };

  const handleSegmentClick = (event, segmentId) => {
    event.stopPropagation();
    if (tool === "angle") {
      const nextPending = [...pending, { segmentId }];
      if (nextPending.length < 2) {
        setPending(nextPending);
        setStatus(tt.statusSecondSegment);
        return;
      }

      showAngleChoicesFromSegments(nextPending[0].segmentId, nextPending[1].segmentId);
      setPending([]);
      return;
    }

    if (tool === "perpendicular" && pending[0]) {
      addPerpendicular(pending[0], segmentId);
      setPending([]);
      return;
    }

    if (tool !== "select") {
      handleCanvasClick(event);
      return;
    }

    selectObject("segment", segmentId);
  };

  const clearScene = () => {
    commitScene(() => blankScene());
    setSelection(null);
    setSelectionGroup([]);
    setPending([]);
    setStatus(tt.statusBlank);
  };

  const updateVariationTable = (updater) => {
    setVariationTable((current) => syncVariationTable(updater(syncVariationTable(current))));
  };

  const addVariationValue = (afterIndex = variationTable.columns.length - 1) => {
    updateVariationTable((current) => addVariationColumn(current, afterIndex));
  };

  const removeVariationValue = (index) => {
    updateVariationTable((current) => removeVariationColumn(current, index));
  };

  const addVariationRow = (type = "variation") => {
    updateVariationTable((current) => ({
      ...current,
      rows: [...current.rows, createVariationRow(current.columns.length, type, "")],
    }));
  };

  const removeVariationRow = (id) => {
    updateVariationTable((current) => ({
      ...current,
      rows: current.rows.filter((row) => row.id !== id),
    }));
  };

  const updateVariationRow = (id, patch) => {
    updateVariationTable((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  };

  const moveVariationRowById = (rowId, direction) => {
    updateVariationTable((current) => moveVariationRow(current, rowId, direction));
  };

  const updateVariationColumn = (columnIndex, patch) => {
    updateVariationTable((current) => ({
      ...current,
      columns: current.columns.map((column, index) => (index === columnIndex ? { ...column, ...patch } : column)),
    }));
  };

  const updateVariationPoint = (rowId, pointIndex, patch) => {
    updateVariationTable((current) => ({
      ...current,
      rows: current.rows.map((row) => (
        row.id === rowId
          ? {
              ...row,
              points: row.points.map((point, index) => (index === pointIndex ? { ...point, ...patch } : point)),
            }
          : row
      )),
    }));
  };

  const updateVariationInterval = (rowId, intervalIndex, patch) => {
    updateVariationTable((current) => ({
      ...current,
      rows: current.rows.map((row) => (
        row.id === rowId
          ? {
              ...row,
              intervals: row.intervals.map((interval, index) => (index === intervalIndex ? { ...interval, ...patch } : interval)),
            }
          : row
      )),
    }));
  };

  const resetVariationExample = () => {
    setVariationTable(createExampleVariationTable());
  };

  const resetVariationBlank = () => {
    setVariationTable(createBlankVariationTable());
  };


  const importTikz = () => {
    try {
      const { scene: imported, unitScale: importedUnitScale } = parseImportedTikz(importCode);
      const count = Object.values(imported).reduce((sum, list) => sum + list.length, 0);
      if (count === 0) {
        setStatus(tt.importEmpty);
        return;
      }
      commitScene(() => imported);
      setUnitScale(importedUnitScale);
      setSelection(null);
      setSelectionGroup([]);
      setPending([]);
      setAngleChoices([]);
      setStatus(tt.importSuccess);
    } catch (error) {
      setStatus(tt.importError);
    }
  };

  const copyTikz = async () => {
    try {
      await navigator.clipboard.writeText(tikzCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      setCopied(false);
    }
  };

  const lastPending = pending[pending.length - 1];
  const pendingPreview = lastPending && typeof lastPending.x === "number" ? toScreen(lastPending) : null;

  return (
    <div className="showcase-page tikz-page min-w-screen min-h-screen pb-10">
      <NavBar />
      <div className="showcase-shell">
        <section className="showcase-panel tikz-hero animate-defil">
          <div>
            <p className="showcase-eyebrow">TikZ</p>
            <h1 className="showcase-title">{tt.title || "Outils TikZ"}</h1>
            <p className="showcase-lead">
              {tt.lead || "Construire des figures TikZ spécialisées, les modifier visuellement et récupérer le code en direct."}
            </p>
            <div className="tikz-tool-switcher" aria-label={tt.title}>
              <button type="button" className={`tikz-tool-tab ${tikzMode === "figure" ? "tikz-tool-tab-active" : ""}`} onClick={() => setTikzMode("figure")}>
                {tt.toolFigures || tt.toolOptics}
              </button>
              {variationToolsEnabled && (
                <button type="button" className={`tikz-tool-tab ${tikzMode === "variation" ? "tikz-tool-tab-active" : ""}`} onClick={() => setTikzMode("variation")}>
                  {tt.toolVariations || "Tableaux de variations"}
                </button>
              )}
            </div>
          </div>
          {tikzMode === "figure" && (
            <div className="tikz-top-actions">
              <button type="button" className="tikz-pill" onClick={undo} disabled={!canUndo}>
                <span>{tt.undo}</span>
              </button>
              <button type="button" className="tikz-pill" onClick={redo} disabled={!canRedo}>
                <span>{tt.redo}</span>
              </button>
              <button type="button" className={`tikz-pill ${showGrid ? "tikz-pill-active" : ""}`} onClick={() => setShowGrid((value) => !value)}>
                {showGrid ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                <span>{tt.exportedGrid}</span>
              </button>
              <button type="button" className={`tikz-pill ${snap ? "tikz-pill-active" : ""}`} onClick={() => setSnap((value) => !value)}>
                <GridSnapIcon className="w-5 h-5" />
                <span>{tt.snap}</span>
              </button>
              <label className="tikz-inline-number">
                <span>{tt.unit}</span>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={unitScale}
                  onChange={(event) => setUnitScale(Math.max(0.1, Number(event.target.value) || 1))}
                />
              </label>
              <button type="button" className="tikz-danger-action" onClick={clearScene}>
                <TrashIcon className="w-5 h-5" />
                <span>{tt.clear}</span>
              </button>
              <label className="tikz-inline-select">
                <span>{tt.segments}</span>
                <ArrowPicker value={segmentArrow} onChange={setSegmentArrow} />
              </label>
            </div>
          )}
        </section>

        {tikzMode === "figure" && <section className="showcase-panel tikz-toolbar animate-defil">
          {TOOLS.map((item) => {
            const Icon = item.icon;
            const label = tt.tools?.[item.id] || item.id;
            return (
              <button
                type="button"
                key={item.id}
                className={`tikz-tool ${tool === item.id ? "tikz-tool-active" : ""}`}
                onClick={() => {
                  setTool(item.id);
                  setPending([]);
                  setSelectionGroup([]);
                  setAngleChoices([]);
                  setStatus(item.id === "angle" ? tt.statusAngleTool : `${tt.statusActiveTool} ${label}.`);
                }}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            );
          })}
        </section>}

        {tikzMode === "figure" ? <section className="tikz-workbench animate-defil">
          <aside className="showcase-panel tikz-panel tikz-controls">
            <ObjectEditor
              selection={selection}
              selectionGroup={selectionGroup}
              object={selectedObject}
              updateSelected={updateSelected}
              updateSelectedStyle={updateSelectedStyle}
              deleteSelected={deleteSelected}
              segments={scene.segments}
              status={status}
              labels={tt}
            />
          </aside>

          <div className="tikz-main">
            <div className="showcase-panel tikz-canvas-panel">
              <svg
                className="tikz-canvas"
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                role="img"
                aria-label="Zone de dessin TikZ"
                onClick={handleCanvasClick}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerLeave={endDrag}
              >
                <defs>
                  <marker id="tikz-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#1e293b" />
                  </marker>
                  <pattern id="tikz-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="8" className="tikz-hatch-line" />
                  </pattern>
                </defs>
                <rect width={WIDTH} height={HEIGHT} className="tikz-canvas-bg" />
                <Grid />
                {selectionBox && (
                  <rect
                    className="tikz-selection-box"
                    x={normalizeScreenRect(selectionBox.start, selectionBox.current).minX}
                    y={normalizeScreenRect(selectionBox.start, selectionBox.current).minY}
                    width={normalizeScreenRect(selectionBox.start, selectionBox.current).maxX - normalizeScreenRect(selectionBox.start, selectionBox.current).minX}
                    height={normalizeScreenRect(selectionBox.start, selectionBox.current).maxY - normalizeScreenRect(selectionBox.start, selectionBox.current).minY}
                  />
                )}

                {scene.shapes.map((shape) => (
                  <ShapeView
                    key={shape.id}
                    shape={shape}
                    selected={isSelected("shape", shape.id)}
                    tool={tool}
                    startDrag={startDrag}
                    selectObject={selectObject}
                    routeObjectClickToCanvas={routeObjectClickToCanvas}
                  />
                ))}

                {scene.segments.map((segment) => {
                  const a = toScreen(segment.a);
                  const b = toScreen(segment.b);
                  const segmentLabel = segment.label ? toScreen(segmentLabelPoint(segment)) : null;
                  const markPoint = toScreen(segmentPointAt(segment, segment.midMarkPosition || "midway"));
                  const markAngle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
                  const mirrorTicks = segmentMirrorTicks(segment);
                  return (
                    <g key={segment.id}>
                      <path
                        className={`tikz-line ${segment.dashed ? "tikz-dashed" : ""} ${isSelected("segment", segment.id) ? "tikz-line-selected" : ""}`}
                        d={segmentSvgPath(segment)}
                        markerStart={segment.arrow === "<-" || segment.arrow === "<->" ? "url(#tikz-arrow)" : undefined}
                        markerEnd={segment.arrow === "->" || segment.arrow === "<->" ? "url(#tikz-arrow)" : undefined}
                        onClick={(event) => handleSegmentClick(event, segment.id)}
                        onPointerDown={(event) => {
                          if (tool === "select") {
                            startDrag(event, "segment", segment.id);
                            return;
                          }
                          event.stopPropagation();
                        }}
                      />
                      {mirrorTicks.map((tick, index) => {
                        const start = toScreen(tick.start);
                        const end = toScreen(tick.end);
                        return (
                          <line
                            key={`${segment.id}-mirror-${index}`}
                            className="tikz-mirror-tick"
                            x1={start.x}
                            y1={start.y}
                            x2={end.x}
                            y2={end.y}
                            onClick={(event) => handleSegmentClick(event, segment.id)}
                            onPointerDown={(event) => {
                              if (tool === "select") {
                                startDrag(event, "segment", segment.id);
                                return;
                              }
                              event.stopPropagation();
                            }}
                          />
                        );
                      })}
                      {segment.midMark && (
                        <text
                          className="tikz-segment-midmark"
                          x={markPoint.x}
                          y={markPoint.y}
                          transform={`rotate(${markAngle} ${markPoint.x} ${markPoint.y})`}
                          onClick={(event) => handleSegmentClick(event, segment.id)}
                          onPointerDown={(event) => {
                            if (tool === "select") {
                              startDrag(event, "segment", segment.id);
                              return;
                            }
                            event.stopPropagation();
                          }}
                        >
                          {segment.midMark === ">>" ? "››" : segment.midMark}
                        </text>
                      )}
                      {segmentLabel && (
                        <g
                          className={isSelected("segment", segment.id) ? "tikz-segment-label-selected" : ""}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (tool === "select") {
                              selectObject("segment", segment.id);
                              return;
                            }
                            handleCanvasClick(event);
                          }}
                          onPointerDown={(event) => {
                            if (tool === "select") {
                              startSegmentLabelDrag(event, segment.id);
                              return;
                            }
                            event.stopPropagation();
                          }}
                        >
                          <LatexSvgLabel
                            x={segmentLabel.x}
                            y={segmentLabel.y}
                            value={segment.label}
                            anchor={segment.labelSide || "above"}
                            interactive
                          />
                        </g>
                      )}
                      {tool === "select" && selection?.type === "segment" && selection.id === segment.id && selectionGroup.length === 0 && (
                        <>
                          <circle
                            className="tikz-endpoint-handle"
                            cx={a.x}
                            cy={a.y}
                            r="7"
                            onClick={(event) => {
                              event.stopPropagation();
                              selectObject("segment", segment.id);
                            }}
                            onPointerDown={(event) => startSegmentEndpointDrag(event, segment.id, "a")}
                          />
                          <circle
                            className="tikz-endpoint-handle"
                            cx={b.x}
                            cy={b.y}
                            r="7"
                            onClick={(event) => {
                              event.stopPropagation();
                              selectObject("segment", segment.id);
                            }}
                            onPointerDown={(event) => startSegmentEndpointDrag(event, segment.id, "b")}
                          />
                        </>
                      )}
                    </g>
                  );
                })}

                {scene.perpendiculars.map((perpendicular) => {
                  const segment = scene.segments.find((item) => item.id === perpendicular.segmentId);
                  if (!segment) return null;
                  const foot = projectPointOnLine(perpendicular.point, segment.a, segment.b);
                  const sp = toScreen(perpendicular.point);
                  const sf = toScreen(foot);
                  const marker = rightAngleMarker(perpendicular.point, foot, segment.a, segment.b).map(toScreen);
                  return (
                    <g
                      key={perpendicular.id}
                      className={`tikz-perpendicular ${isSelected("perpendicular", perpendicular.id) ? "tikz-object-selected" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (tool !== "select") {
                          handleCanvasClick(event);
                          return;
                        }
                        selectObject("perpendicular", perpendicular.id);
                      }}
                      onPointerDown={(event) => {
                        if (tool === "select") {
                          startDrag(event, "perpendicular", perpendicular.id);
                          return;
                        }
                        event.stopPropagation();
                      }}
                    >
                      <line x1={sp.x} y1={sp.y} x2={sf.x} y2={sf.y} />
                      <polyline points={marker.map((item) => `${item.x},${item.y}`).join(" ")} />
                    </g>
                  );
                })}

                {scene.angles.map((angle) => {
                  const data = angleData(angle.a, angle.vertex, angle.b, angle.radius);
                  const label = toScreen(data.labelPoint);
                  return (
                    <g
                      key={angle.id}
                      className={`tikz-angle ${angle.dashed ? "tikz-dashed" : ""} ${isSelected("angle", angle.id) ? "tikz-object-selected" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (tool !== "select") {
                          handleCanvasClick(event);
                          return;
                        }
                        selectObject("angle", angle.id);
                      }}
                      onPointerDown={(event) => {
                        if (tool === "select") {
                          startDrag(event, "angle", angle.id);
                          return;
                        }
                        event.stopPropagation();
                      }}
                    >
                      <path d={svgAnglePath(angle.a, angle.vertex, angle.b, angle.radius)} />
                      <LatexSvgLabel x={label.x} y={label.y} value={angle.label} />
                    </g>
                  );
                })}

                {angleChoices.map((choice) => (
                  <path
                    key={choice.id}
                    className="tikz-angle-choice"
                    d={svgAnglePath(choice.a, choice.vertex, choice.b, choice.radius)}
                    onClick={(event) => {
                      event.stopPropagation();
                      addAngle([choice.a, choice.vertex, choice.b]);
                      setPending([]);
                    }}
                  />
                ))}

                {scene.texts.map((text) => {
                  const screen = toScreen(text);
                  return (
                    <g
                      key={text.id}
                      className={isSelected("text", text.id) ? "tikz-text-selected" : ""}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (tool !== "select") {
                          handleCanvasClick(event);
                          return;
                        }
                        selectObject("text", text.id);
                      }}
                      onPointerDown={(event) => {
                        if (tool === "select") {
                          startDrag(event, "text", text.id);
                          return;
                        }
                        event.stopPropagation();
                      }}
                    >
                      <rect
                        className="tikz-text-hitbox"
                        x={screen.x - 70}
                        y={screen.y - 22}
                        width="140"
                        height="44"
                      />
                      <LatexSvgLabel x={screen.x} y={screen.y} value={text.text} interactive />
                    </g>
                  );
                })}

                {scene.points.map((point) => {
                  const screen = toScreen(point);
                  const label = toScreen({ x: point.x + point.labelDx, y: point.y + point.labelDy });
                  return (
                    <g
                      key={point.id}
                      className={`tikz-point ${isSelected("point", point.id) ? "tikz-point-selected" : ""}`}
                      onClick={(event) => handlePointClick(event, point)}
                      onPointerDown={(event) => {
                        if (tool === "select" || tool === "point") {
                          startDrag(event, "point", point.id);
                          return;
                        }
                        event.stopPropagation();
                      }}
                    >
                      <circle cx={screen.x} cy={screen.y} r={POINT_RADIUS} />
                      <LatexSvgLabel x={label.x} y={label.y} value={point.label} />
                    </g>
                  );
                })}

                {pendingPreview && <circle className="tikz-pending-dot" cx={pendingPreview.x} cy={pendingPreview.y} r="5" />}
              </svg>
            </div>
          </div>
        </section> : (
          <VariationTableEditor
            table={variationTable}
            columnCount={variationColumnCount}
            labels={tt.variation || {}}
            addValue={addVariationValue}
            removeValue={removeVariationValue}
            updateTable={updateVariationTable}
            addRow={addVariationRow}
            removeRow={removeVariationRow}
            updateRow={updateVariationRow}
            moveRow={moveVariationRowById}
            updateColumn={updateVariationColumn}
            updatePoint={updateVariationPoint}
            updateInterval={updateVariationInterval}
            resetExample={resetVariationExample}
            resetBlank={resetVariationBlank}
          />
        )}

        <section className="showcase-panel tikz-code-panel animate-defil">
          <div className="tikz-code-head">
            <div>
              <p className="showcase-eyebrow">{tt.generatedCode}</p>
              <h2 className="tikz-code-title">{tt.liveTikz}</h2>
            </div>
            <div className="tikz-code-actions">
              <button type="button" className={`tikz-pill ${includeDocument ? "tikz-pill-active" : ""}`} onClick={() => setIncludeDocument((value) => !value)}>
                <span>{tt.fullDocument}</span>
              </button>
              <button type="button" className="tikz-pill" onClick={copyTikz}>
                <ClipboardDocumentIcon className="w-5 h-5" />
                <span>{copied ? copiedText : copyText}</span>
              </button>
              <button type="button" className="tikz-pill" onClick={() => downloadTextFile("figure-tikz.tex", tikzCode)}>
                <ArrowDownTrayIcon className="w-5 h-5" />
                <span>.tex</span>
              </button>
            </div>
          </div>
          <pre className="tikz-code">{tikzCode}</pre>
        </section>

        <section className="showcase-panel tikz-code-panel animate-defil">
          <div className="tikz-code-head">
            <div>
              <p className="showcase-eyebrow">TikZ</p>
              <h2 className="tikz-code-title">{tt.importTitle}</h2>
              <p className="tikz-muted">{tt.importLead}</p>
            </div>
            <button type="button" className="tikz-pill" onClick={importTikz}>
              <span>{tt.importButton}</span>
            </button>
          </div>
          <textarea
            className="tikz-import-input"
            value={importCode}
            onChange={(event) => setImportCode(event.target.value)}
            placeholder={tt.importPlaceholder}
          />
        </section>
      </div>
    </div>
  );
}

function Grid() {
  return (
    <g className="tikz-grid">
      {Array.from({ length: GRID_MAX_X - GRID_MIN_X + 1 }, (_, index) => GRID_MIN_X + index).map((x) => {
        const sx = toScreen({ x, y: 0 }).x;
        return <line key={`x-${x}`} x1={sx} y1={0} x2={sx} y2={HEIGHT} />;
      })}
      {Array.from({ length: GRID_MAX_Y - GRID_MIN_Y + 1 }, (_, index) => GRID_MIN_Y + index).map((y) => {
        const sy = toScreen({ x: 0, y }).y;
        return <line key={`y-${y}`} x1={0} y1={sy} x2={WIDTH} y2={sy} />;
      })}
      <line className="tikz-axis" x1={0} y1={CENTER.y} x2={WIDTH} y2={CENTER.y} />
      <line className="tikz-axis" x1={CENTER.x} y1={0} x2={CENTER.x} y2={HEIGHT} />
    </g>
  );
}

function VariationTableEditor({
  table,
  columnCount,
  labels,
  addValue,
  removeValue,
  updateTable,
  addRow,
  removeRow,
  updateRow,
  moveRow,
  updateColumn,
  updatePoint,
  updateInterval,
  resetExample,
  resetBlank,
}) {
  const labelFor = (key, fallback) => labels[key] || fallback;
  const intervalCount = Math.max(1, table.columns.length - 1);
  const [selected, setSelected] = useState(null);

  return (
    <section className="tikz-variation-workbench animate-defil">
      <div className="showcase-panel tikz-panel tikz-variation-toolbar">
        <button type="button" className="tikz-pill" onClick={() => addValue(table.columns.length - 1)}>
          <PlusIcon className="w-5 h-5" />
          <ButtonMathLabel value={labelFor("addValue", "Ajouter une valeur")} />
        </button>
        {VARIATION_ROW_TYPES.map((type) => (
          <button type="button" className="tikz-pill" key={type} onClick={() => addRow(type)} disabled={table.columns.length === 0}>
            <PlusIcon className="w-5 h-5" />
            <ButtonMathLabel value={labelFor(`row_${type}`, type)} />
          </button>
        ))}
        <button type="button" className="tikz-pill" onClick={resetExample}>
          <ButtonMathLabel value={labelFor("resetExample", "Réinitialiser")} />
        </button>
        <button type="button" className="tikz-pill" onClick={resetBlank}>
          <ButtonMathLabel value={labelFor("blankExample", "Tableau vide")} />
        </button>
      </div>
      <VariationPropertiesPanel
        table={table}
        selected={selected}
        labels={labels}
        labelFor={labelFor}
        updateColumn={updateColumn}
        removeValue={removeValue}
        updateRow={updateRow}
        removeRow={removeRow}
        moveRow={moveRow}
        updatePoint={updatePoint}
        updateInterval={updateInterval}
      />
      <div className="showcase-panel tikz-panel tikz-variation-editor">
        {table.columns.length === 0 ? (
          <p className="tikz-muted">{labelFor("emptyValues", "Ajouter les valeurs de la première ligne.")}</p>
        ) : (
          <div className="variation-stage-scroll">
            <div
              className="variation-stage"
              style={{
                "--variation-interval-count": intervalCount,
                "--variation-row-count": table.rows.length,
                "--variation-label-width": `${table.labelColumnWidth || 11}rem`,
                "--variation-interval-width": `${table.intervalWidth || 9.5}rem`,
              }}
            >
              <ResizeHandle
                className="variation-label-resize"
                axis="x"
            onResize={(delta) => updateTable((current) => ({ ...current, labelColumnWidth: Math.max(8, Math.min(20, (current.labelColumnWidth || 11) + delta / 16)) }))}
              />
              <ResizeHandle
                className="variation-interval-resize"
                axis="x"
            onResize={(delta) => updateTable((current) => ({ ...current, intervalWidth: Math.max(7, Math.min(16, (current.intervalWidth || 9.5) + delta / 16)) }))}
              />
              <div className="variation-label-cell variation-header-label">
                <EditableLatex
                  className="tikz-variation-main-value"
                  value={table.variableLabel}
                  onChange={(variableLabel) => updateTable((current) => ({ ...current, variableLabel }))}
                />
              </div>
              <div className="variation-graph variation-header-graph">
                {table.columns.map((column, valueIndex) => (
                  <div
                    key={column.id}
                    className={`variation-critical-editor ${isVariationSelected(selected, "column", null, valueIndex) ? "variation-selected" : ""}`}
                    style={{ left: `calc(var(--variation-end-padding) + ${valueIndex} * var(--variation-interval-width))` }}
                    onClick={() => setSelected({ type: "column", index: valueIndex })}
                  >
                    <EditableLatex
                      className="tikz-variation-main-value"
                      value={column?.value || ""}
                      onChange={(value) => updateColumn(valueIndex, { value })}
                    />
                  </div>
                ))}
              </div>

              {table.rows.map((row) => (
                <VariationVisualRow
                  key={row.id}
                  row={row}
                  columns={table.columns}
                  labels={labels}
                  labelFor={labelFor}
                  intervalCount={intervalCount}
                  updateRow={updateRow}
                  removeRow={removeRow}
                  moveRow={moveRow}
                  updateColumn={updateColumn}
                  updatePoint={updatePoint}
                  updateInterval={updateInterval}
                  selected={selected}
                  setSelected={setSelected}
                />
              ))}
              {table.rows.length === 0 && (
                <div className="variation-empty">{labelFor("emptyRows", "Ajouter une ligne pour commencer le tableau.")}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SeparatorLayer({ columns, row }) {
  return (
    <div className="variation-separator-layer" aria-hidden="true">
      {columns.map((column, index) => {
        const point = row?.points?.[index] || {};
        const barrier = point.barrier || "none";
        return (
          <div
            key={column.id}
            className={`variation-separator variation-separator-${barrier}`}
            style={{ left: `calc(var(--variation-end-padding) + ${index} * var(--variation-interval-width))` }}
          >
            {((barrier === "zero") || (barrier === "bar" && point.barrierText)) && (
              <span><MathLabel value={barrier === "zero" ? point.barrierText || "$0$" : point.barrierText} /></span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VariationPropertiesPanel({ table, selected, labels, labelFor, updateColumn, removeValue, updateRow, removeRow, moveRow, updatePoint, updateInterval }) {
  const row = selected?.rowId ? table.rows.find((item) => item.id === selected.rowId) : null;
  const point = row && typeof selected?.index === "number" ? row.points[selected.index] : null;
  const interval = row && typeof selected?.index === "number" ? row.intervals[selected.index] : null;
  const column = selected?.type === "column" ? table.columns[selected.index] : null;

  if (!selected) {
    return (
      <div className="showcase-panel tikz-variation-properties">
        <span className="tikz-muted">Cliquer une valeur, un signe, une flèche ou un nom de ligne pour modifier ses options.</span>
      </div>
    );
  }

  return (
    <div className="showcase-panel tikz-variation-properties">
      {selected.type === "column" && column && (
        <>
          <strong>{labelFor("value", "Valeur")}</strong>
          <input className="tikz-input" value={column.value || ""} onChange={(event) => updateColumn(selected.index, { value: event.target.value })} />
          <button type="button" className="tikz-danger-action" onClick={() => removeValue(selected.index)}>
            <TrashIcon className="w-5 h-5" />
            <ButtonMathLabel value={labelFor("removeValue", "Supprimer")} />
          </button>
        </>
      )}

      {selected.type === "row" && row && (
        <>
          <strong>{labelFor("rows", "Ligne")}</strong>
          <input className="tikz-input" value={row.label || ""} onChange={(event) => updateRow(row.id, { label: event.target.value })} />
          <select className="tikz-select" value={row.type} onChange={(event) => updateRow(row.id, { type: event.target.value })}>
            {VARIATION_ROW_TYPES.map((type) => (
              <option key={type} value={type}>{labelFor(`row_${type}`, type)}</option>
            ))}
          </select>
          <button type="button" className="tikz-pill" onClick={() => moveRow(row.id, -1)}>↑</button>
          <button type="button" className="tikz-pill" onClick={() => moveRow(row.id, 1)}>↓</button>
          <button type="button" className="tikz-danger-action" onClick={() => removeRow(row.id)}>
            <TrashIcon className="w-5 h-5" />
            <ButtonMathLabel value={labelFor("removeRow", "Supprimer")} />
          </button>
        </>
      )}

      {(selected.type === "signPoint" || selected.type === "variationPoint") && row && point && (
        <>
          <strong>{selected.type === "variationPoint" ? labelFor("row_variation", "Variation") : labelFor("point", "Point")}</strong>
          <input className="tikz-input" value={point.value || ""} onChange={(event) => updatePoint(row.id, selected.index, { value: event.target.value })} />
          <select
            className="tikz-select"
            value={point.barrier || "none"}
            onChange={(event) => updatePoint(row.id, selected.index, {
              barrier: event.target.value,
              value: event.target.value === "zero" ? "$0$" : point.value || "",
            })}
          >
            {VARIATION_BARRIERS.map((barrier) => (
              <option key={barrier} value={barrier}>{labelFor(`separator_${barrier}`, barrier)}</option>
            ))}
          </select>
          {(point.barrier === "bar" || point.barrier === "zero") && (
            <input className="tikz-input" value={point.barrierText || ""} onChange={(event) => updatePoint(row.id, selected.index, { barrierText: event.target.value })} placeholder="0" />
          )}
          {selected.type === "variationPoint" && (
            <>
              <select className="tikz-select" value={point.position || "middle"} onChange={(event) => updatePoint(row.id, selected.index, { position: event.target.value })}>
                {VARIATION_POSITIONS.map((position) => (
                  <option key={position} value={position}>{labelFor(`position_${position}`, position)}</option>
                ))}
              </select>
              {point.barrier === "double" && (
                <>
                  <input className="tikz-input" value={point.leftValue || ""} onChange={(event) => updatePoint(row.id, selected.index, { leftValue: event.target.value })} placeholder={labelFor("leftLimit", "limite gauche")} />
                  <input className="tikz-input" value={point.rightValue || ""} onChange={(event) => updatePoint(row.id, selected.index, { rightValue: event.target.value })} placeholder={labelFor("rightLimit", "limite droite")} />
                </>
              )}
            </>
          )}
        </>
      )}

      {selected.type === "signInterval" && row && interval && (
        <>
          <strong>{labelFor("interval", "Intervalle")}</strong>
          <div className="tikz-variation-quick-actions">
            {["$+$", "$-$", "$0$", ""].map((value) => (
              <button type="button" className="tikz-pill" key={value || "empty"} onClick={() => updateInterval(row.id, selected.index, { value })}>
                <ButtonMathLabel value={value || "vide"} />
              </button>
            ))}
          </div>
          <input className="tikz-input" value={interval.value || ""} onChange={(event) => updateInterval(row.id, selected.index, { value: event.target.value })} />
        </>
      )}

      {selected.type === "variationInterval" && row && interval && (
        <>
          <strong>{labelFor("arrowMode", "Flèche")}</strong>
          <div className="variation-choice-grid">
            {VARIATION_ARROW_MODES.filter((arrow) => !["none", "discontinuity"].includes(arrow)).map((arrow) => (
              <button
                type="button"
                key={arrow}
                className={`variation-choice ${((interval.arrow || "auto") === arrow) ? "variation-choice-active" : ""}`}
                onClick={() => updateInterval(row.id, selected.index, { arrow })}
              >
                <ButtonMathLabel value={labelFor(`arrow_${arrow}`, arrow)} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function isVariationSelected(selected, type, rowId, index) {
  if (!selected || selected.type !== type) return false;
  if (rowId !== null && selected.rowId !== rowId) return false;
  if (typeof index === "number" && selected.index !== index) return false;
  return true;
}

function VariationVisualRow({ row, columns, labels, labelFor, intervalCount, updateRow, removeRow, moveRow, updateColumn, updatePoint, updateInterval, selected, setSelected }) {
  const rowStyle = { "--variation-current-row-height": `${row.height || (row.type === "variation" ? 8.2 : 5.2)}rem` };
  return (
    <>
      <div
        className={`variation-label-cell variation-row-label-cell variation-row-${row.type} ${isVariationSelected(selected, "row", row.id) ? "variation-selected" : ""}`}
        style={rowStyle}
        onClick={() => setSelected({ type: "row", rowId: row.id })}
      >
        <VariationRowHeader
          row={row}
          labelFor={labelFor}
          onLabelChange={(label) => updateRow(row.id, { label })}
          onTypeChange={(type) => updateRow(row.id, { type })}
          onRemove={() => removeRow(row.id)}
          onMove={(direction) => moveRow(row.id, direction)}
        />
      </div>
      <div className={`variation-graph variation-row-graph variation-row-${row.type}`} style={rowStyle}>
        {row.type === "variation" ? (
          <>
            <VariationArrowLayer row={row} columns={columns} intervalCount={intervalCount} labelFor={labelFor} updateInterval={updateInterval} />
            {row.intervals.map((interval, index) => (
              <button
                type="button"
                key={`${row.id}-arrow-hitbox-${index}`}
                className={`variation-arrow-hitbox ${isVariationSelected(selected, "variationInterval", row.id, index) ? "variation-selected" : ""}`}
                style={{ left: `calc(var(--variation-end-padding) + ${index} * var(--variation-interval-width))` }}
                onClick={() => setSelected({ type: "variationInterval", rowId: row.id, index })}
                aria-label={labelFor("arrowMode", "Flèche")}
              />
            ))}
            {columns.map((column, index) => (
              <div
                key={column.id}
                className={`variation-critical-slot ${isVariationSelected(selected, "variationPoint", row.id, index) ? "variation-selected" : ""}`}
                style={{ left: `calc(var(--variation-end-padding) + ${index} * var(--variation-interval-width))` }}
                onClick={() => setSelected({ type: "variationPoint", rowId: row.id, index })}
              >
                <VariationPointCell
                  point={row.points[index] || {}}
                  disabledSplit={row.points[index]?.barrier !== "double"}
                  labels={labels}
                  onChange={(patch) => updatePoint(row.id, index, patch)}
                />
              </div>
            ))}
          </>
        ) : (
          <>
            {row.intervals.map((interval, index) => (
              <div
                key={`${row.id}-interval-${index}`}
                className={`variation-interval-slot ${isVariationSelected(selected, "signInterval", row.id, index) ? "variation-selected" : ""}`}
                style={{ left: `calc(var(--variation-end-padding) + (${index} + .5) * var(--variation-interval-width))` }}
                onClick={() => setSelected({ type: "signInterval", rowId: row.id, index })}
              >
                <EditableLatex value={interval.value || ""} onChange={(value) => updateInterval(row.id, index, { value })} />
              </div>
            ))}
            {columns.map((column, index) => (
              <div
                key={`${row.id}-point-${column.id}`}
                className={`variation-sign-point-slot ${isVariationSelected(selected, "signPoint", row.id, index) ? "variation-selected" : ""}`}
                style={{ left: `calc(var(--variation-end-padding) + ${index} * var(--variation-interval-width))` }}
                onClick={() => setSelected({ type: "signPoint", rowId: row.id, index })}
              >
                <EditableLatex value={row.points[index]?.value || ""} onChange={(value) => updatePoint(row.id, index, { value })} />
              </div>
            ))}
          </>
        )}
        <SeparatorLayer columns={columns} row={row} />
        <ResizeHandle
          className="variation-row-resize"
          axis="y"
          onResize={(delta) => updateRow(row.id, { height: Math.max(row.type === "variation" ? 6.2 : 4.3, Math.min(14, (row.height || (row.type === "variation" ? 8.2 : 5.2)) + delta / 16)) })}
        />
      </div>
    </>
  );
}

function ResizeHandle({ className, axis, onResize }) {
  const startDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const start = axis === "x" ? event.clientX : event.clientY;
    let lastDelta = 0;
    const handleMove = (moveEvent) => {
      const current = axis === "x" ? moveEvent.clientX : moveEvent.clientY;
      const totalDelta = current - start;
      onResize(totalDelta - lastDelta);
      lastDelta = totalDelta;
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return <button type="button" className={`variation-resize-handle ${className}`} onPointerDown={startDrag} aria-label="Redimensionner" />;
}

function VariationArrowLayer({ row, columns, intervalCount, labelFor, updateInterval }) {
  const levelToY = (level) => (level === "high" ? 28 : level === "low" ? 72 : 50);
  const segmentWidth = 100;
  const svgWidth = intervalCount * segmentWidth;

  return (
    <svg className="variation-arrow-layer" viewBox={`0 0 ${svgWidth} 100`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id="variation-arrow-head-global" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="4" markerHeight="4" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>
      {row.intervals.map((interval, index) => {
        const arrow = getVariationArrow(row, index);
        if (arrow === "none" || arrow === "discontinuity") return null;
        const leftDouble = row.points[index]?.barrier === "double";
        const rightDouble = row.points[index + 1]?.barrier === "double";
        const x1 = index * segmentWidth + (leftDouble ? 26 : 34);
        const x2 = (index + 1) * segmentWidth - (rightDouble ? 26 : 34);
        const levels = variationArrowEndpointLevels(row, index);
        const y1Base = levelToY(levels.left);
        const y2Base = levelToY(levels.right);
        const ySign = Math.sign(y2Base - y1Base);
        const y1 = y1Base + ySign * 8;
        const y2 = y2Base - ySign * 8;
        return <path key={`${row.id}-arrow-${index}`} d={`M ${x1} ${y1} L ${x2} ${y2}`} markerEnd="url(#variation-arrow-head-global)" />;
      })}
    </svg>
  );
}

function VariationPointCell({ point, disabledSplit, labels, onChange }) {
  const labelFor = (key, fallback) => labels[key] || fallback;
  return (
    <div className={`tikz-variation-point-editor tikz-variation-point-${point.position || "middle"}`}>
      {!disabledSplit && (
        <EditableLatex
          className="tikz-variation-side-value tikz-variation-side-left"
          value={point.leftValue || ""}
          onChange={(leftValue) => onChange({ leftValue })}
          placeholder={labelFor("leftLimit", "g.")}
        />
      )}
      <EditableLatex
        className="tikz-variation-value-at-position"
        value={point.value || ""}
        onChange={(value) => onChange({ value })}
      />
      {!disabledSplit && (
        <EditableLatex
          className="tikz-variation-side-value tikz-variation-side-right"
          value={point.rightValue || ""}
          onChange={(rightValue) => onChange({ rightValue })}
          placeholder={labelFor("rightLimit", "d.")}
        />
      )}
    </div>
  );
}

function VariationRowHeader({ row, labelFor, onLabelChange, onTypeChange, onRemove, onMove }) {
  return (
    <div className="tikz-variation-row-header">
      <div className="tikz-variation-row-title">
        <EditableLatex value={row.label} onChange={onLabelChange} />
      </div>
    </div>
  );
}

function EditableLatex({ value, onChange, className = "", placeholder = "" }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        className={`tikz-variation-latex-input ${className}`}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") setEditing(false);
        }}
        autoFocus
      />
    );
  }

  return (
    <button type="button" className={`tikz-variation-latex-display ${className}`} onClick={() => setEditing(true)}>
      {value ? <RichContent html={escapeHtml(value)} enableMathCopy={false} /> : <span className="tikz-variation-placeholder">{placeholder || "\\ "}</span>}
    </button>
  );
}

function VariationArrowCell({ arrow, mode, labelFor, onChange }) {
  const path = {
    up: "M 8 46 L 92 12",
    down: "M 8 12 L 92 46",
    flat: "M 8 29 L 92 29",
  }[arrow] || "M 8 29 L 92 29";

  return (
    <div className="tikz-variation-arrow-cell">
      <svg className="tikz-variation-arrow-svg" viewBox="0 0 100 58" aria-hidden="true">
        <defs>
          <marker id={`variation-arrow-${arrow}`} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>
        <path d={path} markerEnd={`url(#variation-arrow-${arrow})`} />
      </svg>
      <select className="tikz-variation-arrow-mode" value={mode} onChange={(event) => onChange(event.target.value)}>
        {VARIATION_ARROW_MODES.map((option) => (
          <option key={option} value={option}>{labelFor(`arrow_${option}`, option)}</option>
        ))}
      </select>
    </div>
  );
}

function LatexSvgLabel({ x, y, value, anchor = "center", interactive = false }) {
  const width = 140;
  const height = 44;
  const gap = 6;
  const box = {
    center: { x: x - width / 2, y: y - height / 2 },
    above: { x: x - width / 2, y: y - height - gap },
    below: { x: x - width / 2, y: y + gap },
    left: { x: x - width - gap, y: y - height / 2 },
    right: { x: x + gap, y: y - height / 2 },
  }[anchor] || { x: x - width / 2, y: y - height / 2 };

  return (
    <foreignObject
      x={box.x}
      y={box.y}
      width={width}
      height={height}
      className={`${interactive ? "tikz-latex-foreign tikz-latex-interactive" : "tikz-latex-foreign"} tikz-latex-anchor-${anchor}`}
    >
      <div xmlns="http://www.w3.org/1999/xhtml" className="tikz-latex-label">
        <RichContent html={escapeHtml(value || " ")} enableMathCopy={false} />
      </div>
    </foreignObject>
  );
}

function MathLabel({ value }) {
  return (
    <span className="tikz-math-label">
      <RichContent as="span" html={escapeHtml(value)} enableMathCopy={false} />
    </span>
  );
}

function ButtonMathLabel({ value }) {
  const content = value || "";
  const hasMath = content.includes("$") || content.includes("\\(") || content.includes("\\[");
  if (!hasMath) {
    return <span className="tikz-button-math-label">{content}</span>;
  }
  return (
    <span className="tikz-button-math-label">
      <RichContent as="span" html={escapeHtml(content)} enableMathCopy={false} />
    </span>
  );
}

function FieldLabel({ math, text }) {
  return (
    <span className="tikz-field-label-content">
      {math ? <MathLabel value={math} /> : null}
      {text ? <span>{text}</span> : null}
    </span>
  );
}

function ArrowPicker({ value, onChange }) {
  return (
    <div className="tikz-arrow-picker" role="group" aria-label="Flèche du segment">
      {ARROW_OPTIONS.map((option) => (
        <button
          type="button"
          key={option.value}
          className={value === option.value ? "tikz-arrow-option tikz-arrow-option-active" : "tikz-arrow-option"}
          onClick={() => onChange(option.value)}
        >
          <MathLabel value={option.label} />
        </button>
      ))}
    </div>
  );
}

function MarkPicker({ value, onChange }) {
  return (
    <div className="tikz-mark-picker" role="group" aria-label="Marques au milieu du segment">
      {SEGMENT_MARK_OPTIONS.map((option) => (
        <button
          type="button"
          key={option.value}
          className={value === option.value ? "tikz-arrow-option tikz-arrow-option-active" : "tikz-arrow-option"}
          onClick={() => onChange(option.value)}
        >
          <MathLabel value={option.label} />
        </button>
      ))}
    </div>
  );
}

function MarkPositionPicker({ value, onChange, labels }) {
  return (
    <div className="tikz-mark-position-picker" role="group" aria-label={labels.midMarkPosition}>
      {SEGMENT_MARK_POSITIONS.map((option) => (
        <button
          type="button"
          key={option.value}
          className={value === option.value ? "tikz-arrow-option tikz-arrow-option-active" : "tikz-arrow-option"}
          onClick={() => onChange(option.value)}
        >
          {labels[option.key]}
        </button>
      ))}
    </div>
  );
}

function ShapeView({ shape, selected, tool, startDrag, selectObject, routeObjectClickToCanvas }) {
  const className = `tikz-shape ${shape.dashed ? "tikz-dashed" : ""} ${selected ? "tikz-object-selected" : ""}`;
  const common = {
    className,
    style: shape.hatched ? { fill: "url(#tikz-hatch)" } : undefined,
    onClick: (event) => {
      event.stopPropagation();
      if (tool !== "select") {
        routeObjectClickToCanvas(event);
        return;
      }
      selectObject("shape", shape.id);
    },
    onPointerDown: (event) => {
      if (tool === "select") {
        startDrag(event, "shape", shape.id);
        return;
      }
      event.stopPropagation();
    },
  };

  if (shape.type === "rectangle") {
    const a = toScreen(shape.a);
    const b = toScreen(shape.b);
    return <rect {...common} x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)} width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)} />;
  }

  const center = toScreen(shape.center);
  if (shape.type === "circle") {
    return <circle {...common} cx={center.x} cy={center.y} r={shape.radius * SCALE} />;
  }

  return <ellipse {...common} cx={center.x} cy={center.y} rx={shape.rx * SCALE} ry={shape.ry * SCALE} />;
}

function ObjectEditor({ selection, selectionGroup, object, updateSelected, updateSelectedStyle, deleteSelected, segments, status, labels }) {
  const e = labels.editor || {};
  const p = labels.positions || {};

  if (selectionGroup.length > 0) {
    return (
      <div className="tikz-empty-editor">
        <div className="tikz-selected-head">
          <p className="tikz-label">{selectionGroup.length} {e.selectedMany}</p>
          <button type="button" className="tikz-icon-danger" onClick={deleteSelected} aria-label={e.delete}>
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="tikz-muted">{e.selectedManyHelp}</p>
      </div>
    );
  }

  if (!selection || !object) {
    return (
      <div className="tikz-empty-editor">
        <p className="tikz-label">{e.modifications}</p>
        <p className="tikz-status">{status}</p>
        <p className="tikz-muted">{e.empty}</p>
      </div>
    );
  }

  return (
    <div className="tikz-control-block tikz-selected-card">
      <div className="tikz-selected-head">
        <span className="tikz-label">{editorTitle(selection.type, object, e)}</span>
        <button type="button" className="tikz-icon-danger" onClick={deleteSelected} aria-label={e.delete}>
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>

      {selection.type !== "text" && (
        <label className="tikz-check">
          <input type="checkbox" checked={Boolean(object.dashed)} onChange={(event) => updateSelectedStyle(event.target.checked)} />
          <span>{e.dashed}</span>
        </label>
      )}

      {selection.type === "shape" && (
        <label className="tikz-check">
          <input type="checkbox" checked={Boolean(object.hatched)} onChange={(event) => updateSelected({ hatched: event.target.checked })} />
          <span>{e.hatch}</span>
        </label>
      )}

      {selection.type === "point" && (
        <>
          <label className="tikz-field-label">
            {e.internalName}
            <input className="tikz-input" value={object.name} onChange={(event) => updateSelected({ name: event.target.value.replace(/\s/g, "") || object.name })} />
          </label>
          <label className="tikz-field-label">
            {e.latexLabel}
            <input className="tikz-input" value={object.label} onChange={(event) => updateSelected({ label: event.target.value })} />
          </label>
          <CoordInputs object={object} update={updateSelected} />
          <span className="tikz-field-label">{e.labelPosition}</span>
          <div className="tikz-position-grid">
            {POSITION_PRESETS.map((preset) => (
              <button type="button" key={preset.label} onClick={() => updateSelected({ labelDx: preset.dx, labelDy: preset.dy })}>
                {preset.label}
              </button>
            ))}
          </div>
        </>
      )}

      {selection.type === "text" && (
        <>
          <label className="tikz-field-label">
            {e.latexText}
            <input className="tikz-input" value={object.text} onChange={(event) => updateSelected({ text: event.target.value })} autoFocus />
          </label>
          <CoordInputs object={object} update={updateSelected} />
        </>
      )}

      {selection.type === "segment" && (
        <>
          <label className="tikz-field-label">
            {e.segmentText}
            <input className="tikz-input" value={object.label || ""} onChange={(event) => updateSelected({ label: event.target.value })} placeholder="$AB$" />
          </label>
          {object.label && (
            <>
              <div className="tikz-two-cols">
                <label className="tikz-field-label">
                  {e.position}
                  <select className="tikz-select" value={object.labelPosition || "midway"} onChange={(event) => updateSelected({ labelPosition: event.target.value })}>
                    {SEGMENT_LABEL_POSITIONS.map((value) => (
                      <option key={value} value={value}>{positionLabel(value, p)}</option>
                    ))}
                  </select>
                </label>
                <label className="tikz-field-label">
                  {e.side}
                  <select className="tikz-select" value={object.labelSide || "above"} onChange={(event) => updateSelected({ labelSide: event.target.value })}>
                    {SEGMENT_LABEL_SIDES.map((value) => (
                      <option key={value} value={value}>{positionLabel(value, p)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="tikz-two-cols">
                <label className="tikz-field-label">
                  <FieldLabel math="$x$" text="shift" />
                  <input className="tikz-input" type="number" step="0.1" value={object.labelXShift || 0} onChange={(event) => updateSelected({ labelXShift: Number(event.target.value) })} />
                </label>
                <label className="tikz-field-label">
                  <FieldLabel math="$y$" text="shift" />
                  <input className="tikz-input" type="number" step="0.1" value={object.labelYShift || 0} onChange={(event) => updateSelected({ labelYShift: Number(event.target.value) })} />
                </label>
              </div>
              <p className="tikz-muted">{e.dragText}</p>
            </>
          )}
          <label className="tikz-field-label">
            {e.arrow}
            <ArrowPicker value={object.arrow || ""} onChange={(arrow) => updateSelected({ arrow })} />
          </label>
          <div className="tikz-two-cols">
            <label className="tikz-field-label">
              {e.bend}
              <select className="tikz-select" value={object.bendDirection || "none"} onChange={(event) => updateSelected({ bendDirection: event.target.value })}>
                <option value="none">{e.noBend}</option>
                <option value="left">{e.bendLeft}</option>
                <option value="right">{e.bendRight}</option>
              </select>
            </label>
            <label className="tikz-field-label">
              {e.bendAngle}
              <input className="tikz-input" type="number" min="5" max="80" step="5" value={object.bendAngle || 30} onChange={(event) => updateSelected({ bendAngle: Number(event.target.value) })} />
            </label>
          </div>
          <label className="tikz-check">
            <input type="checkbox" checked={Boolean(object.mirror)} onChange={(event) => updateSelected({ mirror: event.target.checked })} />
            <span>{e.mirror}</span>
          </label>
          <label className="tikz-field-label">
            {e.midMarks}
            <MarkPicker value={object.midMark || ""} onChange={(midMark) => updateSelected({ midMark })} />
          </label>
          {object.midMark && (
            <label className="tikz-field-label">
              {e.midMarkPosition}
              <MarkPositionPicker
                value={object.midMarkPosition || "midway"}
                onChange={(midMarkPosition) => updateSelected({ midMarkPosition })}
                labels={e}
              />
            </label>
          )}
          <PointPairInputs object={object} update={updateSelected} labels={e} />
        </>
      )}

      {selection.type === "shape" && <ShapeInputs object={object} update={updateSelected} labels={e} />}

      {selection.type === "angle" && (
        <>
          <label className="tikz-field-label">
            {e.latexLabel}
            <input className="tikz-input" value={object.label} onChange={(event) => updateSelected({ label: event.target.value })} />
          </label>
          <label className="tikz-field-label">
            {e.radius}
            <input className="tikz-input" type="number" step="0.1" value={object.radius} onChange={(event) => updateSelected({ radius: Number(event.target.value) })} />
          </label>
          <PointTripletInputs object={object} update={updateSelected} labels={e} />
        </>
      )}

      {selection.type === "perpendicular" && (
        <>
          <CoordInputs object={object.point} update={(point) => updateSelected({ point: { ...object.point, ...point } })} />
          <label className="tikz-field-label">
            {e.supportSegment}
            <select className="tikz-select" value={object.segmentId} onChange={(event) => updateSelected({ segmentId: event.target.value })}>
              {segments.map((segment, index) => (
                <option key={segment.id} value={segment.id}>{e.segment} {index + 1}</option>
              ))}
            </select>
          </label>
        </>
      )}
    </div>
  );
}

function positionLabel(value, labels) {
  const key = {
    midway: "middle",
    "near start": "start",
    "near end": "end",
    above: "above",
    below: "below",
    left: "left",
    right: "right",
  }[value];
  return labels[key] || value;
}

function editorTitle(type, object, labels) {
  if (type === "point") return object.name ? `${labels.point} ${object.name}` : labels.point;
  if (type === "text") return labels.text;
  if (type === "segment") return labels.segment;
  if (type === "shape") return object.type === "circle" ? labels.circle : object.type === "ellipse" ? labels.ellipse : labels.rectangle;
  if (type === "angle") return labels.angle;
  return labels.perpendicular;
}

function CoordInputs({ object, update }) {
  return (
    <div className="tikz-two-cols">
      <label className="tikz-field-label">
        <FieldLabel math="$x$" />
        <input className="tikz-input" type="number" step="0.1" value={object.x} onChange={(event) => update({ x: Number(event.target.value) })} />
      </label>
      <label className="tikz-field-label">
        <FieldLabel math="$y$" />
        <input className="tikz-input" type="number" step="0.1" value={object.y} onChange={(event) => update({ y: Number(event.target.value) })} />
      </label>
    </div>
  );
}

function PointPairInputs({ object, update, labels }) {
  return (
    <>
      <p className="tikz-muted">{labels.endpoint1}</p>
      <CoordInputs object={object.a} update={(patch) => update({ a: { ...object.a, ...patch } })} />
      <p className="tikz-muted">{labels.endpoint2}</p>
      <CoordInputs object={object.b} update={(patch) => update({ b: { ...object.b, ...patch } })} />
    </>
  );
}

function PointTripletInputs({ object, update, labels }) {
  return (
    <>
      <p className="tikz-muted">{labels.side1}</p>
      <CoordInputs object={object.a} update={(patch) => update({ a: { ...object.a, ...patch } })} />
      <p className="tikz-muted">{labels.vertex}</p>
      <CoordInputs object={object.vertex} update={(patch) => update({ vertex: { ...object.vertex, ...patch } })} />
      <p className="tikz-muted">{labels.side2}</p>
      <CoordInputs object={object.b} update={(patch) => update({ b: { ...object.b, ...patch } })} />
    </>
  );
}

function ShapeInputs({ object, update, labels }) {
  if (object.type === "rectangle") {
    return <PointPairInputs object={object} update={update} labels={labels} />;
  }

  if (object.type === "circle") {
    return (
      <>
        <p className="tikz-muted">{labels.center}</p>
        <CoordInputs object={object.center} update={(patch) => update({ center: { ...object.center, ...patch } })} />
        <label className="tikz-field-label">
          {labels.radius}
          <input className="tikz-input" type="number" step="0.1" value={object.radius} onChange={(event) => update({ radius: Math.max(0.1, Number(event.target.value)) })} />
        </label>
      </>
    );
  }

  return (
    <>
      <p className="tikz-muted">{labels.center}</p>
      <CoordInputs object={object.center} update={(patch) => update({ center: { ...object.center, ...patch } })} />
      <div className="tikz-two-cols">
        <label className="tikz-field-label">
          <FieldLabel math="$r_x$" />
          <input className="tikz-input" type="number" step="0.1" value={object.rx} onChange={(event) => update({ rx: Math.max(0.1, Number(event.target.value)) })} />
        </label>
        <label className="tikz-field-label">
          <FieldLabel math="$r_y$" />
          <input className="tikz-input" type="number" step="0.1" value={object.ry} onChange={(event) => update({ ry: Math.max(0.1, Number(event.target.value)) })} />
        </label>
      </div>
    </>
  );
}
