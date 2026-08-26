export function resolveAnswerSpec(toolAnswer = {}, questionAnswer = {}) {
  const base = toolAnswer ?? {};
  const override = questionAnswer ?? {};
  const changesType = Object.prototype.hasOwnProperty.call(override, "type")
    && (override.type ?? "text") !== (base.type ?? "text");

  // Les options d'un type de réponse (validateur, placeholder, format, etc.)
  // ne doivent pas déborder sur un autre type choisi par une question.
  return changesType ? { ...override } : { ...base, ...override };
}

export default resolveAnswerSpec;
