import { useState } from "react";
import MathRenderer from "./MathRenderer";
import { localize } from "../../exercises/core/localize";

export function ChoiceInput({ options, value, onChange, onChoose = onChange, onCommit, disabled, lang, firstInputRef, labelledBy }) {
  return (
    <div className="exercise-choice-grid" role="radiogroup" aria-labelledby={labelledBy}>
      {options.map((option, index) => (
        <button
          key={option.id}
          ref={index === 0 ? firstInputRef : undefined}
          type="button"
          role="radio"
          aria-checked={String(value) === String(option.id)}
          className={String(value) === String(option.id)
            ? "exercise-choice exercise-choice-selected"
            : "exercise-choice"}
          onClick={() => onChoose(option.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && String(value) === String(option.id)) {
              event.preventDefault();
              onCommit?.();
              return;
            }

            const direction = ["ArrowRight", "ArrowDown"].includes(event.key)
              ? 1
              : ["ArrowLeft", "ArrowUp"].includes(event.key)
                ? -1
                : 0;

            if (direction !== 0) {
              event.preventDefault();
              const nextIndex = (index + direction + options.length) % options.length;
              onChange(options[nextIndex].id);
              event.currentTarget.parentElement?.querySelectorAll("button")[nextIndex]?.focus();
            }
          }}
          disabled={disabled}
        >
          <MathRenderer as="span" content={localize(option.label, lang)} />
        </button>
      ))}
    </div>
  );
}

export function MatrixInput({
  value, onChange, disabled, labels, firstInputRef, allowFractions, allowExpressions = false, prefix,
  showNumericSymbols = true, onFocusCell, example,
}) {
  const [activeCell, setActiveCell] = useState([0, 0]);
  const update = (rowIndex, columnIndex, nextValue) => {
    const next = value.map((row) => [...row]);
    next[rowIndex][columnIndex] = nextValue;
    onChange(next);
  };

  const [activeRow, activeColumn] = activeCell;
  const activeValue = value[activeRow]?.[activeColumn] ?? "";

  return (
    <div className={`exercise-matrix-entry${allowExpressions ? " exercise-matrix-entry-symbolic" : ""}`} role="group" aria-label={labels.answer}>
      {prefix && <MathRenderer as="span" className="exercise-matrix-prefix" content={`$${prefix}=$`} responsiveMath={false} />}
      <div className="exercise-matrix-input">
        <div
          className="exercise-matrix-table"
          style={{ "--exercise-matrix-columns": value[0]?.length ?? 1 }}
        >
          {value.map((row, rowIndex) => row.map((cell, columnIndex) => (
            <input
              key={`${rowIndex}-${columnIndex}`}
              ref={rowIndex === 0 && columnIndex === 0 ? firstInputRef : undefined}
              className="exercise-matrix-cell"
              value={cell}
              placeholder={rowIndex === 0 && columnIndex === 0 ? example : undefined}
              onFocus={() => {
                setActiveCell([rowIndex, columnIndex]);
                onFocusCell?.(rowIndex, columnIndex);
              }}
              onChange={(event) => update(rowIndex, columnIndex, event.target.value)}
              disabled={disabled}
              inputMode={allowExpressions ? "text" : "numeric"}
              autoComplete="off"
              spellCheck="false"
              aria-label={`${labels.matrixRow} ${rowIndex + 1}, ${labels.matrixColumn} ${columnIndex + 1}`}
            />
          )))}
        </div>
      </div>
      {showNumericSymbols && (
        <div className="exercise-numeric-symbols">
          <NegativeSignButton
            value={activeValue}
            onChange={(nextValue) => update(activeRow, activeColumn, nextValue)}
            disabled={disabled}
            labels={labels}
          />
          {allowFractions && (
            <FractionSeparatorButton
              value={activeValue}
              onChange={(nextValue) => update(activeRow, activeColumn, nextValue)}
              disabled={disabled}
              labels={labels}
            />
          )}
        </div>
      )}
    </div>
  );
}

function toggleNegativeSign(value) {
  const current = String(value ?? "");
  return current.startsWith("-") ? current.slice(1) : `-${current}`;
}

export function NegativeSignButton({ value, onChange, disabled, labels }) {
  return (
    <button
      type="button"
      className="exercise-negative-sign"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onChange(toggleNegativeSign(value))}
      disabled={disabled}
      aria-label={labels.toggleNegative}
      title={labels.toggleNegative}
    >
      −
    </button>
  );
}

export function FractionSeparatorButton({ value, onChange, disabled, labels }) {
  return (
    <button
      type="button"
      className="exercise-negative-sign"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        const current = String(value ?? "");
        if (!current.includes("/")) onChange(`${current}/`);
      }}
      disabled={disabled}
      aria-label={labels.insertFractionBar}
      title={labels.insertFractionBar}
    >
      /
    </button>
  );
}

export function SystemBrace() {
  return (
    <svg className="exercise-inversion-brace" viewBox="0 0 18 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M17 1C8 1 9 11 9 26V37C9 45 6 50 1 50C6 50 9 55 9 63V74C9 89 8 99 17 99"
        fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
