const translated = (fr, en) => ({ fr, en: en ?? fr });

export const calculusCourseHints = [
  {
    id: "calculus-usual-derivatives",
    title: translated("Dérivées des fonctions usuelles", "Derivatives of standard functions"),
    summary: translated("Reconnaître immédiatement les dérivées de référence.", "Recognise standard derivatives immediately."),
    blocks: [
      {
        type: "formula",
        content: translated(
          "$$(t^\\alpha)'=\\alpha t^{\\alpha-1},\\qquad (\\mathrm e^t)'=\\mathrm e^t,$$ $$(\\sin(t))'=\\cos(t),\\qquad(\\cos(t))'=-\\sin(t).$$",
          "$$(t^\\alpha)'=\\alpha t^{\\alpha-1},\\qquad (\\mathrm e^t)'=\\mathrm e^t,$$ $$(\\sin(t))'=\\cos(t),\\qquad(\\cos(t))'=-\\sin(t).$$",
        ),
      },
      {
        type: "formula",
        content: translated(
          "Sur leurs intervalles de définition, $$\\left(\\frac1t\\right)'=-\\frac1{t^2},\\qquad(\\sqrt t)'=\\frac1{2\\sqrt t}\\quad(t>0).$$",
          "On their domains, $$\\left(\\frac1t\\right)'=-\\frac1{t^2},\\qquad(\\sqrt t)'=\\frac1{2\\sqrt t}\\quad(t>0).$$",
        ),
      },
      {
        type: "remark",
        content: translated("Les constantes multiplicatives sont conservées : $(ku)'=ku'.$", "Constant factors are preserved: $(ku)'=ku'.$"),
      },
    ],
  },
  {
    id: "calculus-derivative-rules",
    title: translated("Somme, produit et quotient", "Sum, product and quotient rules"),
    blocks: [
      {
        type: "formula",
        content: translated(
          "$$(u+v)'=u'+v',\\qquad(uv)'=u'v+uv',$$ $$\\left(\\frac uv\\right)'=\\frac{u'v-uv'}{v^2}\\quad(v\\neq0).$$",
          "$$(u+v)'=u'+v',\\qquad(uv)'=u'v+uv',$$ $$\\left(\\frac uv\\right)'=\\frac{u'v-uv'}{v^2}\\quad(v\\neq0).$$",
        ),
      },
      {
        type: "example",
        content: translated(
          "Pour $f(t)=(2t-1)\\mathrm e^t$, $$f'(t)=2\\mathrm e^t+(2t-1)\\mathrm e^t=(2t+1)\\mathrm e^t.$$",
          "For $f(t)=(2t-1)\\mathrm e^t$, $$f'(t)=2\\mathrm e^t+(2t-1)\\mathrm e^t=(2t+1)\\mathrm e^t.$$",
        ),
      },
    ],
  },
  {
    id: "calculus-chain-rule",
    title: translated("Dériver une fonction composée", "The chain rule"),
    blocks: [
      {
        type: "formula",
        content: translated(
          "Si $f=\\varphi\\circ u$, alors $$f'=u'\\,\\varphi'(u).$$ En particulier, $$(\\mathrm e^u)'=u'\\mathrm e^u,\\quad(\\sin(u))'=u'\\cos(u),\\quad(\\sqrt u)'=\\frac{u'}{2\\sqrt u}.$$",
          "If $f=\\varphi\\circ u$, then $$f'=u'\\,\\varphi'(u).$$ In particular, $$(\\mathrm e^u)'=u'\\mathrm e^u,\\quad(\\sin(u))'=u'\\cos(u),\\quad(\\sqrt u)'=\\frac{u'}{2\\sqrt u}.$$",
        ),
      },
      {
        type: "example",
        content: translated("$$(\\cos(3t-2))'=-3\\sin(3t-2).$$ Le facteur $3$ vient de la dérivée de l'intérieur.", "$$(\\cos(3t-2))'=-3\\sin(3t-2).$$ The factor $3$ is the inner derivative."),
      },
    ],
  },
  {
    id: "calculus-usual-primitives",
    title: translated("Primitives usuelles", "Standard antiderivatives"),
    blocks: [
      {
        type: "formula",
        content: translated(
          "Pour $n\\neq-1$, $$\\int t^n\\,dt=\\frac{t^{n+1}}{n+1}+C,\\qquad\\int\\mathrm e^t\\,dt=\\mathrm e^t+C.$$",
          "For $n\\neq-1$, $$\\int t^n\\,dt=\\frac{t^{n+1}}{n+1}+C,\\qquad\\int\\mathrm e^t\\,dt=\\mathrm e^t+C.$$",
        ),
      },
      {
        type: "formula",
        content: translated(
          "$$\\int\\cos(t)\\,dt=\\sin(t)+C,\\qquad\\int\\sin(t)\\,dt=-\\cos(t)+C.$$",
          "$$\\int\\cos(t)\\,dt=\\sin(t)+C,\\qquad\\int\\sin(t)\\,dt=-\\cos(t)+C.$$",
        ),
      },
      {
        type: "remark",
        content: translated("Toutes les primitives d'une même fonction sur un intervalle diffèrent d'une constante.", "All antiderivatives of a function on an interval differ by a constant."),
      },
    ],
  },
  {
    id: "calculus-linearity",
    title: translated("Linéarité des primitives", "Linearity of antiderivatives"),
    blocks: [
      {
        type: "formula",
        content: translated("Si $F'=f$ et $G'=g$, alors $$(aF+bG)'=af+bg.$$ On peut donc intégrer une somme terme à terme.", "If $F'=f$ and $G'=g$, then $$(aF+bG)'=af+bg.$$ Thus a sum can be integrated term by term."),
      },
      {
        type: "example",
        content: translated("$$\\int(6t^2-4\\sin(t))\\,dt=2t^3+4\\cos(t)+C.$$", "$$\\int(6t^2-4\\sin(t))\\,dt=2t^3+4\\cos(t)+C.$$"),
      },
    ],
  },
  {
    id: "calculus-reverse-chain-rule",
    title: translated("Reconnaître une dérivée composée", "Reverse chain rule"),
    blocks: [
      {
        type: "formula",
        content: translated(
          "Chercher simultanément une fonction $u$ et son facteur $u'$ : $$\\int u'\\mathrm e^u=\\mathrm e^u+C,\\quad\\int u'\\cos(u)=\\sin(u)+C,$$ $$\\int\\frac{u'}u=\\ln|u|+C.$$",
          "Look for both a function $u$ and its derivative $u'$: $$\\int u'\\mathrm e^u=\\mathrm e^u+C,\\quad\\int u'\\cos(u)=\\sin(u)+C,$$ $$\\int\\frac{u'}u=\\ln|u|+C.$$",
        ),
      },
      {
        type: "example",
        content: translated("$$\\int6\\mathrm e^{3t-1}\\,dt=2\\mathrm e^{3t-1}+C.$$", "$$\\int6\\mathrm e^{3t-1}\\,dt=2\\mathrm e^{3t-1}+C.$$"),
      },
    ],
  },
  {
    id: "calculus-integration-by-parts",
    title: translated("Intégration par parties", "Integration by parts"),
    blocks: [
      {
        type: "formula",
        content: translated("À partir de $(uv)'=u'v+uv'$, on obtient $$\\int uv'=uv-\\int u'v.$$", "From $(uv)'=u'v+uv'$, we obtain $$\\int uv'=uv-\\int u'v.$$"),
      },
      {
        type: "example",
        content: translated("Avec $u=t$ et $v'=\\mathrm e^t$, $$\\int t\\mathrm e^t\\,dt=t\\mathrm e^t-\\int\\mathrm e^t\\,dt=(t-1)\\mathrm e^t+C.$$", "With $u=t$ and $v'=\\mathrm e^t$, $$\\int t\\mathrm e^t\\,dt=t\\mathrm e^t-\\int\\mathrm e^t\\,dt=(t-1)\\mathrm e^t+C.$$"),
      },
      {
        type: "remark",
        content: translated("Choisir comme $u$ le facteur qui se simplifie lorsqu'on le dérive, souvent le polynôme.", "Choose as $u$ the factor that becomes simpler when differentiated, often the polynomial."),
      },
    ],
  },
  {
    id: "calculus-initial-condition",
    title: translated("Primitive déterminée par une condition", "Antiderivative fixed by a condition"),
    blocks: [
      {
        type: "note",
        content: translated("Commencer par trouver la famille $F(t)=G(t)+C$, puis utiliser la valeur imposée pour calculer l'unique constante $C$.", "First find the family $F(t)=G(t)+C$, then use the prescribed value to determine the unique constant $C$."),
      },
      {
        type: "example",
        content: translated("Si $F'(t)=3t^2-4$ et $F(1)=2$, alors $F(t)=t^3-4t+C$, puis $-3+C=2$, donc $$F(t)=t^3-4t+5.$$", "If $F'(t)=3t^2-4$ and $F(1)=2$, then $F(t)=t^3-4t+C$, and $-3+C=2$, hence $$F(t)=t^3-4t+5.$$"),
      },
    ],
  },
  {
    id: "calculus-domains",
    title: translated("Intervalles, racines et logarithmes", "Intervals, roots and logarithms"),
    blocks: [
      {
        type: "note",
        content: translated("Une formule de dérivée ou de primitive s'emploie sur un intervalle où toutes les expressions sont définies. Toujours lire l'intervalle avant de calculer.", "A derivative or antiderivative formula is used on an interval where every expression is defined. Always read the interval first."),
      },
      {
        type: "formula",
        content: translated(
          "La dérivée de $1/(t-a)$ vaut $-1/(t-a)^2$ des deux côtés de $a$. Pour les primitives, $$\\frac1{t-a}\\longmapsto\\begin{cases}\\ln(t-a)+C&\\text{si }t>a,\\\\\\ln(a-t)+C&\\text{si }t<a.\\end{cases}$$",
          "The derivative of $1/(t-a)$ is $-1/(t-a)^2$ on both sides of $a$. For antiderivatives, $$\\frac1{t-a}\\longmapsto\\begin{cases}\\ln(t-a)+C&\\text{if }t>a,\\\\\\ln(a-t)+C&\\text{if }t<a.\\end{cases}$$",
        ),
      },
      {
        type: "remark",
        content: translated("L'écriture compacte $\\ln|t-a|+C$ regroupe les deux cas, mais chaque exercice précise un intervalle.", "The compact form $\\ln|t-a|+C$ combines both cases, but each exercise specifies an interval."),
      },
    ],
  },
];

export default calculusCourseHints;

