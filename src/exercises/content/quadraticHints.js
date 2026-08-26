export const quadraticCourseHints = [
  {
    id: "quadratic-discriminant",
    title: {
      fr: "Discriminant et nombre de racines",
      en: "Discriminant and number of roots",
    },
    content: {
      fr: "Pour $ax^2+bx+c=0$ avec $a\\neq0$, on calcule $$\\Delta=b^2-4ac.$$ • $\\Delta<0$ : aucune solution réelle.\n• $\\Delta=0$ : une racine double $x=-\\frac{b}{2a}$.\n• $\\Delta>0$ : deux racines réelles.",
      en: "For $ax^2+bx+c=0$ with $a\\neq0$, compute $$\\Delta=b^2-4ac.$$ • $\\Delta<0$: no real solution.\n• $\\Delta=0$: one repeated root $x=-\\frac{b}{2a}$.\n• $\\Delta>0$: two real roots.",
    },
  },
  {
    id: "quadratic-roots",
    title: {
      fr: "Formules des racines",
      en: "Quadratic formula",
    },
    content: {
      fr: "Lorsque $\\Delta>0$, les racines sont $$x_1=\\frac{-b-\\sqrt{\\Delta}}{2a},\\qquad x_2=\\frac{-b+\\sqrt{\\Delta}}{2a}.$$ Conserve les fractions exactes et réduis-les. L'ordre de $x_1$ et $x_2$ n'a aucune importance dans l'ensemble solution.",
      en: "When $\\Delta>0$, the roots are $$x_1=\\frac{-b-\\sqrt{\\Delta}}{2a},\\qquad x_2=\\frac{-b+\\sqrt{\\Delta}}{2a}.$$ Keep exact reduced fractions. The order of $x_1$ and $x_2$ does not matter in the solution set.",
    },
  },
  {
    id: "quadratic-shortcuts",
    title: {
      fr: "Réflexes avant le discriminant",
      en: "Checks before using the discriminant",
    },
    content: {
      fr: "Avant de développer la formule générale, cherche une structure visible :\n• $x^2+2ux+u^2=(x+u)^2$.\n• $ax^2+bx=x(ax+b)$.\n• Si $a+b+c=0$, alors $1$ est une racine.\n• Si $a-b+c=0$, alors $-1$ est une racine.\n• Pour un trinôme unitaire, la somme des racines vaut $-b$ et leur produit vaut $c$.",
      en: "Before applying the general formula, look for a visible structure:\n• $x^2+2ux+u^2=(x+u)^2$.\n• $ax^2+bx=x(ax+b)$.\n• If $a+b+c=0$, then $1$ is a root.\n• If $a-b+c=0$, then $-1$ is a root.\n• For a monic quadratic, the roots add to $-b$ and multiply to $c$.",
    },
  },
  {
    id: "quadratic-parabola",
    title: {
      fr: "Lire l'allure d'une parabole",
      en: "Reading a parabola",
    },
    content: {
      fr: "Pour $f(x)=ax^2+bx+c$, le signe de $a$ donne l'orientation : vers le haut si $a>0$, vers le bas si $a<0$. L'abscisse du sommet est $$x_S=-\\frac{b}{2a}.$$ Les intersections avec l'axe des abscisses sont exactement les racines de $f$ : leur nombre est donc déterminé par le signe de $\\Delta$.",
      en: "For $f(x)=ax^2+bx+c$, the sign of $a$ gives the orientation: upwards if $a>0$, downwards if $a<0$. The vertex has x-coordinate $$x_V=-\\frac{b}{2a}.$$ The x-axis intersections are exactly the roots of $f$, so their number is determined by the sign of $\\Delta$.",
    },
  },
  {
    id: "quadratic-biquadratic",
    title: {
      fr: "Équations bicarrées",
      en: "Biquadratic equations",
    },
    content: {
      fr: "Dans $ax^4+bx^2+c=0$, pose $y=x^2$. Résous d'abord $$ay^2+by+c=0,$$ puis reviens à $x$. Une valeur $y<0$ ne donne aucune solution réelle ; $y=0$ donne $x=0$ ; et $y>0$ donne $x=\\pm\\sqrt y$.",
      en: "In $ax^4+bx^2+c=0$, set $y=x^2$. First solve $$ay^2+by+c=0,$$ then return to $x$. A value $y<0$ yields no real root; $y=0$ gives $x=0$; and $y>0$ gives $x=\\pm\\sqrt y$.",
    },
  },
];

export default quadraticCourseHints;
