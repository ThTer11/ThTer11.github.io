import {
  courseHintsById,
  exerciseCategories,
  exerciseTools,
  validateRegistry,
} from "./registry";
import { createQuestion, pickStudyExercise } from "./core/source";
import { resolveAnswerSpec } from "./core/answerSpec";
import { getExerciseVariants, normalizeExerciseLevels } from "./core/exerciseOptions";
import { validateAnswer } from "./core/validators";

function seededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const SUPPORTED_ANSWER_TYPES = new Set([
  "integer",
  "number",
  "decimal",
  "fraction",
  "expression",
  "text",
  "choice",
  "boolean",
  "true-false",
  "solution-set",
  "multiple-fields",
  "multi-field",
  "vector",
  "matrix",
  "coordinates",
  "graphic",
]);

describe("exercise registry", () => {
  test("contains four valid categories and unique, complete definitions", () => {
    expect(exerciseCategories).toHaveLength(4);
    expect(validateRegistry()).toEqual([]);
    expect(exerciseTools.length).toBeGreaterThanOrEqual(20);
  });

  test("only declares answer types understood by the engine", () => {
    exerciseTools.filter((tool) => tool.mode !== "study").forEach((tool) => {
      expect(SUPPORTED_ANSWER_TYPES.has(tool.answer?.type ?? "text")).toBe(true);
    });
  });

  test("generates and validates representative questions at every level", () => {
    const failures = [];

    exerciseTools.filter((tool) => tool.mode !== "study").forEach((tool, toolIndex) => {
      const variants = getExerciseVariants(tool);
      const scenarios = variants.length > 0
        ? variants.flatMap((variant) => {
          const levels = normalizeExerciseLevels(variant);
          return levels.length > 0
            ? levels.map((level) => ({ difficulty: variant.id, level: level.value }))
            : [{ difficulty: variant.id, level: null }];
        })
        : [{ difficulty: undefined, level: null }];

      scenarios.forEach(({ difficulty, level }, difficultyIndex) => {
        [11, 29, 47].forEach((offset) => {
          try {
            const question = createQuestion(
              tool,
              difficulty,
              seededRng(offset + toolIndex * 101 + difficultyIndex * 17),
              level,
            );
            const spec = resolveAnswerSpec(tool.answer, question.answer);
            const outcome = validateAnswer(
              question.expected,
              spec,
              question.expected,
              question,
              "fr",
            );

            if (!outcome.correct) {
              failures.push(`${tool.id}/${difficulty ?? "default"}: ${outcome.status} — ${outcome.message}`);
            }

            [...(tool.courseHintIds ?? []), ...(question.courseHintIds ?? [])].forEach((hintId) => {
              if (!courseHintsById[hintId]) {
                failures.push(`${tool.id}: rappel inconnu ${hintId}`);
              }
            });
          } catch (error) {
            failures.push(`${tool.id}/${difficulty ?? "default"}: ${error.message}`);
          }
        });
      });
    });

    expect(failures).toEqual([]);
  });

  test("selects a worked exercise at every configured level", () => {
    const failures = [];

    exerciseTools.filter((tool) => tool.mode === "study").forEach((tool, toolIndex) => {
      const difficulties = tool.difficulties?.map((level) => level.id) ?? [undefined];
      difficulties.forEach((difficulty, index) => {
        try {
          const exercise = pickStudyExercise(tool, difficulty, seededRng(toolIndex * 31 + index + 1));
          if (!(exercise.statement || exercise.prompt) || !exercise.solution) {
            failures.push(`${tool.id}/${difficulty ?? "default"}: énoncé ou solution manquant`);
          }
        } catch (error) {
          failures.push(`${tool.id}/${difficulty ?? "default"}: ${error.message}`);
        }
      });
    });

    expect(failures).toEqual([]);
  });
});
