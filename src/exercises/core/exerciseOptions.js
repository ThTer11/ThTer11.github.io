export const EXERCISE_COLOR_PALETTE = {
  blue: "#2563eb",
  sky: "#0284c7",
  emerald: "#059669",
  violet: "#7c3aed",
  rose: "#e11d48",
  orange: "#ea580c",
  gold: "#c58a08",
};

export function getExerciseVariants(tool = {}) {
  return tool.exercises ?? tool.difficulties ?? [];
}

export function normalizeExerciseLevels(variant = {}) {
  return (variant.levels ?? []).map((level, index) => {
    if (level && typeof level === "object") {
      const value = level.value ?? level.id ?? index + 1;
      return {
        ...level,
        id: String(level.id ?? value),
        value,
        label: level.label ?? String(value),
      };
    }

    return {
      id: String(level),
      value: level,
      label: String(level),
    };
  });
}

export function resolveExerciseVariantId(tool = {}) {
  const variants = getExerciseVariants(tool);
  return tool.defaultExercise ?? tool.defaultDifficulty ?? variants[0]?.id ?? null;
}

export function resolveExerciseLevelId(tool = {}, variantId, candidate) {
  const variant = getExerciseVariants(tool).find((item) => item.id === variantId);
  const levels = normalizeExerciseLevels(variant);

  if (levels.length === 0) {
    return null;
  }

  const requested = candidate ?? variant?.defaultLevel;
  const selected = levels.find((level) => String(level.id) === String(requested));
  return selected?.id ?? levels[0].id;
}

export function resolveExerciseLevelValue(tool = {}, variantId, levelId) {
  const variant = getExerciseVariants(tool).find((item) => item.id === variantId);
  const levels = normalizeExerciseLevels(variant);
  const selected = levels.find((level) => String(level.id) === String(levelId));
  return selected?.value ?? null;
}

export function resolveExerciseColor(color) {
  if (color && typeof color === "object") {
    return color.accent ?? EXERCISE_COLOR_PALETTE.blue;
  }

  return EXERCISE_COLOR_PALETTE[color] ?? color ?? EXERCISE_COLOR_PALETTE.blue;
}
