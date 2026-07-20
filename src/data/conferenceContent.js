export function getConferenceTalks(t) {
  return [
    {
      id: "icms-2026",
      year: "2026",
      type: t.conferences.typeConference,
      accent: "gold",
      title: t.conferences.conf7Title,
      description: t.conferences.conf6Desc,
      actions: [
        {
          kind: "pdf",
          label: t.conferences.actionSlides,
          href: `${process.env.PUBLIC_URL}/docs/icms2026.pdf`,
        },
      ],
    },
    {
      id: "issac-2026",
      year: "2026",
      type: t.conferences.typeConference,
      accent: "gold",
      title: t.conferences.conf6Title,
      description: t.conferences.conf6Desc,
      actions: [
        {
          kind: "pdf",
          label: t.conferences.actionSlides,
          href: `${process.env.PUBLIC_URL}/docs/issac2026.pdf`,
        },
      ],
    },
    {
      id: "mediation-2026",
      year: "2026",
      type: t.conferences.typeOutreach,
      accent: "emerald",
      title: t.conferences.conf5Title,
      description: t.conferences.conf5Desc,
      actions: [
        {
          kind: "pdf",
          label: t.conferences.actionSlides,
          href: `${process.env.PUBLIC_URL}/docs/diapomediation.pdf`,
        },
        {
          kind: "pdf",
          label: t.conferences.conf1Doc1,
          href: `${process.env.PUBLIC_URL}/docs/mediation2026.pdf`,
        },
      ],
    },
    {
      id: "jncf-2026",
      year: "2026",
      type: t.conferences.typeFlashTalk,
      accent: "rose",
      title: t.conferences.conf4Title,
      description: t.conferences.conf4Desc,
      actions: [
        {
          kind: "pdf",
          label: t.conferences.actionSlides,
          href: `${process.env.PUBLIC_URL}/docs/jncf_flash_talk.pdf`,
        },
      ],
    },
    {
      id: "dijon-2026",
      year: "2026",
      type: t.conferences.typeSeminar,
      accent: "cobalt",
      title: t.conferences.conf3Title,
      description: t.conferences.conf3Desc,
      actions: [
        {
          kind: "pdf",
          label: t.conferences.actionSlides,
          href: `${process.env.PUBLIC_URL}/docs/sem_dijon.pdf`,
        },
      ],
    },
    {
      id: "odelix-2025",
      year: "2025",
      type: t.conferences.typeProgram,
      accent: "gold",
      title: t.conferences.conf2Title,
      description: t.conferences.conf2Desc,
      actions: [
        {
          kind: "pdf",
          label: t.conferences.actionSlides,
          href: `${process.env.PUBLIC_URL}/docs/odelix_talk.pdf`,
        },
      ],
    },
    {
      id: "mediation-2025",
      year: "2025",
      type: t.conferences.typeOutreach,
      accent: "emerald",
      title: t.conferences.conf1Title,
      description: t.conferences.conf1Desc,
      actions: [
        {
          kind: "pdf",
          label: t.conferences.actionSlides,
          href: `${process.env.PUBLIC_URL}/docs/PrésentationSecondes.pdf`,
        },
        {
          kind: "pdf",
          label: t.conferences.conf1Doc1,
          href: `${process.env.PUBLIC_URL}/docs/ActivitéSecondesArbres.pdf`,
        },
      ],
    },
  ];
}
