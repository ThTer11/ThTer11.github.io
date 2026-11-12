import { exerciseCategories, getToolsForCategory } from "../exercises/registry";
import { localize } from "../exercises/core/localize";
import { STUDENT_TOOLS } from "../tools/studentTools";

export function practiceHref(lang, groupId) {
  return `/${lang}/entrainements${groupId ? `#${groupId}` : ""}`;
}

export function isPracticePath(pathname, lang) {
  const root = practiceHref(lang);
  return pathname === root || pathname.startsWith(`${root}/`)
    || STUDENT_TOOLS.some((tool) => tool.id !== "training" && pathname === `/${lang}/${tool.path}`);
}

export function getPracticeGroups(t, lang) {
  const groups = exerciseCategories.map((category) => ({
    id: category.id,
    title: localize(category.title, lang),
    description: localize(category.description, lang),
    accent: category.accent,
    entries: getToolsForCategory(category.id).map((tool) => ({
      id: tool.id,
      kind: "training",
      title: localize(tool.title, lang),
      description: localize(tool.description, lang),
      to: `/${lang}/entrainements/${category.id}/${tool.id}`,
    })),
  }));

  groups.push({
    id: "outils",
    title: t.practice.toolsTitle,
    accent: "slate",
    entries: STUDENT_TOOLS.filter((tool) => tool.id !== "training" && tool.enabled !== false).map((tool) => ({
      id: tool.id,
      kind: "tool",
      title: t.teaching[tool.titleKey],
      description: t.practice.toolDescriptions[tool.id] ?? t.teaching[tool.descriptionKey],
      to: `/${lang}/${tool.path}`,
    })),
  });
  return groups;
}
