# Comment ajouter un nouvel outil d’entraînement

Ce guide est conçu pour pouvoir être repris sans connaître React. Dans le cas habituel, ajouter un outil consiste à copier un objet de configuration dans un fichier de catégorie. Il n’est pas nécessaire de créer une page, une route, une carte ou une feuille de style.

## Où se trouvent les éléments importants ?

```text
src/exercises/
├── categories.js              liste des grandes catégories
├── registry.js                rassemble les catégories, outils et rappels
├── definitions/               configurations des outils par catégorie
├── content/                   rappels de cours et textes génériques
├── core/                      moteur, sources, validateurs et statistiques
├── math/                      fonctions mathématiques pures
└── examples/                  exemples commentés à copier

src/components/exercises/      interface générique (à modifier rarement)
src/pages/Exercise*.jsx        trois pages génériques, valables pour tous les outils
src/exercise.css               style commun
```

Les trois routes sont génériques :

```text
/:lang/entrainements
/:lang/entrainements/:categorie
/:lang/entrainements/:categorie/:outil
```

Un nouvel objet ajouté au registre obtient donc automatiquement sa carte et son URL.

## Le modèle mental le plus simple

Un outil décrit quatre choses :

1. son identité : titre, catégorie, description ;
2. la manière de produire une question (`source`) ;
3. la forme de la réponse (`answer`) ;
4. les options de la série : niveaux, chronomètre, correction, score.

Une question produite par une source contient au minimum :

```js
{
  prompt: "Calculer $13^2$.",
  expected: 169,
}
```

Elle peut aussi contenir :

```js
{
  explanation: "On peut utiliser $(10+3)^2$.",
  hints: ["Décomposer $13$ en $10+3$."],
  insight: "$13^2=169$ est un carré parfait utile à mémoriser.",
  courseHintIds: ["elementary-squares"],
  answerDisplay: "$$169$$",
}
```

Le moteur prend ensuite en charge la saisie, Entrée, le focus, la validation, le score, le temps, la correction et la question suivante.

## Ajouter un outil simple : « Carrés parfaits »

Ouvrir `src/exercises/definitions/elementary.js`, puis ajouter cet objet dans le tableau `elementaryTools` :

```js
{
  id: "carres-parfaits",
  categoryId: "calcul-elementaire",
  title: { fr: "Carrés parfaits", en: "Perfect squares" },
  description: {
    fr: "Mémoriser rapidement les carrés usuels.",
    en: "Recall common perfect squares quickly.",
  },
  audience: "L1",

  series: {
    questionCount: 10,
    choices: [5, 10, 20],
  },

  source: {
    type: "generator",
    generate: ({ rng }) => {
      const n = randomInteger(2, 20, rng);
      return {
        prompt: `Calculer $${n}^2$.`,
        expected: n * n,
        explanation: `$${n}^2=${n}\\times ${n}=${n * n}$.`,
      };
    },
  },

  answer: { type: "integer" },
  score: true,
  feedback: { showCorrection: true, showExplanation: true },
}
```

Vérifier que le début du fichier importe bien :

```js
import { randomInteger } from "../core/random";
```

Rien d’autre n’est nécessaire : ni composant React, ni route, ni HTML.

Une version entièrement commentée se trouve dans `src/exercises/examples/perfectSquares.example.js`.

### Choisir les longueurs de série proposées

Par défaut, `choices` décrit des valeurs discrètes. Le curseur affiche un repère à chaque position et ne peut sélectionner que ces nombres :

```js
series: {
  questionCount: 5,
  choices: [5, 10, 15, 20],
}
```

Pour autoriser au contraire toutes les valeurs d’un intervalle, activer explicitement le mode continu :

```js
series: {
  questionCount: 10,
  questionCountMode: "continuous",
  minQuestions: 1,
  maxQuestions: 30,
  questionStep: 1,
}
```

## Générer une question aléatoire

La fonction `generate` reçoit toujours un objet contenant :

```js
{
  difficulty, // identifiant du niveau sélectionné
  rng,        // générateur aléatoire, à transmettre aux helpers
  tool,       // configuration complète de l’outil
}
```

Helpers disponibles dans `src/exercises/core/random.js` :

```js
randomInteger(min, max, rng)
randomNonZeroInteger(min, max, rng)
pickRandom(liste, rng)
weightedPick(listePonderee, rng)
shuffle(liste, rng)
```

Toujours utiliser le `rng` reçu plutôt que `Math.random()` directement. Les générateurs restent ainsi testables.

Exemple avec entiers relatifs et résultat positif imposé :

```js
generate: ({ rng }) => {
  const result = randomInteger(0, 40, rng);
  const b = randomInteger(-15, 25, rng);
  const a = result - b;

  return {
    prompt: `Calculer $${a}+(${b})$.`,
    expected: result,
  };
}
```

## Séparer les exercices et leurs niveaux

Lorsque les grands choix représentent des exercices différents autour d’une même notion, utiliser `exercises`. Chaque exercice peut avoir sa couleur et ses propres niveaux numériques :

```js
exercises: [
  {
    id: "recognize",
    label: { fr: "Reconnaître" },
    description: { fr: "Dire si la forme est remarquable." },
    color: "sky",
    levels: [1, 2, 3],
    defaultLevel: 1,
  },
  {
    id: "factor",
    label: { fr: "Factoriser" },
    color: "violet",
    levels: [1, 2, 3],
  },
  {
    id: "review",
    label: { fr: "Bilan" },
    description: { fr: "Toutes les variantes au niveau maximal." },
    color: "gold",
    // Aucun cercle de niveau : le générateur traite directement le niveau maximal.
  },
],
defaultExercise: "recognize",
```

Les couleurs nommées disponibles sont `blue`, `sky`, `emerald`, `violet`, `rose`, `orange` et `gold`. Toute couleur CSS, par exemple `color: "#0f766e"`, est également acceptée.

Le générateur reçoit séparément le grand exercice choisi et son niveau réel :

```js
generate: ({ exercise, level, rng }) => {
  if (exercise === "review") {
    return makeReviewQuestion({ level: 3, rng });
  }

  return makeQuestion({ exercise, level, rng });
}
```

`difficulty` reste disponible comme alias de `exercise` pour conserver la compatibilité avec les anciens générateurs. Une entrée sans `levels` n’affiche aucun petit cercle.

### Activer le chronomètre exercice par exercice

Lorsqu’un outil contient plusieurs exercices, chaque carte peut reprendre ou désactiver le chronomètre général :

```js
exercises: [
  { id: "addition", timer: true, levels: [1, 2, 3], label: { fr: "Additions" } },
  { id: "subtraction", timer: false, levels: [1, 2, 3], label: { fr: "Soustractions" } },
],
timer: {
  enabled: true,
  mode: "per-question",
  seconds: {
    addition: { 1: 5, 2: 7, 3: 10 },
  },
  strict: false,
},
```

- `timer: true` reprend la configuration générale et affiche l’icône de chronomètre sur la carte ;
- `timer: false` désactive entièrement le chronomètre pour cet exercice ;
- `timer: { ... }` permet de remplacer localement le temps ou le mode.

L’icône ne modifie pas la hauteur de la carte : elle est placée dans l’espace supérieur droit prévu à cet effet.

## Ajouter un choix simple de difficulté

Pour un ancien outil où chaque grand bouton représente directement un niveau, la configuration `difficulties` reste disponible :

Ajouter la liste des niveaux sur l’outil :

```js
difficulties: [
  { id: "level-1", label: { fr: "Niveau 1" }, description: { fr: "Petits entiers" } },
  { id: "level-2", label: { fr: "Niveau 2" }, description: { fr: "Entiers relatifs" } },
  { id: "level-3", label: { fr: "Niveau 3" }, description: { fr: "Mélange" } },
],
defaultDifficulty: "level-1",
```

Puis adapter le générateur :

```js
generate: ({ difficulty, rng }) => {
  const bounds = {
    "level-1": [1, 10],
    "level-2": [-20, 20],
    "level-3": [-100, 100],
  }[difficulty];

  const a = randomInteger(bounds[0], bounds[1], rng);
  const b = randomInteger(bounds[0], bounds[1], rng);
  return { prompt: `$${a}+(${b})$`, expected: a + b };
}
```

Un outil sans propriété `difficulties` fonctionne aussi.

## Mélanger plusieurs variantes avec des poids

Une source `mix` choisit une sous-source selon son poids :

```js
source: {
  type: "mix",
  sources: [
    {
      id: "product",
      weight: 4,
      source: {
        type: "generator",
        generate: generatePowerProduct,
      },
    },
    {
      id: "quotient",
      weight: 2,
      source: {
        type: "generator",
        generate: generatePowerQuotient,
      },
    },
    {
      id: "power-of-power",
      weight: 1,
      source: {
        type: "generator",
        generate: generatePowerOfPower,
      },
    },
  ],
},
```

Ici, les produits apparaissent environ quatre fois plus souvent que les puissances de puissances.

## Ajouter un outil depuis une banque de questions

Une banque convient aux primitives, astuces et exercices écrits à la main :

```js
const primitiveBank = [
  {
    difficulty: "immediate",
    prompt: "Donner une primitive de $x^4$.",
    expected: "x^5/5",
    explanation: "On utilise $\\int x^n\\,dx=\\frac{x^{n+1}}{n+1}+C$.",
  },
  {
    difficulty: "immediate",
    prompt: "Donner une primitive de $3x^2$.",
    expected: "x^3",
  },
];

const primitivesTool = {
  id: "primitives-immediates",
  categoryId: "analyse", // la catégorie doit d’abord exister
  title: { fr: "Primitives immédiates" },
  description: { fr: "Reconnaître les formes usuelles." },
  difficulties: [
    { id: "immediate", label: { fr: "Immédiates" } },
  ],
  source: {
    type: "bank",
    questions: primitiveBank,
  },
  answer: { type: "expression" },
};
```

Le moteur filtre d’abord la banque selon `difficulty`, puis choisit une question aléatoirement.

Attention : le validateur polynomial actuel couvre les polynômes et coefficients rationnels, mais pas encore les fonctions transcendantes ou la constante additive d’une primitive. Pour une banque réelle de primitives, ajouter un validateur spécialisé dans `answer.validator`.

## Créer un exercice corrigé traditionnel

Le même catalogue sait afficher un mode énoncé–indices–solution :

```js
{
  id: "factorisation-guidee",
  categoryId: "calcul-elementaire",
  mode: "study",
  title: { fr: "Factorisation guidée" },
  description: { fr: "Chercher progressivement, puis consulter la correction." },
  source: {
    type: "bank",
    questions: [
      {
        statement: "Factoriser $x^2-9$.",
        hints: [
          "Reconnaître une différence de deux carrés.",
          "Utiliser $a^2-b^2=(a-b)(a+b)$.",
        ],
        solution: "$x^2-9=x^2-3^2=(x-3)(x+3)$.",
        insight: "Le calcul du discriminant serait correct, mais inutile ici.",
      },
    ],
  },
}
```

Le mode `study` n’affiche pas de champ de réponse. Les indices sont révélés un par un.

## Types de réponses déjà disponibles

| Type | Configuration minimale | Remarque |
|---|---|---|
| Entier | `{ type: "integer" }` | calcul exact |
| Nombre/décimal | `{ type: "number" }` ou `{ type: "decimal" }` | décimaux finis exacts, virgule française acceptée |
| Fraction | `{ type: "fraction" }` | `1/2`, `2/4`, `0.5` peuvent être équivalents |
| Expression | `{ type: "expression" }` | équivalence exacte pour polynômes rationnels pris en charge |
| Texte | `{ type: "text" }` | casse ignorée par défaut |
| Choix | `{ type: "choice" }` | fournir `options` sur la question |
| Vrai/faux | `{ type: "boolean" }` | réponse attendue booléenne |
| Ensemble | `{ type: "solution-set", elementType: "number" }` | ordre ignoré, séparateur conseillé `;` |
| Plusieurs champs | `{ type: "multiple-fields", fields: [...] }` | chaque champ a son propre type |
| Vecteur | `{ type: "vector", size: 3 }` | saisie composante par composante |
| Matrice | `{ type: "matrix", dimensions: [2, 2] }` | saisie par cellules |
| Coordonnées | `{ type: "coordinates", size: 2 }` | même interface qu’un vecteur |
| Graphique | `{ type: "graphic", validator: ... }` | adaptateur prévu, validateur spécialisé obligatoire |

### Changer le type de réponse selon le niveau ou la question

`tool.answer` définit le type par défaut. Une question peut fournir son propre bloc `answer`, par exemple pour alterner entre un calcul et une décision Vrai/Faux :

```js
answer: {
  type: "expression",
  validator: polynomialFormValidator,
},
source: {
  type: "generator",
  generate: ({ difficulty }) => {
    if (difficulty === "identify") {
      return {
        prompt: "Vrai ou faux : $x^2+4x+4$ est une identité remarquable.",
        expected: true,
        answer: { type: "boolean" },
        answerDisplay: { fr: "Vrai", en: "True" },
      };
    }

    return {
      prompt: "Factoriser $x^2+4x+4$.",
      expected: "(x+2)^2",
    };
  },
}
```

Quand la question déclare un type différent, sa configuration remplace les options propres au type par défaut : un validateur d’expression n’est donc pas réutilisé sur une réponse booléenne. Un mode mélangé peut ainsi changer de composant de saisie à chaque question.

### Fraction irréductible imposée

```js
answer: {
  type: "fraction",
  requireReduced: true,
  allowDecimal: false,
}
```

`6/8` pour `3/4` est alors signalé comme valeur équivalente, mais forme non conforme. Ce n’est pas compté comme une bonne réponse.

### Forme algébrique imposée

```js
answer: {
  type: "expression",
  requiredForm: "factorized", // ou "developed"
}
```

Le moteur vérifie d’abord l’équivalence mathématique, puis la forme. Ainsi `x^2-1` est équivalent à `(x-1)(x+1)`, mais refusé si la consigne exige une factorisation.

Le parseur est volontairement sûr : il n’utilise jamais `eval` ou `Function`. Il couvre les polynômes en plusieurs variables, les coefficients rationnels, les puissances entières positives et la division par une constante. Pour les racines, exponentielles, logarithmes, puissances à exposant littéral ou paramétrisations générales, utiliser un validateur mathématique spécialisé.

### Validateur spécialisé

```js
answer: {
  type: "text",
  validator: (value, { expected, lang }) => {
    const correct = myPureMathFunction(value, expected);
    return {
      correct,
      status: correct ? "correct" : "incorrect",
      message: correct
        ? (lang === "en" ? "Correct answer." : "Bonne réponse.")
        : (lang === "en" ? "Try again." : "À revoir."),
    };
  },
}
```

Placer `myPureMathFunction` dans `src/exercises/math/`, pas dans un composant React, puis ajouter des tests.

## Choix multiple

La source fournit les options et l’identifiant attendu :

```js
return {
  prompt: "Combien l’équation $x^2+1=0$ a-t-elle de solutions réelles ?",
  options: [
    { id: "zero", label: { fr: "0 solution" } },
    { id: "one", label: { fr: "1 solution" } },
    { id: "two", label: { fr: "2 solutions" } },
  ],
  expected: "zero",
};
```

Et l’outil contient simplement :

```js
answer: { type: "choice" }
```

## Matrice ou plusieurs champs

Pour une matrice générée :

```js
return {
  prompt: "Calculer $AB$.",
  inputDimensions: [2, 2],
  expected: [[1, 2], [3, 4]],
};
```

Pour plusieurs résultats distincts :

```js
return {
  prompt: "Résoudre le système.",
  fields: [
    { id: "x", label: "$x=$", answer: { type: "fraction" } },
    { id: "y", label: "$y=$", answer: { type: "fraction" } },
  ],
  expected: { x: "1/2", y: "-3" },
};
```

L’outil utilise alors `answer: { type: "multiple-fields" }`.

## Ajouter un chronomètre

Temps par question, indicatif :

```js
timer: {
  enabled: true,
  mode: "per-question",
  seconds: 12,
  strict: false,
  show: true,
}
```

Temps différent selon le niveau :

```js
timer: {
  enabled: true,
  mode: "per-question",
  seconds: {
    "level-1": 8,
    "level-2": 15,
    default: 12,
  },
  strict: true,
}
```

Temps pour toute la série :

```js
timer: {
  enabled: true,
  mode: "series",
  seconds: 120,
  strict: true,
}
```

Sans chronomètre : supprimer la propriété ou écrire `timer: false`.

Le sens de `strict` est important :

- `strict: true` finalise la question à zéro. L'absence de réponse est comptée
  dans « Hors délai », mais **pas** dans « Erreurs », puis la bonne réponse est affichée ;
- `strict: false` laisse répondre après zéro. Une réponse juste reste alors une
  bonne réponse mathématique, tout en ajoutant également un « Hors délai ».

Les outils chronométrés fournis utilisent `strict: true`. Le mode indicatif reste
utile pour un entraînement où l'on veut mesurer la vitesse sans bloquer la saisie.

## Régler la série, le score et les statistiques

Les options restent indépendantes. Voici une configuration complète ; ne conserver que les lignes utiles :

```js
series: {
  questionCount: 10,          // valeur proposée au départ
  choices: [5, 10, 20],      // choix affichés à l'étudiant
  allowQuestionCount: true,
  allowRestart: true,
},
score: true,                  // score visible
statistics: true,             // réussite, erreurs, streak et temps moyen
persistSettings: true,        // mémoriser localement niveau et longueur
```

- `score: false` masque le score ;
- `statistics: false` garde seulement le score simple ;
- `score: false, statistics: true` affiche les statistiques sans grand score ;
- `series: false` crée une activité d'une seule question sans sélecteur de longueur ;
- `allowRestart: false` retire le bouton permettant de recommencer en fin de série.

Les statistiques distinguent automatiquement : bonnes réponses, vraies erreurs,
questions hors délai et questions sans réponse. Une réponse juste mais tardive
apparaît donc à la fois dans « Bonnes réponses » et dans « Hors délai ».

Pour passer automatiquement à la suite après une réponse :

```js
feedback: {
  autoNext: {
    enabled: true,
    onlyCorrect: true, // false : avancer aussi après une erreur
    delayMs: 700,
  },
}
```

Pour garder le passage manuel mais retirer uniquement le bouton, utiliser
`feedback: { showNextButton: false }`. La touche Entrée reste disponible.

## Ajouter un rappel de cours

Dans le fichier `src/exercises/content/elementaryHints.js` (ou celui de la catégorie) :

```js
{
  id: "elementary-product-powers",
  title: { fr: "Produit de puissances de même base" },
  blocks: [
    {
      type: "formula",
      content: { fr: "Pour une même base : $a^p\\times a^q=a^{p+q}$." },
    },
    {
      type: "example",
      title: { fr: "Exemple" },
      content: { fr: "$3^4\\times 3^7=3^{11}$." },
    },
  ],
}
```

Pour que le rappel apparaisse dans le bouton **Voir les rappels de cours** avant
le démarrage, attacher son identifiant à l'outil :

```js
courseHintIds: ["elementary-product-powers"]
```

Il est également possible de mettre `courseHintIds` seulement dans une question.
Le rappel sera alors proposé avec sa correction. Les rappels présents dans une
banque statique sont automatiquement regroupés dans la vue d'ensemble.

La fenêtre d'ensemble, les modales individuelles, Échap, le focus et le style
sont pris en charge automatiquement.

## Ajouter un indice, une explication et une astuce

Ces champs appartiennent à la question et sont tous facultatifs :

```js
return {
  prompt: "Résoudre $x^2-6x+9=0$.",
  expected: [3],
  hints: ["Observer les trois termes."],
  explanation: "$x^2-6x+9=(x-3)^2$, donc $x=3$.",
  insight: "Le discriminant est inutile : c’est une identité remarquable.",
  courseHintIds: ["quadratic-shortcuts"],
};
```

Affichage configurable au niveau de l’outil :

```js
feedback: {
  showCorrection: true,
  showExplanation: true,
  showInsight: true,
  showCourseHintOnError: true,
  autoNext: {
    enabled: false,
    onlyCorrect: true,
    delayMs: 800,
  },
}
```

## Écrire du LaTeX

Toutes les chaînes `prompt`, `explanation`, `hint`, `insight`, `solution` et les rappels de cours acceptent :

```text
Maths inline : $x^2-1$
Maths centrées : $$\frac{a}{b}$$
Matrice : $$\begin{pmatrix}1&2\\3&4\end{pmatrix}$$
Système : $$\left\{\begin{aligned}x+y&=2\\x-y&=0\end{aligned}\right.$$
```

Utiliser `$...$` à l'intérieur d'une phrase : la formule garde alors la taille et
la ligne de base du texte. Réserver `$$...$$` aux formules réellement isolées et
centrées. Cela donne un rendu beaucoup plus naturel dans un énoncé.

Dans une chaîne JavaScript, doubler les antislashs : écrire `\\frac`, `\\begin`, `\\times`, etc.

Le composant `MathRenderer` enveloppe MathJax. Une configuration d’exercice n’a pas besoin de l’importer.

Par défaut, le contenu est échappé pour éviter l’injection HTML. N’utiliser `trustedHtml: true` que pour un contenu interne qui contient volontairement des balises HTML contrôlées.

## Traduire plus tard sans changer la logique

Un texte peut être une simple chaîne française :

```js
title: "Carrés parfaits"
```

Mais la forme recommandée est :

```js
title: {
  fr: "Carrés parfaits",
  en: "Perfect squares",
}
```

Si l’anglais manque, le moteur utilise automatiquement le français. Les fonctions mathématiques ne doivent contenir aucun texte d’interface.

## Ajouter un outil à une catégorie existante

1. Ouvrir le fichier de `src/exercises/definitions/` correspondant.
2. Ajouter l’objet dans le tableau exporté.
3. Vérifier que `id` est unique dans cette catégorie.
4. Exécuter les tests et le build.

Le catalogue, la carte, la page et la route sont automatiques.

## Ajouter une nouvelle catégorie

Cette opération est plus rare :

1. ajouter la catégorie à `src/exercises/categories.js` ;
2. créer, par exemple, `src/exercises/definitions/analysis.js` exportant `analysisTools` ;
3. importer ce tableau et l’ajouter à `exerciseTools` dans `src/exercises/registry.js` ;
4. faire la même chose pour ses rappels éventuels.

Aucune modification du routeur ou des pages n’est nécessaire.

## Ajouter un nouveau type de champ, seulement si nécessaire

La plupart des cas se traitent avec `multiple-fields` ou un validateur spécialisé. Si une nouvelle interaction visuelle est réellement indispensable :

1. ajouter le rendu dans `src/components/exercises/AnswerInput.jsx` ;
2. définir sa valeur vide dans `emptyAnswerValue` ;
3. ajouter sa validation pure dans `src/exercises/core/validators.js` ;
4. ajouter des tests ;
5. documenter la forme de sa valeur.

Le type `graphic` est volontairement un point d’extension : il exige un validateur explicite, afin de ne jamais prétendre qu’une interaction graphique quelconque est correcte sans règle mathématique.

## Vérifier avant de publier

```bash
CI=true npm test -- --watchAll=false --runInBand
npm run build
```

Puis tester au minimum :

- la carte dans `#/fr/entrainements` ;
- l’URL directe de l’outil ;
- une bonne réponse et une mauvaise réponse ;
- Entrée, puis Entrée pour la question suivante ;
- le niveau mobile ;
- le thème clair et sombre ;
- la version `#/en/...`, même si le contenu retombe encore sur le français.

Le déploiement normal se fait via GitHub Actions lors d’un push sur `main`. Il ne faut pas lancer en parallèle l’ancien script `npm run deploy` sans raison précise.

## Exemples prêts à copier

- `src/exercises/examples/perfectSquares.example.js` : générateur minimal ;
- `src/exercises/examples/advancedPowers.example.js` : niveaux, variantes, LaTeX, timer, rappel et astuce ;
- `src/exercises/examples/questionBank.example.js` : banque de questions et exercice corrigé.
