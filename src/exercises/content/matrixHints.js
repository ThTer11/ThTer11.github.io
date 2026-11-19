const tr = (fr, en) => ({ fr, en });

const matrix2Example = "$$A=\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}.$$";
const inverse2Formula = "$$A^{-1}=\\frac{1}{\\det(A)}\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}.$$";
const matrix3Example = "$$A=\\begin{pmatrix}d&e&f\\\\g&h&i\\\\j&k&\\ell\\end{pmatrix}.$$";
const system3Example = "$$\\left\\{\\begin{aligned}dx+ey+fz&=a\\\\gx+hy+iz&=b\\\\jx+ky+\\ell z&=c\\end{aligned}\\right.$$";

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
      {
        type: "example",
        title: tr("Vecteur colonne", "Column vector"),
        content: tr(
          "Pour $A\\in M_{m,n}(\\mathbb R)$ et $X=(x_1,\\ldots,x_n)^T$, le produit $AX$ est un vecteur colonne à $m$ composantes. Sa composante $i$ vaut $a_{i1}x_1+\\cdots+a_{in}x_n$.",
          "For $A\\in M_{m,n}(\\mathbb R)$ and $X=(x_1,\\ldots,x_n)^T$, $AX$ is a column vector with $m$ entries. Its entry $i$ is $a_{i1}x_1+\\cdots+a_{in}x_n$.",
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
    title: tr("Inversion de matrices", "Matrix inversion"),
    blocks: [
      {
        type: "text",
        title: tr("Définition", "Definition"),
        content: tr(
          "Une matrice $A\\in\\mathcal{M}_n(\\mathbb R)$ est inversible si et seulement s’il existe une matrice $B\\in\\mathcal{M}_n(\\mathbb R)$ telle que $AB=I_n$.",
          "A matrix $A\\in\\mathcal{M}_n(\\mathbb R)$ is invertible if and only if there exists a matrix $B\\in\\mathcal{M}_n(\\mathbb R)$ such that $AB=I_n$.",
        ),
      },
      {
        type: "formula",
        title: tr("Cas des matrices $2\\times2$", "The $2\\times2$ case"),
        content: tr(
          `${matrix2Example}\nOn définit le déterminant de $A$ par $\\det(A)=ad-bc$.\nLa matrice $A$ est inversible si et seulement si $\\det(A)\\ne0$. Dans ce cas, son inverse est donné par\n${inverse2Formula}`,
          `${matrix2Example}\nThe determinant of $A$ is defined by $\\det(A)=ad-bc$.\nThe matrix $A$ is invertible if and only if $\\det(A)\\ne0$. In that case, its inverse is given by\n${inverse2Formula}`,
        ),
      },
      {
        type: "formula",
        title: tr("Cas des matrices $3\\times3$", "The $3\\times3$ case"),
        content: tr(
          `${matrix3Example}\nOn associe à cette matrice le système suivant :\n${system3Example}\nOn résout ce système. S’il admet une solution unique pour tout $(a,b,c)\\in\\mathbb R^3$, la matrice $A$ est inversible. Sinon, elle ne l’est pas.`,
          `${matrix3Example}\nThe associated system is:\n${system3Example}\nSolve this system. If it has a unique solution for every $(a,b,c)\\in\\mathbb R^3$, the matrix $A$ is invertible. Otherwise, it is not invertible.`,
        ),
      },
      {
        type: "formula",
        title: tr("Cas général en utilisant le pivot de Gauss", "General case using Gaussian elimination"),
        content: tr(
          "Soit $A\\in\\mathcal{M}_n(\\mathbb R)$. On utilise le pivot de Gauss pour obtenir l’échelonnée réduite de la matrice augmentée $(A\\mid I_n)$.\nSi cette forme est $(I_n\\mid B)$, la matrice $A$ est inversible, d’inverse $B$. Sinon, $A$ n’est pas inversible.",
          "Let $A\\in\\mathcal{M}_n(\\mathbb R)$. Use Gaussian elimination to obtain the reduced row echelon form of the augmented matrix $(A\\mid I_n)$.\nIf the resulting matrix is $(I_n\\mid B)$, then $A$ is invertible with inverse $B$. Otherwise, $A$ is not invertible.",
        ),
      },
    ],
  },
];

export default matrixCourseHints;
