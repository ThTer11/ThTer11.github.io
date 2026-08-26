function collectFromSource(source, ids) {
  if (!source) {
    return;
  }

  if (source.type === "bank" && Array.isArray(source.questions)) {
    source.questions.forEach((question) => {
      (question.courseHintIds ?? []).forEach((id) => ids.add(id));
    });
  }

  if (source.type === "mix") {
    (source.sources ?? []).forEach((variant) => {
      collectFromSource(variant.source ?? variant, ids);
    });
  }
}

export function collectToolCourseHintIds(tool) {
  const ids = new Set(tool.courseHintIds ?? []);
  collectFromSource(tool.source, ids);
  return [...ids];
}

export function collectToolCourseHints(tool, hintsById) {
  return collectToolCourseHintIds(tool)
    .map((id) => hintsById[id])
    .filter(Boolean);
}
