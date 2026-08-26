const translated = (fr, en) => ({ fr, en: en ?? fr });

export const elementaryCourseHints = [
  {
    id: "elementary-addition-strategies",
    title: translated("Addition mentale et compensation", "Mental addition and compensation"),
    summary: translated(
      "Regrouper et compenser pour faire apparaître des dizaines ou des centaines.",
      "Regroup and compensate to create multiples of ten or one hundred.",
    ),
    blocks: [
      {
        type: "note",
        content: translated(
          "L’addition est associative et commutative : on peut changer l’ordre et les regroupements sans changer la somme.",
          "Addition is associative and commutative: terms may be reordered and regrouped without changing the sum.",
        ),
      },
      {
        type: "formula",
        title: translated("Compensation", "Compensation"),
        content: translated(
          "$$(a+d)+(b-d)=a+b.$$ On ajoute une quantité à un terme et on la retire à l’autre.",
          "$$(a+d)+(b-d)=a+b.$$ Add an amount to one term and subtract it from the other.",
        ),
      },
      {
        type: "example",
        content: translated(
          "$$48+29=47+30=77.$$ Déplacer une unité rend le second terme beaucoup plus simple.",
          "$$48+29=47+30=77.$$ Moving one unit makes the second term much easier.",
        ),
      },
      {
        type: "remark",
        content: translated(
          "Avec des relatifs, écris mentalement une soustraction quand le second terme est négatif : $17+(-9)=17-9$.",
          "With signed integers, think of adding a negative as subtraction: $17+(-9)=17-9$.",
        ),
      },
    ],
  },
  {
    id: "elementary-multiplication-strategies",
    title: translated("Raccourcis de multiplication", "Multiplication shortcuts"),
    summary: translated(
      "Décomposer un facteur pour utiliser la distributivité et des nombres ronds.",
      "Split a factor to use distributivity and round numbers.",
    ),
    blocks: [
      {
        type: "formula",
        content: translated(
          "La distributivité donne $$a(b+c)=ab+ac\\qquad\\text{et}\\qquad a(b-c)=ab-ac.$$",
          "Distributivity gives $$a(b+c)=ab+ac\\qquad\\text{and}\\qquad a(b-c)=ab-ac.$$",
        ),
      },
      {
        type: "example",
        title: translated("Multiplier par 5 ou 25", "Multiplying by 5 or 25"),
        content: translated(
          "$$n\\times5=\\frac{n\\times10}{2},\\qquad n\\times25=\\frac{n\\times100}{4}.$$ Par exemple, $48\\times25=12\\times100=1200$.",
          "$$n\\times5=\\frac{n\\times10}{2},\\qquad n\\times25=\\frac{n\\times100}{4}.$$ For example, $48\\times25=12\\times100=1200$.",
        ),
      },
      {
        type: "example",
        title: translated("Près d’une centaine", "Near one hundred"),
        content: translated(
          "$$37\\times99=37(100-1)=3700-37=3663.$$",
          "$$37\\times99=37(100-1)=3700-37=3663.$$",
        ),
      },
      {
        type: "remark",
        content: translated(
          "Choisis une décomposition qui réduit le nombre d’opérations et permet un contrôle mental du résultat.",
          "Choose a decomposition that reduces the number of operations and makes the answer easy to check mentally.",
        ),
      },
    ],
  },
  {
    id: "elementary-fractions",
    title: translated("Calcul exact avec les fractions", "Exact calculation with fractions"),
    summary: translated(
      "Réduire, choisir un dénominateur commun et simplifier avant les produits.",
      "Reduce, choose a common denominator and cancel before multiplying.",
    ),
    blocks: [
      {
        type: "note",
        content: translated(
          "Une fraction représente un quotient. Multiplier son numérateur et son dénominateur par un même entier non nul ne change pas sa valeur.",
          "A fraction is a quotient. Multiplying numerator and denominator by the same non-zero integer leaves its value unchanged.",
        ),
      },
      {
        type: "formula",
        title: translated("Addition et soustraction", "Addition and subtraction"),
        content: translated(
          "$$\\frac ab+\\frac cd=\\frac{ad+bc}{bd},\\qquad \\frac ab-\\frac cd=\\frac{ad-bc}{bd}.$$ Un plus petit dénominateur commun peut rendre le calcul plus court.",
          "$$\\frac ab+\\frac cd=\\frac{ad+bc}{bd},\\qquad \\frac ab-\\frac cd=\\frac{ad-bc}{bd}.$$ A least common denominator often shortens the calculation.",
        ),
      },
      {
        type: "formula",
        title: translated("Produit et quotient", "Product and quotient"),
        content: translated(
          "$$\\frac ab\\times\\frac cd=\\frac{ac}{bd},\\qquad \\frac ab\\div\\frac cd=\\frac ab\\times\\frac dc.$$ Pour le quotient, $c$ et $d$ doivent être non nuls.",
          "$$\\frac ab\\times\\frac cd=\\frac{ac}{bd},\\qquad \\frac ab\\div\\frac cd=\\frac ab\\times\\frac dc.$$ For the quotient, $c$ and $d$ must be non-zero.",
        ),
      },
      {
        type: "example",
        title: translated("Comparer exactement", "Exact comparison"),
        content: translated(
          "Pour des dénominateurs positifs, $\\frac ab<\\frac cd$ équivaut à $ad<bc$. Par exemple, $\\frac57<\\frac34$ car $5\\times4=20<21=3\\times7$.",
          "For positive denominators, $\\frac ab<\\frac cd$ is equivalent to $ad<bc$. For example, $\\frac57<\\frac34$ because $5\\times4=20<21=3\\times7$.",
        ),
      },
      {
        type: "remark",
        content: translated(
          "Une réponse décimale peut être numériquement juste mais ne remplace pas une valeur exacte lorsque la consigne demande une fraction irréductible.",
          "A decimal may be numerically correct but does not replace an exact value when a reduced fraction is requested.",
        ),
      },
    ],
  },
  {
    id: "elementary-identities",
    title: translated("Les trois identités remarquables", "The three standard identities"),
    summary: "",
    blocks: [
      {
        type: "formula",
        content: translated(
          "$$(a+b)^2=a^2+2ab+b^2$$ $$(a-b)^2=a^2-2ab+b^2$$ $$(a-b)(a+b)=a^2-b^2$$",
          "$$(a+b)^2=a^2+2ab+b^2$$ $$(a-b)^2=a^2-2ab+b^2$$ $$(a-b)(a+b)=a^2-b^2$$",
        ),
      },
    ],
  },
  {
    id: "elementary-distributivity",
    title: translated("Développer avec la distributivité", "Expanding with distributivity"),
    summary: translated(
      "Multiplier chaque terme, respecter les signes, puis réduire les termes semblables.",
      "Multiply every term, track signs, then collect like terms.",
    ),
    blocks: [
      {
        type: "formula",
        content: translated(
          "$$k(a+b)=ka+kb,\\qquad (a+b)(c+d)=ac+ad+bc+bd.$$",
          "$$k(a+b)=ka+kb,\\qquad (a+b)(c+d)=ac+ad+bc+bd.$$",
        ),
      },
      {
        type: "example",
        content: translated(
          "$$-3(x-4)=-3x+12.$$ Le produit de deux nombres négatifs est positif.",
          "$$-3(x-4)=-3x+12.$$ The product of two negative numbers is positive.",
        ),
      },
      {
        type: "example",
        content: translated(
          "$$(2x-1)(3x+4)=6x^2+8x-3x-4=6x^2+5x-4.$$",
          "$$(2x-1)(3x+4)=6x^2+8x-3x-4=6x^2+5x-4.$$",
        ),
      },
      {
        type: "remark",
        content: translated(
          "Développer et réduire sont deux étapes distinctes : commence par écrire tous les produits, puis regroupe les mêmes puissances de $x$.",
          "Expansion and collection are separate steps: first write every product, then group equal powers of $x$.",
        ),
      },
    ],
  },
  {
    id: "elementary-factorization",
    title: translated("Choisir une factorisation", "Choosing a factorisation"),
    summary: translated(
      "Chercher d’abord un facteur commun, puis une identité remarquable.",
      "Look first for a common factor, then for a standard identity.",
    ),
    blocks: [
      {
        type: "note",
        content: translated(
          "Factoriser consiste à transformer une somme en produit. La nouvelle expression doit être égale à l’ancienne pour toute valeur de la variable.",
          "Factorisation turns a sum into a product. The new expression must equal the original for every value of the variable.",
        ),
      },
      {
        type: "formula",
        title: translated("Facteur commun", "Common factor"),
        content: translated("$$ka+kb=k(a+b).$$", "$$ka+kb=k(a+b).$$"),
      },
      {
        type: "example",
        content: translated(
          "$$6x^2-54=6(x^2-9)=6(x-3)(x+3).$$ La factorisation n’est complète qu’après la différence de carrés.",
          "$$6x^2-54=6(x^2-9)=6(x-3)(x+3).$$ The factorisation is complete only after using the difference of squares.",
        ),
      },
      {
        type: "remark",
        content: translated(
          "Contrôle rapide : redévelopper mentalement la réponse doit restituer exactement l’expression de départ.",
          "Quick check: mentally expanding the answer should recover the original expression exactly.",
        ),
      },
    ],
  },
  {
    id: "elementary-square-roots",
    title: translated("Racines carrées exactes", "Exact square roots"),
    summary: translated(
      "Extraire les facteurs carrés sans utiliser d’approximation décimale.",
      "Extract square factors without decimal approximation.",
    ),
    blocks: [
      {
        type: "note",
        content: translated(
          "Pour $a\\geq0$, $\\sqrt a$ désigne l’unique nombre positif ou nul dont le carré vaut $a$. Ainsi $\\sqrt{a^2}=|a|$, et non toujours $a$.",
          "For $a\\geq0$, $\\sqrt a$ is the unique non-negative number whose square is $a$. Thus $\\sqrt{a^2}=|a|$, not always $a$.",
        ),
      },
      {
        type: "formula",
        content: translated(
          "Pour $a,b\\geq0$ et $b>0$, $$\\sqrt{ab}=\\sqrt a\\sqrt b,\\qquad \\sqrt{\\frac ab}=\\frac{\\sqrt a}{\\sqrt b}.$$",
          "For $a,b\\geq0$ and $b>0$, $$\\sqrt{ab}=\\sqrt a\\sqrt b,\\qquad \\sqrt{\\frac ab}=\\frac{\\sqrt a}{\\sqrt b}.$$",
        ),
      },
      {
        type: "example",
        content: translated(
          "$$\\sqrt{72}=\\sqrt{36\\times2}=6\\sqrt2.$$ Le radicand $2$ ne contient plus de facteur carré.",
          "$$\\sqrt{72}=\\sqrt{36\\times2}=6\\sqrt2.$$ The radicand $2$ has no square factor left.",
        ),
      },
      {
        type: "remark",
        content: translated(
          "La règle $\\sqrt{a+b}=\\sqrt a+\\sqrt b$ est fausse en général.",
          "The rule $\\sqrt{a+b}=\\sqrt a+\\sqrt b$ is generally false.",
        ),
      },
    ],
  },
  {
    id: "elementary-powers",
    title: translated("Règles sur les puissances", "Rules for powers"),
    summary: translated(
      "Mettre les termes à la même base avant d’agir sur les exposants.",
      "Rewrite terms with the same base before operating on exponents.",
    ),
    blocks: [
      {
        type: "formula",
        content: translated(
          "Pour $a\\neq0$, $$a^p a^q=a^{p+q},\\qquad \\frac{a^p}{a^q}=a^{p-q},\\qquad (a^p)^q=a^{pq},\\qquad a^{-p}=\\frac1{a^p}.$$",
          "For $a\\neq0$, $$a^p a^q=a^{p+q},\\qquad \\frac{a^p}{a^q}=a^{p-q},\\qquad (a^p)^q=a^{pq},\\qquad a^{-p}=\\frac1{a^p}.$$",
        ),
      },
      {
        type: "example",
        title: translated("Exposant littéral", "Symbolic exponent"),
        content: translated(
          "Comme $9=3^2$, $$3^n\\times9=3^n\\times3^2=3^{n+2}.$$ La règle reste la même lorsque l’exposant contient une variable.",
          "Since $9=3^2$, $$3^n\\times9=3^n\\times3^2=3^{n+2}.$$ The same rule applies when an exponent contains a variable.",
        ),
      },
      {
        type: "remark",
        content: translated(
          "On additionne les exposants dans un produit, mais on les multiplie pour une puissance de puissance. Ces deux règles ne sont pas interchangeables.",
          "Add exponents in a product, but multiply them for a power raised to a power. These rules are not interchangeable.",
        ),
      },
    ],
  },
  {
    id: "elementary-linear-equations",
    title: translated("Résoudre une équation du premier degré", "Solving a linear equation"),
    summary: translated(
      "Effectuer la même opération dans les deux membres jusqu’à isoler l’inconnue.",
      "Apply the same operation to both sides until the unknown is isolated.",
    ),
    blocks: [
      {
        type: "note",
        content: translated(
          "Une équation est une égalité à préserver. Ajouter, soustraire, multiplier ou diviser les deux membres par un même nombre non nul conserve les solutions.",
          "An equation is an equality that must be preserved. Adding, subtracting, multiplying or dividing both sides by the same non-zero number preserves its solutions.",
        ),
      },
      {
        type: "formula",
        content: translated(
          "Si $a\\neq0$, $$ax+b=c\\iff ax=c-b\\iff x=\\frac{c-b}{a}.$$",
          "If $a\\neq0$, $$ax+b=c\\iff ax=c-b\\iff x=\\frac{c-b}{a}.$$",
        ),
      },
      {
        type: "example",
        content: translated(
          "$$3x+4=10\\iff3x=6\\iff x=2.$$ Une substitution dans l’équation initiale permet de vérifier la réponse.",
          "$$3x+4=10\\iff3x=6\\iff x=2.$$ Substitute into the original equation to check the answer.",
        ),
      },
      {
        type: "remark",
        content: translated(
          "Avec des parenthèses, commence souvent par développer et réduire chaque membre. Avec des fractions, garde les valeurs exactes jusqu’à la fin.",
          "With parentheses, first expand and collect each side. With fractions, keep exact values to the end.",
        ),
      },
    ],
  },
];

export default elementaryCourseHints;
