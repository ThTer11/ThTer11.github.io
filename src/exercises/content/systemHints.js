const tr = (fr, en) => ({ fr, en });

export const systemCourseHints = [
  {
    id: "gaussian-elimination",
    title: tr("Méthode du pivot de Gauss", "Gaussian elimination"),
    summary: tr(
      "Transformer le système sans changer son ensemble de solutions.",
      "Transform the system without changing its solution set.",
    ),
    blocks: [
      {
        type: "text",
        content: tr(
          "Le pivot de Gauss transforme la matrice augmentée en une forme échelonnée. On choisit un pivot, on annule les coefficients placés sous ce pivot, puis on passe à la colonne suivante.",
          "Gaussian elimination transforms the augmented matrix into echelon form. Choose a pivot, clear the entries below it, then move to the next column.",
        ),
      },
      {
        type: "formula",
        content: tr(
          "$$\\left(\\begin{array}{cc|c}1&a&b\\\\c&d&e\\end{array}\\right)\\xrightarrow{L_2\\leftarrow L_2-cL_1}\\left(\\begin{array}{cc|c}1&a&b\\\\0&d-ca&e-cb\\end{array}\\right).$$",
          "$$\\left(\\begin{array}{cc|c}1&a&b\\\\c&d&e\\end{array}\\right)\\xrightarrow{L_2\\leftarrow L_2-cL_1}\\left(\\begin{array}{cc|c}1&a&b\\\\0&d-ca&e-cb\\end{array}\\right).$$",
        ),
      },
      {
        type: "remark",
        content: tr(
          "Il faut toujours appliquer l'opération au second membre : celui-ci fait partie de la ligne augmentée.",
          "Always apply the operation to the right-hand side: it is part of the augmented row.",
        ),
      },
    ],
  },
  {
    id: "row-operations",
    title: tr("Opérations élémentaires sur les lignes", "Elementary row operations"),
    summary: tr(
      "Trois transformations réversibles conservent les solutions.",
      "Three reversible transformations preserve the solutions.",
    ),
    blocks: [
      {
        type: "formula",
        content: tr(
          "$$L_i\\leftrightarrow L_j,\\qquad L_i\\leftarrow \\lambda L_i\\ (\\lambda\\neq0),\\qquad L_i\\leftarrow L_i+\\lambda L_j.$$",
          "$$L_i\\leftrightarrow L_j,\\qquad L_i\\leftarrow \\lambda L_i\\ (\\lambda\\neq0),\\qquad L_i\\leftarrow L_i+\\lambda L_j.$$",
        ),
      },
      {
        type: "text",
        content: tr(
          "Échanger deux lignes permet de placer un pivot non nul. Multiplier une ligne simplifie un pivot. Ajouter un multiple d'une ligne à une autre sert à créer des zéros.",
          "Swapping rows places a nonzero pivot. Scaling a row simplifies a pivot. Adding a multiple of one row to another creates zeros.",
        ),
      },
      {
        type: "remark",
        content: tr(
          "Multiplier une ligne par zéro est interdit : l'opération ne serait pas réversible.",
          "Multiplying a row by zero is forbidden because the operation would not be reversible.",
        ),
      },
    ],
  },
  {
    id: "solution-types",
    title: tr("Les trois natures d'un système", "The three types of linear system"),
    summary: tr(
      "Lire pivots, variables libres et éventuelle ligne impossible.",
      "Read pivots, free variables and any impossible row.",
    ),
    blocks: [
      {
        type: "text",
        content: tr(
          "Après échelonnement, un système compatible possède une solution unique si chaque inconnue correspond à une colonne pivot. S'il reste au moins une inconnue libre, il possède une infinité de solutions.",
          "After row reduction, a consistent system has a unique solution if every variable column is a pivot column. If at least one variable is free, it has infinitely many solutions.",
        ),
      },
      {
        type: "formula",
        title: tr("Incompatibilité", "Inconsistency"),
        content: tr(
          "$$\\left(\\begin{array}{ccc|c}0&0&\\cdots&0&b\\end{array}\\right),\\quad b\\neq0,\\qquad\\text{correspond à }0=b.$$",
          "$$\\left(\\begin{array}{ccc|c}0&0&\\cdots&0&b\\end{array}\\right),\\quad b\\neq0,\\qquad\\text{means }0=b.$$",
        ),
      },
      {
        type: "remark",
        content: tr(
          "Une ligne entièrement nulle ne rend pas le système incompatible : elle indique seulement qu'une équation était redondante.",
          "An all-zero row does not make the system inconsistent: it only indicates a redundant equation.",
        ),
      },
    ],
  },
  {
    id: "parametric-solutions",
    title: tr("Écriture paramétrique des solutions", "Parametric form of the solutions"),
    summary: tr(
      "Choisir un paramètre par inconnue libre, puis exprimer les inconnues pivots.",
      "Choose one parameter per free variable, then express the pivot variables.",
    ),
    blocks: [
      {
        type: "text",
        content: tr(
          "Une colonne sans pivot correspond à une inconnue libre. On lui attribue un paramètre réel, puis on remonte les lignes pour exprimer les autres inconnues.",
          "A column without a pivot corresponds to a free variable. Assign it a real parameter, then back-substitute to express the other variables.",
        ),
      },
      {
        type: "example",
        content: tr(
          "À partir de $x+2z=3$ et $y-z=1$, poser $z=t$ donne $$x=3-2t,\\qquad y=1+t,\\qquad z=t,\\qquad t\\in\\mathbb R.$$",
          "From $x+2z=3$ and $y-z=1$, set $z=t$ to get $$x=3-2t,\\qquad y=1+t,\\qquad z=t,\\qquad t\\in\\mathbb R.$$",
        ),
      },
      {
        type: "formula",
        title: tr("Écriture vectorielle", "Vector form"),
        content: tr(
          "$$\\begin{pmatrix}x\\\\y\\\\z\\end{pmatrix}=\\begin{pmatrix}3\\\\1\\\\0\\end{pmatrix}+t\\begin{pmatrix}-2\\\\1\\\\1\\end{pmatrix},\\qquad t\\in\\mathbb R.$$",
          "$$\\begin{pmatrix}x\\\\y\\\\z\\end{pmatrix}=\\begin{pmatrix}3\\\\1\\\\0\\end{pmatrix}+t\\begin{pmatrix}-2\\\\1\\\\1\\end{pmatrix},\\qquad t\\in\\mathbb R.$$",
        ),
      },
      {
        type: "remark",
        content: tr(
          "Le nom du paramètre n'a aucune importance : $t$, $s$ ou $\\lambda$ décrivent le même ensemble si les formules sont cohérentes.",
          "The parameter name is irrelevant: $t$, $s$ or $\\lambda$ describe the same set when the formulas are consistent.",
        ),
      },
    ],
  },
];

export default systemCourseHints;
