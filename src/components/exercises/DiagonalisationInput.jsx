import { Fragment, useEffect, useId, useRef, useState } from "react";
import MathRenderer from "./MathRenderer";
import { ChoiceInput, MatrixInput, NegativeSignButton, FractionSeparatorButton, SystemBrace } from "./AnswerFields";
import "./diagonalisation.css";

const SPECTRAL_LABELS = {
  fr: {
    decision: "Le vecteur $v$ est-il un vecteur propre de $A$ ?", yes: "Oui", no: "Non",
    eigenvalue: "La valeur propre associée est :", eigenvalues: "Les valeurs propres de $A$ sont :",
    roots: "Les valeurs propres de $A$ sont donc :", polynomial: "Le polynôme caractéristique de $A$ est",
    system: "Le système à résoudre est :", solution: "Une solution non nulle est :",
    vector: "Un vecteur propre possible est :", eigenpair: "Pour", and: "et",
    listExample: "ex. 2, 3", linearCoefficient: "Coefficient de λ", constantCoefficient: "Terme constant",
    insertComma: "Insérer une virgule", insertMinus: "Insérer un signe moins",
    powerDecomposition: "On a $A=PDP^{-1}$ avec",
    powerFormula: "On sait alors, d’après le cours, que $A^n=PD^nP^{-1}$. On obtient donc :",
    powerExample: "ex. 2^n-1",
    recurrenceMatrix: "On pose $X_n=\\begin{pmatrix}u_n\\\\v_n\\end{pmatrix}$. La matrice $A\\in\\mathcal M_2(\\mathbb R)$ telle que $X_{n+1}=AX_n$ est",
    recurrenceDecomposition: "On sait que pour tout $n\\in\\mathbb N$, $X_n=A^nX_0$. Déterminons $A^n$ en diagonalisant $A$. Les matrices $P$ inversible et $D$ diagonale telles que $A=PDP^{-1}$ sont",
    recurrencePower: "La matrice $A^n$ est donc :",
    recurrenceSequences: "Les suites $(u_n)_{n\\in\\mathbb N}$ et $(v_n)_{n\\in\\mathbb N}$ sont donc :",
  },
  en: {
    decision: "Is $v$ an eigenvector of $A$?", yes: "Yes", no: "No",
    eigenvalue: "The corresponding eigenvalue is:", eigenvalues: "The eigenvalues of $A$ are:",
    roots: "The eigenvalues of $A$ are therefore:", polynomial: "The characteristic polynomial of $A$ is",
    system: "Solve the system:", solution: "One nonzero solution of the system is:",
    vector: "One possible eigenvector is:", eigenpair: "For", and: "and",
    listExample: "e.g. 2, 3", linearCoefficient: "Coefficient of λ", constantCoefficient: "Constant term",
    insertComma: "Insert a comma", insertMinus: "Insert a minus sign",
    powerDecomposition: "We have $A=PDP^{-1}$ with",
    powerFormula: "From the course we know that $A^n=PD^nP^{-1}$. This gives:",
    powerExample: "e.g. 2^n-1",
    recurrenceMatrix: "Let $X_n=\\begin{pmatrix}u_n\\\\v_n\\end{pmatrix}$. The matrix $A\\in\\mathcal M_2(\\mathbb R)$ such that $X_{n+1}=AX_n$ is",
    recurrenceDecomposition: "We know that for every $n\\in\\mathbb N$, $X_n=A^nX_0$. Find $A^n$ by diagonalising $A$. The invertible matrix $P$ and the diagonal matrix $D$ such that $A=PDP^{-1}$ are",
    recurrencePower: "The matrix $A^n$ is therefore:",
    recurrenceSequences: "The sequences $(u_n)_{n\\in\\mathbb N}$ and $(v_n)_{n\\in\\mathbb N}$ are therefore:",
  },
};

function SpectralSymbolButton({ symbol, label, onClick, disabled }) {
  return (
    <button type="button" className="exercise-negative-sign" disabled={disabled} aria-label={label}
      onMouseDown={(event) => event.preventDefault()} onClick={onClick}>{symbol}</button>
  );
}

function SpectralField({ kind, label, value, onChange, disabled, locked, text, labels, firstInputRef }) {
  const id = useId();
  const list = kind === "list";
  const append = (symbol) => onChange(value + symbol);
  return (
    <div className="exercise-spectral-field">
      <label htmlFor={id}><MathRenderer as="span" content={label} /></label>
      <div className="exercise-spectral-field-row">
        <div className="exercise-signed-input">
          <input id={id} ref={firstInputRef} className="exercise-text-input" value={value} disabled={disabled}
            readOnly={locked} tabIndex={locked ? -1 : undefined} inputMode="numeric"
            autoComplete="off" spellCheck="false"
            placeholder={list ? text.listExample : undefined}
            onChange={(event) => onChange(event.target.value)} />
          {!locked && (
            <div className="exercise-numeric-symbols">
              {list ? (
                <>
                  <SpectralSymbolButton symbol="−" label={text.insertMinus} onClick={() => append("-")} disabled={disabled} />
                  <SpectralSymbolButton symbol="," label={text.insertComma} onClick={() => append(", ")} disabled={disabled} />
                </>
              ) : (
                <>
                  <NegativeSignButton value={value} onChange={onChange} disabled={disabled} labels={labels} />
                  <FractionSeparatorButton value={value} onChange={onChange} disabled={disabled} labels={labels} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CharacteristicFields({ coefficients, onChange, disabled, locked, text, labels, firstInputRef }) {
  const [active, setActive] = useState(0);
  const update = (index, value) => onChange(coefficients.map((entry, i) => i === index ? value : entry));
  return (
    <div className="exercise-spectral-field">
      <MathRenderer as="p" className="exercise-spectral-polynomial-label" content={text.polynomial} />
      <div className="exercise-spectral-polynomial">
        <MathRenderer as="span" className="exercise-spectral-polynomial-prefix"
          content={"$\\chi_A(\\lambda)=\\det(\\lambda I_2-A)=$"} responsiveMath={false} />
        <div className="exercise-spectral-polynomial-terms" role="group" aria-label={text.polynomial.replace("$A$", "A")}>
          {[text.linearCoefficient, text.constantCoefficient].map((label, i) => (
            <Fragment key={i}>
              <MathRenderer as="span" content={i === 0 ? "$\\lambda^2+$" : "$\\lambda+$"} responsiveMath={false} />
              <input ref={i === 0 ? firstInputRef : undefined} className="exercise-text-input" value={coefficients[i]}
                inputMode="numeric" autoComplete="off" spellCheck="false" aria-label={label}
                readOnly={locked} tabIndex={locked ? -1 : undefined} disabled={disabled}
                onFocus={() => setActive(i)} onChange={(event) => update(i, event.target.value)} />
            </Fragment>
          ))}
          {!locked && (
            <div className="exercise-numeric-symbols">
              <NegativeSignButton value={coefficients[active]} onChange={(value) => update(active, value)}
                disabled={disabled} labels={labels} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function replaceCell(matrix, row, column, value) {
  return matrix.map((entries, i) =>
    i === row ? entries.map((entry, j) => j === column ? value : entry) : entries);
}

function SpectralSystem({ system, onChange, onFocusCell, disabled, labels, firstInputRef }) {
  return (
    <div className="exercise-spectral-equations">
      <SystemBrace />
      {system.map((row, i) => row.map((entry, j) => (
        <Fragment key={`${i}-${j}`}>
          <input className="exercise-matrix-cell" value={entry}
            ref={i === 0 && j === 0 ? firstInputRef : undefined}
            disabled={disabled} inputMode="numeric" autoComplete="off" spellCheck="false"
            aria-label={`${labels.matrixRow} ${i + 1}, ${labels.matrixColumn} ${j + 1}`}
            onFocus={() => onFocusCell(i, j)}
            onChange={(event) => onChange(replaceCell(system, i, j, event.target.value))} />
          {j < 2 && <MathRenderer as="span" content={j === 0 ? "$x+$" : "$y=$"} responsiveMath={false} />}
        </Fragment>
      )))}
    </div>
  );
}

function SpectralPair({ root, system, vector, onSystemChange, onVectorChange, disabled, text, labels, firstInputRef }) {
  const [active, setActive] = useState({ field: "system", row: 0, column: 0 });
  const { field, row, column } = active;
  const activeMatrix = field === "system" ? system : vector;
  const changeActive = (entry) => {
    const changed = replaceCell(activeMatrix, row, column, entry);
    if (field === "system") onSystemChange(changed);
    else onVectorChange(changed);
  };

  return (
    <section className="exercise-spectral-pair">
      <MathRenderer as="h4" content={`${text.eigenpair} $\\lambda=${root}$`} />
      {system && (
        <>
          <p>{text.system}</p>
          <SpectralSystem system={system} disabled={disabled} labels={labels} firstInputRef={firstInputRef}
            onFocusCell={(row, column) => setActive({ field: "system", row, column })} onChange={onSystemChange} />
          <div className="exercise-numeric-symbols">
            <NegativeSignButton value={activeMatrix[row][column]} onChange={changeActive} disabled={disabled} labels={labels} />
            <FractionSeparatorButton value={activeMatrix[row][column]} onChange={changeActive} disabled={disabled} labels={labels} />
          </div>
        </>
      )}
      <p>{system ? text.solution : text.vector}</p>
      <MatrixInput value={vector} labels={labels} allowFractions disabled={disabled}
        firstInputRef={system ? undefined : firstInputRef} showNumericSymbols={!system}
        onFocusCell={system ? (row, column) => setActive({ field: "vector", row, column }) : undefined}
        onChange={onVectorChange} />
    </section>
  );
}

function DecompositionFields({ value, change, text, labels, disabled, firstInputRef }) {
  return (
    <div className="exercise-spectral-decomposition">
      <MatrixInput prefix="P" value={value.P} onChange={(matrix) => change("P", matrix)}
        labels={labels} allowFractions disabled={disabled} showNumericSymbols={!disabled} firstInputRef={firstInputRef} />
      <span className="exercise-spectral-and">{text.and}</span>
      <MatrixInput prefix="D" value={value.D} onChange={(matrix) => change("D", matrix)}
        labels={labels} allowFractions disabled={disabled} showNumericSymbols={!disabled} />
    </div>
  );
}

export default function DiagonalisationInput({ question, value, onChange, onCheck, disabled, lang, labels, firstInputRef }) {
  const text = SPECTRAL_LABELS[lang] ?? SPECTRAL_LABELS.fr;
  const choiceLabelId = useId();
  const change = (field, input) => onChange({ ...value, [field]: input });
  const changeAt = (field, index, input) => change(field, value[field].map((entry, i) => i === index ? input : entry));
  const stage = value.stage;
  const sequenceFieldsRef = useRef(null);
  useEffect(() => {
    if (stage === "recurrence-sequences") {
      sequenceFieldsRef.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    }
  }, [stage]);
  const recognition = question.spectralTask === "recognition";
  const characteristicTask = question.spectralTask === "eigenvalues";
  const lockedVectors = stage === "diagonalization";
  const fieldProps = { disabled, text, labels };
  const recurrence = question.spectralTask === "recurrence";
  if (question.spectralTask === "power" || recurrence) {
    const matrixStage = stage === "recurrence-matrix";
    const decompositionStage = stage === "power-decomposition";
    const powerStage = stage === "matrix-power";
    return (
      <div className={`exercise-spectral-answer exercise-spectral-power${recurrence ? " exercise-spectral-recurrence" : ""}`}>
        {recurrence && (
          <>
            <MathRenderer as="p" content={text.recurrenceMatrix} />
            <MatrixInput prefix="A" value={value.A} onChange={(matrix) => change("A", matrix)}
              labels={labels} allowFractions disabled={disabled || !matrixStage}
              firstInputRef={matrixStage ? firstInputRef : undefined} showNumericSymbols={matrixStage && !disabled} />
          </>
        )}
        {!matrixStage && (
          <>
            <MathRenderer as="p" content={recurrence ? text.recurrenceDecomposition : text.powerDecomposition} />
            <DecompositionFields value={value} change={change} text={text} labels={labels}
              disabled={disabled || !decompositionStage} firstInputRef={decompositionStage ? firstInputRef : undefined} />
          </>
        )}
        {value.power && (
          <>
            <MathRenderer as="p" content={recurrence ? text.recurrencePower : text.powerFormula} />
            <MatrixInput prefix="A^n" value={value.power} onChange={(matrix) => change("power", matrix)}
              labels={labels} allowExpressions disabled={disabled || !powerStage}
              firstInputRef={powerStage ? firstInputRef : undefined}
              example={text.powerExample} showNumericSymbols={false} />
          </>
        )}
        {stage === "recurrence-sequences" && (
          <>
            <MathRenderer as="p" content={text.recurrenceSequences} />
            <div className="exercise-spectral-sequence-fields" ref={sequenceFieldsRef}>
              {["u_n", "v_n"].map((sequence, index) => (
                <label key={sequence}>
                  <MathRenderer as="span" content={`$${sequence}=$`} />
                  <input ref={index === 0 ? firstInputRef : undefined} className="exercise-text-input"
                    aria-label={index === 0 ? "uₙ" : "vₙ"} value={value.sequences[index]}
                    onChange={(event) => changeAt("sequences", index, event.target.value)} disabled={disabled}
                    placeholder={text.powerExample} autoComplete="off" spellCheck={false} />
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="exercise-spectral-answer">
      {recognition ? (
        <>
          <div className={`exercise-spectral-decision${stage === "eigenvalue" ? " exercise-product-choice-locked" : ""}`}>
            <p id={choiceLabelId}><MathRenderer as="span" content={text.decision} /></p>
            <ChoiceInput options={[{ id: "yes", label: text.yes }, { id: "no", label: text.no }]}
              value={value.decision} onChange={(decision) => change("decision", decision)}
              onChoose={(decision) => onCheck({ ...value, decision })} onCommit={() => onCheck(value)}
              disabled={disabled || stage !== "recognition"} lang={lang} labelledBy={choiceLabelId}
              firstInputRef={stage === "recognition" ? firstInputRef : undefined} />
          </div>
          {stage === "eigenvalue" && (
            <SpectralField kind="number" label={text.eigenvalue} value={value.eigenvalue} firstInputRef={firstInputRef}
              onChange={(entry) => change("eigenvalue", entry)} {...fieldProps} />
          )}
        </>
      ) : (
        <>
          {characteristicTask && (
            <CharacteristicFields coefficients={value.polynomialCoefficients}
              locked={stage !== "polynomial"} firstInputRef={stage === "polynomial" ? firstInputRef : undefined}
              onChange={(entries) => change("polynomialCoefficients", entries)} {...fieldProps} />
          )}
          {stage !== "polynomial" && (
            <SpectralField kind="list" label={characteristicTask ? text.roots : text.eigenvalues} value={value.eigenvalues}
              locked={stage !== "eigenvalues"} firstInputRef={stage === "eigenvalues" ? firstInputRef : undefined}
              onChange={(entry) => change("eigenvalues", entry)} {...fieldProps} />
          )}
          {value.orderedEigenvalues && (
            <div className="exercise-spectral-pairs">
              {value.orderedEigenvalues.map((root, i) => (
                <SpectralPair key={root} root={root} system={value.systems?.[i]} vector={value.vectors[i]}
                  disabled={disabled || lockedVectors} text={text} labels={labels}
                  firstInputRef={!lockedVectors && i === 0 ? firstInputRef : undefined}
                  onSystemChange={(system) => changeAt("systems", i, system)}
                  onVectorChange={(vector) => changeAt("vectors", i, vector)} />
              ))}
            </div>
          )}
          {lockedVectors && (
            <DecompositionFields value={value} change={change} text={text} labels={labels}
              disabled={disabled} firstInputRef={firstInputRef} />
          )}
        </>
      )}
    </div>
  );
}
