export const RESEARCH_ACCENT_COLORS = {
  cobalt: "#2563eb",
  gold: "#d97706",
  emerald: "#059669",
  rose: "#e11d48",
};

export function getResearchFilters(t) {
  return [
    { key: "all", label: t.research.filtersAll },
    { key: "research", label: t.research.filtersResearch },
    { key: "teaching", label: t.research.filtersTeaching },
    { key: "outreach", label: t.research.filtersOutreach },
  ];
}

export function getResearchTypeLabels(t) {
  return {
    research: t.research.typeResearch,
    teaching: t.research.typeTeaching,
    outreach: t.research.typeOutreach,
  };
}

export function getPublications(t, openBib) {
  return [
    {
      id: "paper-2026",
      year: "2026",
      type: "research",
      accent: "cobalt",
      title: t.research.pub4Title,
      description: t.research.pub4Description,
      authors: t.research.pub4Info,
      actions: [
        {
          kind: "link",
          label: t.research.actionArticle,
          href: "https://arxiv.org/abs/2601.05026/",
        },
      ],
    },
    {
      id: "exam2-2026",
      year: "2026",
      type: "teaching",
      accent: "gold",
      title: t.research.pub5Title,
      description: t.research.pub5Info,
      authors: null,
      actions: [
        {
          kind: "link",
          label: t.research.actionOpenMP2026,
          href: "https://www.h-k.fr/adc.ps.2026MPm",
        },
        {
          kind: "link",
          label: t.research.actionOpenPC2026,
          href: "https://www.h-k.fr/adc.ps.2026PCm",
        },
      ],
    },
    {
      id: "exam-2025",
      year: "2025",
      type: "teaching",
      accent: "gold",
      title: t.research.pub2Title,
      description: t.research.pub2Info,
      authors: null,
      actions: [
        {
          kind: "link",
          label: t.research.actionOpenPSI2025,
          href: "https://www.h-k.fr/adc.ps.2025PSIm",
        },
      ],
    },
    {
      id: "outreach-2025",
      year: "2025",
      type: "outreach",
      accent: "emerald",
      title: t.research.pub3Title,
      descriptionHtml: t.research.pub3Info,
      authors: null,
      actions: [
        {
          kind: "link",
          label: t.research.actionArticle,
          href: "https://www.calameo.com/read/007886373c61c15d30939/",
        },
      ],
    },
    {
      id: "ryugu-2024",
      year: "2024",
      type: "research",
      accent: "rose",
      title: t.research.pub1Title,
      description: t.research.pub1Info,
      authors: t.research.pub1Authors,
      actions: [
        {
          kind: "pdf",
          label: t.research.actionPdf,
          href: "https://onlinelibrary.wiley.com/doi/epdf/10.1111/maps.14068",
        },
        {
          kind: "bibtex",
          label: t.research.actionBibtex,
          onClick: () => openBib("pericles_1945510059.bib"),
        },
      ],
    },
  ];
}
