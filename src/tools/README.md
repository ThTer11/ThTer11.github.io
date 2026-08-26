# Outils étudiants

Les outils historiques ci-dessous restent des pages spécialisées. Les nouveaux entraînements configurables utilisent le moteur documenté dans [`docs/ADDING_EXERCISES.md`](../../docs/ADDING_EXERCISES.md).

## Ajouter un outil

1. Créer la page React dans `src/pages`.
2. Ajouter sa route dans `src/App.jsx`.
3. Ajouter sa carte dans `src/tools/studentTools.js`.
4. Ajouter les textes traduits dans `src/translations.js`.

Pour un nouvel exercice du catalogue mathématique, ces quatre étapes ne sont pas nécessaires : ajouter principalement sa configuration dans `src/exercises/definitions/`.

## Outils TikZ

- `src/tools/tikz/figureModel.js` contient le modèle géométrique, l'import TikZ et la génération TikZ des figures.
- `src/tools/variation/VariationTableEditor.jsx` contient l'interface d'édition des tableaux de variation.
- `src/utils/variationTable.js` contient les données simples, la logique et la génération TikZ des tableaux de variation.
