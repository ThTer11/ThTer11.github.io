const tr = (fr, en) => ({ fr, en });

export const matrixCourseHints = [
  {
    id: "matrix-product",
    title: tr("Produit matriciel : dimensions et calcul", "Matrix products: dimensions and computation"),
    summary: tr(
      "Comparer les dimensions intérieures, puis effectuer des produits ligne-colonne.",
      "Compare the inner dimensions, then compute row-by-column products.",
    ),
    blocks: [
      {
        type: "text",
        content: tr(
          "Si $A$ est de taille $m\\times n$ et $B$ de taille $r\\times p$, le produit $AB$ est défini exactement lorsque $n=r$.",
          "If $A$ has size $m\\times n$ and $B$ has size $r\\times p$, the product $AB$ is defined exactly when $n=r$.",
        ),
      },
      {
        type: "formula",
        content: tr(
          "$$A\\in M_{m,n},\\ B\\in M_{n,p}\\quad\\Longrightarrow\\quad AB\\in M_{m,p},\\qquad (AB)_{ij}=\\sum_{k=1}^{n}a_{ik}b_{kj}.$$",
          "$$A\\in M_{m,n},\\ B\\in M_{n,p}\\quad\\Longrightarrow\\quad AB\\in M_{m,p},\\qquad (AB)_{ij}=\\sum_{k=1}^{n}a_{ik}b_{kj}.$$",
        ),
      },
      {
        type: "example",
        title: tr("Exemple", "Example"),
        content: tr(
          "Une matrice $2\\times3$ peut multiplier une matrice $3\\times4$ ; le résultat est de taille $2\\times4$. Pour chaque coefficient, on associe une ligne du premier facteur à une colonne du second.",
          "A $2\\times3$ matrix can multiply a $3\\times4$ matrix; the result has size $2\\times4$. Each entry pairs a row of the first factor with a column of the second.",
        ),
      },
      {
        type: "remark",
        content: tr(
          "En général $AB\\neq BA$. Il est même possible que $AB$ soit défini alors que $BA$ ne l'est pas.",
          "In general $AB\\neq BA$. It is even possible for $AB$ to be defined while $BA$ is not.",
        ),
      },
    ],
  },
  {
    id: "matrix-determinant",
    title: tr("Déterminants de petites matrices", "Determinants of small matrices"),
    summary: tr(
      "Utiliser la formule en taille 2 et exploiter les zéros ou une structure triangulaire en taille 3.",
      "Use the size-2 formula and exploit zeros or triangular structure in size 3.",
    ),
    blocks: [
      {
        type: "formula",
        title: tr("Taille $2\\times2$", "Size $2\\times2$"),
        content: tr(
          "$$\\det\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}=ad-bc.$$",
          "$$\\det\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}=ad-bc.$$",
        ),
      },
      {
        type: "text",
        content: tr(
          "Pour une matrice $3\\times3$, développer suivant la ligne ou la colonne qui contient le plus de zéros réduit fortement le calcul.",
          "For a $3\\times3$ matrix, expanding along the row or column with the most zeros greatly reduces the computation.",
        ),
      },
      {
        type: "formula",
        title: tr("Matrice triangulaire", "Triangular matrix"),
        content: tr(
          "$$A\\text{ triangulaire}\\quad\\Longrightarrow\\quad\\det(A)=a_{11}a_{22}\\cdots a_{nn}.$$",
          "$$A\\text{ triangular}\\quad\\Longrightarrow\\quad\\det(A)=a_{11}a_{22}\\cdots a_{nn}.$$",
        ),
      },
      {
        type: "remark",
        content: tr(
          "Le déterminant est nul exactement lorsque les lignes (ou les colonnes) sont linéairement dépendantes.",
          "The determinant is zero exactly when the rows (or columns) are linearly dependent.",
        ),
      },
    ],
  },
  {
    id: "matrix-inverse",
    title: tr("Inverse d'une matrice $2\\times2$", "Inverse of a $2\\times2$ matrix"),
    summary: tr(
      "Vérifier d'abord que le déterminant est non nul.",
      "First check that the determinant is nonzero.",
    ),
    blocks: [
      {
        type: "text",
        content: tr(
          "Une matrice carrée $A$ est inversible si et seulement si $\\det(A)\\neq0$.",
          "A square matrix $A$ is invertible if and only if $\\det(A)\\neq0$.",
        ),
      },
      {
        type: "formula",
        content: tr(
          "$$A=\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix},\\quad \\det(A)=ad-bc\\neq0\\quad\\Longrightarrow\\quad A^{-1}=\\frac1{ad-bc}\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}.$$",
          "$$A=\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix},\\quad \\det(A)=ad-bc\\neq0\\quad\\Longrightarrow\\quad A^{-1}=\\frac1{ad-bc}\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}.$$",
        ),
      },
      {
        type: "example",
        content: tr(
          "$$A=\\begin{pmatrix}1&2\\\\0&1\\end{pmatrix}\\quad\\Longrightarrow\\quad A^{-1}=\\begin{pmatrix}1&-2\\\\0&1\\end{pmatrix}.$$",
          "$$A=\\begin{pmatrix}1&2\\\\0&1\\end{pmatrix}\\quad\\Longrightarrow\\quad A^{-1}=\\begin{pmatrix}1&-2\\\\0&1\\end{pmatrix}.$$",
        ),
      },
      {
        type: "remark",
        content: tr(
          "Un contrôle rapide consiste à vérifier que $AA^{-1}=I_2$.",
          "A quick check is to verify that $AA^{-1}=I_2$.",
        ),
      },
    ],
  },
];

export default matrixCourseHints;
