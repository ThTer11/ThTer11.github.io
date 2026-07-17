import { getStudentToolCards } from "../tools/studentTools";

export function getTeachingYears(t) {
  return [
    {
      year: "2025 -",
      accent: "gold",
      items: [
        {
          title: t.teaching.teach1.title4,
          descriptionHtml: t.teaching.teach1.desc4,
          imageLinks: [
            {
              href: "https://www.h-k.fr/adc.ps.2026PCm",
              src: `${process.env.PUBLIC_URL}/hetk/pc2026.jpg`,
              alt: t.research.pub5Title,
              title: t.research.pub5Title,
            },
            {
              href: "https://www.h-k.fr/adc.ps.2026MPm",
              src: `${process.env.PUBLIC_URL}/hetk/mp2026.jpg`,
              alt: t.research.pub5Title,
              title: t.research.pub5Title,
            },
            {
              href: "https://www.h-k.fr/adc.ps.2025PSIm",
              src: `${process.env.PUBLIC_URL}/hetk/psi2025.jpg`,
              alt: t.research.pub2Title,
              title: t.research.pub2Title,
            },
          ],
          actions: [],
        },
      ],
    },
    {
      year: "2026 - 2027",
      accent: "emerald",
      items: [
        {
          title: t.teaching.teach1.title,
          subtitle: t.teaching.teach1.desc1,
          descriptionHtml: t.teaching.teach1.desc11,
          actions: [],
        },
        {
          title: t.teaching.teach1.title2,
          subtitle: t.teaching.teach1.desc2,
          descriptionHtml: t.teaching.teach1.desc21,
          actions: [],
        },
        {
          title: t.teaching.teach4.title,
          subtitle: t.teaching.teach4.desc,
          actions: [],
        },
      ],
    },
    {
      year: "2025 - 2026",
      accent: "emerald",
      items: [
        {
          title: t.teaching.teach1.title,
          subtitle: t.teaching.teach1.desc1,
          descriptionHtml: t.teaching.teach1.desc11,
          actions: [],
        },
        {
          title: t.teaching.teach1.title2,
          subtitle: t.teaching.teach1.desc2,
          descriptionHtml: t.teaching.teach1.desc21,
          actions: [],
        },
        {
          title: t.teaching.teach1.title3,
          subtitle: t.teaching.teach1.desc3,
          actions: [],
        },
      ],
    },
    {
      year: "2024 - 2025",
      accent: "cobalt",
      items: [
        {
          title: t.teaching.teach2.title,
          subtitle: t.teaching.teach2.desc1,
          actions: [],
        },
        {
          title: t.teaching.teach2.title2,
          subtitle: t.teaching.teach2.desc2,
          actions: [],
        },
        {
          title: t.teaching.teach2.title3,
          actions: [],
        },
      ],
    },
  ];
}

export function getTeachingResourceCards({ t, lang, openTeX }) {
  return [
    ...getStudentToolCards(t, lang),
    {
      id: "terminale",
      title: t.teaching.resourceTerminaleTitle,
      description: t.teaching.teach2.desc3,
      audience: "Terminale",
      actions: [
        {
          kind: "pdf",
          label: t.teaching.resourceActionPdf,
          href: `${process.env.PUBLIC_URL}/docs/exercicesterminale.pdf`,
        },
      ],
    },
    {
      id: "agreg",
      title: t.teaching.resourceAgregTitle,
      descriptionHtml: t.teaching.teach3.desc,
      audience: t.teaching.teach3.title,
      actions: [
        {
          kind: "pdf",
          label: t.teaching.agreg.algebre,
          href: `${process.env.PUBLIC_URL}/docs/metaplansalgebre.pdf`,
        },
        {
          kind: "pdf",
          label: t.teaching.agreg.analyse,
          href: `${process.env.PUBLIC_URL}/docs/metaplansanalyse.pdf`,
        },
        {
          kind: "package",
          label: t.teaching.resourceActionPackage,
          onClick: () => openTeX("packageagreg.tex"),
        },
      ],
    },
  ];
}
