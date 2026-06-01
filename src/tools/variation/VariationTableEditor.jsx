import { useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import RichContent from "../../components/RichContent";
import { escapeHtml } from "../tikz/figureModel";
import { ButtonMathLabel, MathLabel } from "../tikz/MathLabels";
import {
  VARIATION_ARROW_MODES,
  VARIATION_BARRIERS,
  VARIATION_POSITIONS,
  VARIATION_ROW_TYPES,
  getVariationArrow,
  variationArrowEndpointLevels,
} from "../../utils/variationTable";

export default function VariationTableEditor({
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

