export const STUDENT_TOOLS = [
  {
    id: "tikz",
    titleKey: "resourceTikzTitle",
    descriptionKey: "resourceTikzText",
    audience: "LaTeX",
    path: "tikz",
  },
  {
    id: "linear-map",
    titleKey: "resourceLinearMapTitle",
    descriptionKey: "resourceLinearMapText",
    audience: "L1-L2",
    path: "application-lineaire",
  },
  {
    id: "gauss",
    titleKey: "resourceGaussTitle",
    descriptionKey: "resourceGaussText",
    audience: "L1",
    path: "gauss",
  },
  {
    id: "inverse",
    titleKey: "resourceInverseTitle",
    descriptionKey: "resourceInverseText",
    audience: "L1",
    path: "inverse",
  },
];

export function getStudentToolCards(t, lang) {
  return STUDENT_TOOLS.map((tool) => ({
    id: tool.id,
    title: t.teaching[tool.titleKey],
    description: t.teaching[tool.descriptionKey],
    audience: tool.audience,
    actions: [
      {
        kind: "internal",
        label: t.teaching.resourceActionOpen,
        to: `/${lang}/${tool.path}`,
      },
    ],
  }));
}
