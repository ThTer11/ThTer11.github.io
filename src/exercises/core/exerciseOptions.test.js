import {
  getExerciseVariants,
  normalizeExerciseLevels,
  resolveExerciseColor,
  resolveExerciseLevelId,
  resolveExerciseLevelValue,
  resolveExerciseVariantId,
} from "./exerciseOptions";

const tool = {
  defaultExercise: "practice",
  exercises: [
    { id: "practice", levels: [1, { id: "advanced", value: 3, label: "3" }], defaultLevel: "advanced" },
    { id: "review", color: "gold" },
  ],
};

describe("exercise options", () => {
  test("separates exercise variants from their actual levels", () => {
    expect(getExerciseVariants(tool)).toHaveLength(2);
    expect(resolveExerciseVariantId(tool)).toBe("practice");
    expect(normalizeExerciseLevels(tool.exercises[0]).map((level) => level.id)).toEqual(["1", "advanced"]);
    expect(resolveExerciseLevelId(tool, "practice")).toBe("advanced");
    expect(resolveExerciseLevelValue(tool, "practice", "advanced")).toBe(3);
    expect(resolveExerciseLevelId(tool, "review")).toBeNull();
  });

  test("accepts named palette colors and custom CSS colors", () => {
    expect(resolveExerciseColor("gold")).toBe("#c58a08");
    expect(resolveExerciseColor("#123456")).toBe("#123456");
  });

  test("keeps legacy difficulties compatible", () => {
    const legacy = { defaultDifficulty: "hard", difficulties: [{ id: "easy" }, { id: "hard" }] };
    expect(getExerciseVariants(legacy)).toEqual(legacy.difficulties);
    expect(resolveExerciseVariantId(legacy)).toBe("hard");
  });
});
