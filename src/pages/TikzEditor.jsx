import { useEffect, useMemo, useState } from "react";
import NavBar from "../components/NavBar";
import { useLang } from "../App";
import RichContent from "../components/RichContent";
import {
  addVariationColumn,
  buildVariationTikz,
  createExampleVariationTable,
  createBlankVariationTable,
  createVariationRow,
  moveVariationRow,
  removeVariationColumn,
  syncVariationTable,
} from "../utils/variationTable";
import {
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  CursorArrowRaysIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import "../showcase.css";
import "../tikz-editor.css";
import VariationTableEditor from "../tools/variation/VariationTableEditor";
import { ButtonMathLabel, MathLabel } from "../tools/tikz/MathLabels";
import {
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
} from "../tools/tikz/figureModel";

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
