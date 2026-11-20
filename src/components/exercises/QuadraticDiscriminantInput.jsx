import { useId } from "react";
import { getQuadraticRootChoices } from "../../exercises/definitions/quadraticDiscriminant";
import { ChoiceInput, NegativeSignButton } from "./AnswerFields";
import MathRenderer from "./MathRenderer";

const text = {
  fr: {
    discriminant: "Le discriminant $\\Delta$ de $P$ est",
    count: "Dans $\\mathbb R$, le polynôme admet",
    countWithComplex: "Le polynôme admet",
    one: "Donner la racine réelle.", real: "Donner les deux racines réelles.", complex: "Donner les deux racines complexes.",
    integerExample: "ex. −4", rootExample: "ex. (1+sqrt(5))/2", complexExample: "ex. 1+i",
  },
  en: {
    discriminant: "The discriminant $\\Delta$ of $P$ is",
    count: "Over $\\mathbb R$, the polynomial has",
    countWithComplex: "The polynomial has",
    one: "Give the real root.", real: "Give the two real roots.", complex: "Give the two complex roots.",
    integerExample: "e.g. −4", rootExample: "e.g. (1+sqrt(5))/2", complexExample: "e.g. 1+i",
  },
};

export default function QuadraticDiscriminantInput({ question, value, onChange, onCheck, disabled, lang, labels, firstInputRef }) {
  const t = text[lang] ?? text.fr;
  const countId = useId();
  const discriminantId = useId();
  const enteringDiscriminant = value.stage === "discriminant";
  const enteringCount = value.stage === "root-count";
  const complex = value.count === "complex";
  const select = (count) => ({ ...value, count });
  return (
    <div className="exercise-quadratic-answer">
      <div className="exercise-quadratic-delta">
        <label htmlFor={discriminantId}><MathRenderer as="span" content={t.discriminant} /></label>
        <span className="exercise-signed-input">
          <input id={discriminantId} ref={enteringDiscriminant ? firstInputRef : undefined} className="exercise-text-input"
            value={value.discriminant} onChange={(event) => onChange({ ...value, discriminant: event.target.value })}
            readOnly={!enteringDiscriminant} disabled={disabled} autoComplete="off" inputMode="numeric" placeholder={t.integerExample} />
          {enteringDiscriminant && !disabled && <NegativeSignButton
            value={value.discriminant} onChange={(discriminant) => onChange({ ...value, discriminant })} labels={labels} />}
        </span>
      </div>
      {!enteringDiscriminant && (
        <div className={value.stage === "roots" ? "exercise-product-choice-locked" : undefined}>
          <p id={countId}><MathRenderer as="span" content={question.allowComplexRoots ? t.countWithComplex : t.count} /></p>
          <ChoiceInput options={getQuadraticRootChoices(question.allowComplexRoots)} value={value.count} lang={lang} labelledBy={countId}
            firstInputRef={enteringCount ? firstInputRef : undefined} disabled={disabled || !enteringCount}
            onChange={(count) => onChange(select(count))} onChoose={(count) => onCheck(select(count))} onCommit={() => onCheck(value)} />
        </div>
      )}
      {value.stage === "roots" && (
        <div>
          <p>{complex ? t.complex : value.roots.length === 1 ? t.one : t.real}</p>
          <div className="exercise-quadratic-root-fields">
            {value.roots.map((root, index) => {
              const name = value.roots.length === 1 ? "x" : `${complex ? "z" : "x"}_${index + 1}`;
              return (
                <label key={name}>
                  <MathRenderer as="span" content={`$${name}=$`} />
                  <input ref={index === 0 ? firstInputRef : undefined} className="exercise-text-input"
                    aria-label={name} value={root} disabled={disabled} autoComplete="off" spellCheck={false}
                    placeholder={complex ? t.complexExample : t.rootExample}
                    onChange={(event) => onChange({
                      ...value, roots: value.roots.map((entry, i) => i === index ? event.target.value : entry),
                    })} />
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
