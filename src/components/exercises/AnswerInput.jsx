import { useEffect, useMemo, useRef, useState } from "react";
import MathRenderer from "./MathRenderer";
import { localize } from "../../exercises/core/localize";

export function emptyAnswerValue(spec = {}, question = {}) {
  const type = spec.type ?? "text";

  if (type === "matrix-product") {
    return { defined: question.symbolic ? "possible" : "", stage: question.symbolic ? "dimensions" : "compatibility", size: ["", ""], matrix: [] };
  }

  if (type === "matrix") {
    const dimensions = question.inputDimensions ?? spec.dimensions ?? [2, 2];
    return Array.from({ length: dimensions[0] }, () =>
      Array.from({ length: dimensions[1] }, () => ""));
  }

  if (type === "vector" || type === "coordinates") {
    const size = question.inputSize ?? spec.size ?? 2;
    return Array.from({ length: size }, () => "");
  }

  if (type === "multiple-fields" || type === "multi-field") {
    return Object.fromEntries(
      (question.fields ?? spec.fields ?? []).map((field) => [field.id, ""]),
    );
  }

  return "";
}

function ChoiceInput({ options, value, onChange, onCommit, disabled, lang, firstInputRef }) {
  return (
    <div className="exercise-choice-grid" role="radiogroup">
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
          onClick={() => onChange(option.id)}
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

function MatrixInput({ value, onChange, disabled, labels, firstInputRef, allowFractions, allowExpressions = false }) {
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
              onFocus={() => setActiveCell([rowIndex, columnIndex])}
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
    </div>
  );
}

function MatrixProductInput({ value, onChange, onCheck, disabled, labels, lang, question, firstInputRef }) {
  const text = lang === "en"
    ? { possible: "Product defined", impossible: "Product not defined", rows: "Rows", columns: "Columns", size: "Product size" }
    : { possible: "Produit défini", impossible: "Produit impossible", rows: "Lignes", columns: "Colonnes", size: "Taille du produit" };
  const stage = value.stage ?? "matrix";
  return <div className={`exercise-matrix-product-answer exercise-matrix-product-stage-${stage}`}>
    {!question.symbolic && <div className={stage !== "compatibility" ? "exercise-product-choice-locked" : undefined}><ChoiceInput
      options={["possible", "impossible"].map((id) => ({ id, label: text[id] }))}
      value={value.defined} onChange={(defined) => {
        const next = { ...value, defined };
        onChange(next);
        onCheck?.(next);
      }} onCommit={() => onCheck?.(value)} disabled={disabled || stage !== "compatibility"} lang={lang}
      firstInputRef={stage === "compatibility" ? firstInputRef : undefined} /></div>}
    {stage === "dimensions" && <fieldset className="exercise-product-dimensions">
      <legend>{text.size}</legend>
      <div className="exercise-product-dimensions-fields">
        {[text.rows, text.columns].map((label, index) => <label key={index}>
          <span>{label}</span>
          <input ref={index === 0 ? firstInputRef : undefined} className="exercise-text-input"
            inputMode="numeric" autoComplete="off" disabled={disabled} value={value.size[index]}
            onChange={(event) => onChange({ ...value, size: value.size.map((n, i) => i === index ? event.target.value : n) })} />
        </label>)}
      </div>
    </fieldset>}
    {stage === "matrix" && <MatrixInput value={value.matrix}
      onChange={(matrix) => onChange({ ...value, matrix })} disabled={disabled} labels={labels}
      allowExpressions={question.symbolic} firstInputRef={firstInputRef} />}
  </div>;
}

function toggleNegativeSign(value) {
  const current = String(value ?? "");
  return current.startsWith("-") ? current.slice(1) : `-${current}`;
}

function NegativeSignButton({ value, onChange, disabled, labels }) {
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

function FractionSeparatorButton({ value, onChange, disabled, labels }) {
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

function VectorInput({ value, onChange, disabled, labels, itemLabels = [], lang, firstInputRef }) {
  const update = (index, nextValue) => {
    const next = [...value];
    next[index] = nextValue;
    onChange(next);
  };

  return (
    <div className="exercise-vector-input" role="group" aria-label={labels.answer}>
      {value.map((cell, index) => (
        <label key={index} className="exercise-vector-cell">
          {itemLabels[index] && (
            <MathRenderer as="span" content={localize(itemLabels[index], lang)} />
          )}
          <input
            ref={index === 0 ? firstInputRef : undefined}
            className="exercise-matrix-cell"
            value={cell}
            onChange={(event) => update(index, event.target.value)}
            disabled={disabled}
            inputMode="numeric"
            aria-label={localize(itemLabels[index], lang) || `${labels.answer} ${index + 1}`}
          />
        </label>
      ))}
    </div>
  );
}

function MultipleFieldsInput({ fields, value, onChange, disabled, lang, labels, firstInputRef }) {
  return (
    <div className="exercise-multi-fields">
      {fields.map((field, index) => (
        <label key={field.id} className="exercise-field-label">
          <MathRenderer as="span" content={localize(field.label ?? field.id, lang)} />
          {field.answer?.type === "boolean" || field.answer?.type === "true-false" ? (
            <select
              ref={index === 0 ? firstInputRef : undefined}
              className="exercise-text-input"
              value={value[field.id] === "" ? "" : String(value[field.id])}
              onChange={(event) => onChange({
                ...value,
                [field.id]: event.target.value === "" ? "" : event.target.value === "true",
              })}
              disabled={disabled}
            >
              <option value="">—</option>
              <option value="true">{labels.true}</option>
              <option value="false">{labels.false}</option>
            </select>
          ) : field.answer?.type === "choice" ? (
            <select
              ref={index === 0 ? firstInputRef : undefined}
              className="exercise-text-input"
              value={value[field.id] ?? ""}
              onChange={(event) => onChange({ ...value, [field.id]: event.target.value })}
              disabled={disabled}
            >
              <option value="">—</option>
              {(field.options ?? field.answer.options ?? []).map((option) => (
                <option key={option.id} value={option.id}>{localize(option.label, lang)}</option>
              ))}
            </select>
          ) : ["integer", "fraction"].includes(field.answer?.type) ? (
            <div className="exercise-signed-input">
              <input
                ref={index === 0 ? firstInputRef : undefined}
                className="exercise-text-input"
                value={value[field.id] ?? ""}
                onChange={(event) => onChange({ ...value, [field.id]: event.target.value })}
                disabled={disabled}
                inputMode="numeric"
                autoComplete="off"
              />
              <div className="exercise-numeric-symbols">
                <NegativeSignButton
                  value={value[field.id]}
                  onChange={(nextValue) => onChange({ ...value, [field.id]: nextValue })}
                  disabled={disabled}
                  labels={labels}
                />
                {field.answer?.type === "fraction" && (
                  <FractionSeparatorButton
                    value={value[field.id]}
                    onChange={(nextValue) => onChange({ ...value, [field.id]: nextValue })}
                    disabled={disabled}
                    labels={labels}
                  />
                )}
              </div>
            </div>
          ) : (
            <input
              ref={index === 0 ? firstInputRef : undefined}
              className="exercise-text-input"
              value={value[field.id] ?? ""}
              onChange={(event) => onChange({ ...value, [field.id]: event.target.value })}
              disabled={disabled}
              inputMode={field.answer?.type === "integer" ? "numeric" : "text"}
              autoComplete="off"
            />
          )}
        </label>
      ))}
    </div>
  );
}

export default function AnswerInput({
  spec = {},
  question = {},
  value,
  onChange,
  disabled = false,
  lang = "fr",
  labels,
  focusKey,
  onCommit,
  onCheck,
}) {
  const firstInputRef = useRef(null);
  const type = spec.type ?? "text";
  const options = useMemo(() => question.options ?? spec.options ?? [], [question.options, spec.options]);

  useEffect(() => {
    if (!disabled) {
      const focusTimer = window.setTimeout(() => firstInputRef.current?.focus(), 20);
      return () => window.clearTimeout(focusTimer);
    }

    return undefined;
  }, [disabled, focusKey, value?.stage]);

  if (type === "matrix-product") {
    return <MatrixProductInput value={value} onChange={onChange} onCheck={onCheck} disabled={disabled}
      labels={labels} lang={lang} question={question} firstInputRef={firstInputRef} />;
  }

  if (type === "choice") {
    return <ChoiceInput options={options} value={value} onChange={onChange} onCommit={onCommit} disabled={disabled} lang={lang} firstInputRef={firstInputRef} />;
  }

  if (type === "boolean" || type === "true-false") {
    return (
      <ChoiceInput
        options={[
          { id: true, label: labels.true },
          { id: false, label: labels.false },
        ]}
        value={value}
        onChange={onChange}
        onCommit={onCommit}
        disabled={disabled}
        lang={lang}
        labels={labels}
        firstInputRef={firstInputRef}
      />
    );
  }

  if (type === "matrix") {
    return (
      <MatrixInput
        value={value}
        onChange={onChange}
        disabled={disabled}
        labels={labels}
        firstInputRef={firstInputRef}
        allowFractions={spec.elementType === "fraction"}
      />
    );
  }

  if (type === "vector" || type === "coordinates") {
    return (
      <VectorInput
        value={value}
        onChange={onChange}
        disabled={disabled}
        labels={labels}
        itemLabels={question.coordinateLabels ?? spec.labels ?? []}
        lang={lang}
        firstInputRef={firstInputRef}
      />
    );
  }

  if (type === "multiple-fields" || type === "multi-field") {
    return (
      <MultipleFieldsInput
        fields={question.fields ?? spec.fields ?? []}
        value={value}
        onChange={onChange}
        disabled={disabled}
        lang={lang}
        labels={labels}
        firstInputRef={firstInputRef}
      />
    );
  }

  const usesNumericSymbolBar = ["integer", "decimal", "fraction"].includes(type)
    && spec.allowNegative !== false;

  return (
    <label className="exercise-field-label">
      <span>{labels.answer}</span>
      {usesNumericSymbolBar ? (
        <div className="exercise-signed-input">
          <input
            ref={firstInputRef}
            className="exercise-text-input"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            inputMode={spec.inputMode ?? (type === "decimal" ? "decimal" : "numeric")}
            autoComplete="off"
            spellCheck="false"
            placeholder={localize(spec.placeholder, lang) || labels.answerPlaceholder}
          />
          <div className="exercise-numeric-symbols">
            <NegativeSignButton
              value={value}
              onChange={onChange}
              disabled={disabled}
              labels={labels}
            />
            {type === "fraction" && (
              <FractionSeparatorButton
                value={value}
                onChange={onChange}
                disabled={disabled}
                labels={labels}
              />
            )}
          </div>
        </div>
      ) : (
        <input
          ref={firstInputRef}
          className="exercise-text-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          inputMode={spec.inputMode ?? "text"}
          autoComplete="off"
          spellCheck="false"
          placeholder={localize(spec.placeholder, lang) || (type === "solution-set" ? labels.solutionSetPlaceholder : labels.answerPlaceholder)}
        />
      )}
    </label>
  );
}
