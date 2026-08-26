import exerciseCategories from "./categories";
import { elementaryTools } from "./definitions/elementary";
import { quadraticTools } from "./definitions/quadratic";
import { matrixTools } from "./definitions/matrices";
import { systemTools } from "./definitions/systems";
import { elementaryCourseHints } from "./content/elementaryHints";
import { quadraticCourseHints } from "./content/quadraticHints";
import { matrixCourseHints } from "./content/matrixHints";
import { systemCourseHints } from "./content/systemHints";

export const exerciseTools = [
  ...elementaryTools,
  ...quadraticTools,
  ...matrixTools,
  ...systemTools,
];

export const courseHints = [
  ...elementaryCourseHints,
  ...quadraticCourseHints,
  ...matrixCourseHints,
  ...systemCourseHints,
];

export const courseHintsById = Object.fromEntries(
  courseHints.map((hint) => [hint.id, hint]),
);

export function getExerciseCategory(categoryId) {
  return exerciseCategories.find((category) => category.id === categoryId);
}

export function getExerciseTool(categoryId, toolId) {
  return exerciseTools.find((tool) =>
    tool.categoryId === categoryId && tool.id === toolId && tool.enabled !== false);
}

export function getToolsForCategory(categoryId) {
  return exerciseTools.filter((tool) =>
    tool.categoryId === categoryId && tool.enabled !== false);
}

export function validateRegistry() {
  const errors = [];
  const categoryIds = new Set(exerciseCategories.map((category) => category.id));
  const toolKeys = new Set();
  const hintIds = new Set();

  exerciseCategories.forEach((category) => {
    if (!category.id || !category.title) {
      errors.push("Chaque catégorie doit posséder un id et un titre.");
    }
  });

  exerciseTools.forEach((tool) => {
    const key = `${tool.categoryId}/${tool.id}`;
    if (!tool.id || !tool.title || !tool.source) {
      errors.push(`Définition incomplète : ${key}.`);
    }
    if (!categoryIds.has(tool.categoryId)) {
      errors.push(`Catégorie inconnue pour ${key}.`);
    }
    if (toolKeys.has(key)) {
      errors.push(`Identifiant d'outil dupliqué : ${key}.`);
    }
    toolKeys.add(key);
  });

  courseHints.forEach((hint) => {
    if (!hint.id || !hint.title) {
      errors.push("Chaque rappel de cours doit posséder un id et un titre.");
    }
    if (hintIds.has(hint.id)) {
      errors.push(`Identifiant de rappel dupliqué : ${hint.id}.`);
    }
    hintIds.add(hint.id);
  });

  return errors;
}

export { exerciseCategories };
