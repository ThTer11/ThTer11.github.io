import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import MathRenderer from "./MathRenderer";
import AugmentedSystemInput, { emptyAugmentedAnswer } from "./AugmentedSystemInput";
import { localize } from "../../exercises/core/localize";
import { emptySpectralAnswer } from "../../exercises/definitions/diagonalisation";
import { systemToLatex } from "../../utils/gauss";
import "./matrix-inversion.css";
import DiagonalisationInput from "./DiagonalisationInput";
import { ChoiceInput, MatrixInput, NegativeSignButton, FractionSeparatorButton, SystemBrace } from "./AnswerFields";

export function emptyAnswerValue(spec = {}, question = {}) {
  const type = spec.type ?? "text";

  if (["matrix-writing", "row-reduction", "parameter-system"].includes(type)) return emptyAugmentedAnswer(type, question);

  if (type === "matrix-product") {
    return { defined: question.symbolic ? "possible" : "", stage: question.symbolic ? "dimensions" : "compatibility", size: ["", ""], matrix: [] };
  }

  if (type === "matrix-inversion") {
    if (question.rowWorkspace) {
      return {
        stage: "invertibility", invertibility: "",
        workspace: emptyAugmentedAnswer(type, question),
      };
    }
    return question.unknowns
      ? { stage: "system", system: question.initialMatrix.map((row) => row.map(() => "")) }
      : { stage: "determinant", determinant: "", invertibility: "" };
  }
  if (type === "matrix-diagonalisation") return emptySpectralAnswer(question);

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
    {stage === "matrix" && <MatrixInput prefix={question.product} value={value.matrix}
      onChange={(matrix) => onChange({ ...value, matrix })} disabled={disabled} labels={labels}
      allowExpressions={question.symbolic} firstInputRef={firstInputRef} />}
  </div>;
}

function AssociatedSystemInput({ system, question, onChange, disabled, labels, firstInputRef }) {
  const [active, setActive] = useState([0, 0]);
  const [activeRow, activeColumn] = active;
  const update = (row, column, value) => onChange(system.map((entries, i) =>
    i === row ? entries.map((entry, j) => j === column ? value : entry) : entries));

  return (
    <fieldset className="exercise-inversion-system-fields">
      <legend>{labels.matrixCompleteSystem}</legend>
      <div className="exercise-inversion-equations">
        <SystemBrace />
        {system.map((row, i) => <Fragment key={i}>
          {row.map((entry, j) => <div key={j} className="exercise-inversion-term">
            {j > 0 && <span aria-hidden="true">+</span>}
            <label>
              <input
                ref={i === 0 && j === 0 ? firstInputRef : undefined}
                type="text"
                inputMode="numeric"
                className="exercise-matrix-cell"
                aria-label={`${labels.matrixRow} ${i + 1}, ${question.unknowns[j]}`}
                autoComplete="off"
                spellCheck="false"
                value={entry}
                disabled={disabled}
                onFocus={() => setActive([i, j])}
                onChange={(event) => update(i, j, event.target.value)}
              />
              <MathRenderer as="span" content={`$${question.unknowns[j]}$`} responsiveMath={false} />
            </label>
          </div>)}
          <MathRenderer as="span" className="exercise-inversion-rhs"
            content={`$= ${question.rightHandSides[i]}$`} responsiveMath={false} />
        </Fragment>)}
      </div>
      <div className="exercise-numeric-symbols">
        <NegativeSignButton value={system[activeRow][activeColumn]}
          onChange={(entry) => update(activeRow, activeColumn, entry)} disabled={disabled} labels={labels} />
      </div>
    </fieldset>
  );
}

function MatrixInvertibilityChoice({ value, onChange, onCommit, onCheck, disabled, locked, labels, lang, firstInputRef }) {
  const choiceLabelId = useId();
  return (
    <>
      <p className="exercise-inversion-question" id={choiceLabelId}>
        <MathRenderer as="span" content={labels.matrixInvertibility} />
      </p>
      <div className={locked ? "exercise-inversion-choices exercise-product-choice-locked" : "exercise-inversion-choices"}>
        <ChoiceInput
          options={[{ id: "invertible", label: labels.matrixInvertible }, { id: "singular", label: labels.matrixSingular }]}
          value={value.invertibility}
          onChange={(invertibility) => onChange({ ...value, invertibility })}
          onChoose={onCheck ? (invertibility) => onCheck({ ...value, invertibility }) : undefined}
          onCommit={onCheck ? () => onCheck(value) : onCommit}
          disabled={disabled || locked}
          lang={lang}
          firstInputRef={firstInputRef}
          labelledBy={choiceLabelId}
        />
      </div>
    </>
  );
}

function MatrixInversionInput({ spec, value, question, onChange, onCheck, onCommit, disabled, labels, lang, firstInputRef, focusKey }) {
  const hasSystem = Boolean(question.unknowns);
  const enteringInverse = value.stage === "inverse";
  if (value.stage === "system") {
    return <AssociatedSystemInput key={focusKey} system={value.system} question={question} disabled={disabled}
      onChange={(system) => onChange({ ...value, system })} labels={labels} firstInputRef={firstInputRef} />;
  }
  const inverseInput = enteringInverse && (
    <MatrixInput prefix="A^{-1}" value={value.matrix} onChange={(matrix) => onChange({ ...value, matrix })}
      disabled={disabled} labels={labels} firstInputRef={firstInputRef} allowFractions />
  );
  if (enteringInverse && hasSystem) return inverseInput;

  if (value.workspace) {
    return (
      <>
        <AugmentedSystemInput key={focusKey} spec={spec} question={question} value={value.workspace}
          onChange={(workspace) => onChange({ ...value, workspace })} disabled={disabled || enteringInverse} lang={lang} />
        {enteringInverse ? inverseInput : (
          <div className="exercise-inversion-decision">
            <MatrixInvertibilityChoice value={value} onChange={onChange} onCheck={onCheck}
              disabled={disabled} labels={labels} lang={lang} />
          </div>
        )}
      </>
    );
  }
  return (
    <>
      {hasSystem && <MathRenderer className="exercise-inversion-completed-system"
        content={systemToLatex(question.initialMatrix, question.unknowns, question.rightHandSides)} />}
      <div className="exercise-inversion-decision">
        {!hasSystem && (
          <div className="exercise-inversion-determinant-control">
            <label className="exercise-inversion-determinant-field">
              <MathRenderer as="span" content={"$\\det(A)=$"} responsiveMath={false} />
              <input ref={!enteringInverse ? firstInputRef : undefined} className="exercise-text-input" value={value.determinant}
                inputMode="numeric" autoComplete="off" spellCheck="false" disabled={disabled}
                readOnly={enteringInverse} tabIndex={enteringInverse ? -1 : undefined}
                onChange={(event) => onChange({ ...value, determinant: event.target.value })} />
            </label>
            {!enteringInverse && (
              <div className="exercise-numeric-symbols">
                <NegativeSignButton value={value.determinant} onChange={(determinant) => onChange({ ...value, determinant })}
                  labels={labels} disabled={disabled} />
              </div>
            )}
          </div>
        )}
        <MatrixInvertibilityChoice value={value} onChange={onChange} onCommit={onCommit}
          disabled={disabled} locked={enteringInverse} labels={labels} lang={lang}
          firstInputRef={hasSystem ? firstInputRef : undefined} />
      </div>
      {inverseInput}
    </>
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

  if (["matrix-writing", "row-reduction", "parameter-system"].includes(type)) {
    return <AugmentedSystemInput key={focusKey} spec={spec} question={question} value={value} onChange={onChange} onCheck={onCheck} disabled={disabled} lang={lang} />;
  }

  if (type === "matrix-product") {
    return <MatrixProductInput value={value} onChange={onChange} onCheck={onCheck} disabled={disabled}
      labels={labels} lang={lang} question={question} firstInputRef={firstInputRef} />;
  }

  if (type === "matrix-inversion") {
    return (
      <div className={`exercise-inversion-answer exercise-inversion-${value.stage}${value.workspace ? " exercise-inversion-gauss" : ""}`}
        data-matrix-size={question.augmentedSplit}>
        <MatrixInversionInput spec={spec} value={value} question={question} onChange={onChange} onCheck={onCheck} onCommit={onCommit}
          disabled={disabled} labels={labels} lang={lang} focusKey={focusKey} firstInputRef={firstInputRef} />
      </div>
    );
  }

  if (type === "matrix-diagonalisation") {
    return <DiagonalisationInput key={focusKey} question={question} value={value} onChange={onChange} onCheck={onCheck}
      disabled={disabled} lang={lang} labels={labels} firstInputRef={firstInputRef} />;
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
  const prefix = localize(question.answer?.prefix ?? spec.prefix, lang);
  const example = { integer: "12", decimal: "2.5", fraction: "3/4" }[type] ?? "2*x + 3";
  const placeholder = localize(spec.placeholder, lang) || (type === "solution-set"
    ? labels.solutionSetPlaceholder
    : `${lang === "en" ? "e.g." : "ex."} ${example}`);

  return (
    <label className="exercise-field-label">
      <span>{labels.answer}</span>
      <div className={`exercise-answer-control${prefix ? " exercise-answer-control-prefixed" : ""}`} aria-disabled={disabled || undefined}>
        {prefix && <MathRenderer as="span" className="exercise-answer-prefix" content={`$${prefix}=$`} responsiveMath={false} />}
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
              placeholder={placeholder}
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
            placeholder={placeholder}
          />
        )}
      </div>
    </label>
  );
}
