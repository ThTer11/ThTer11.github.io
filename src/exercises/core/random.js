export function randomInteger(min, max, rng = Math.random) {
  const lower = Math.ceil(Math.min(min, max));
  const upper = Math.floor(Math.max(min, max));
  return Math.floor(rng() * (upper - lower + 1)) + lower;
}

export function randomNonZeroInteger(min, max, rng = Math.random) {
  const lower = Math.ceil(Math.min(min, max));
  const upper = Math.floor(Math.max(min, max));

  if (lower === 0 && upper === 0) {
    throw new Error("L'intervalle doit contenir au moins un entier non nul.");
  }

  if (upper < 0 || lower > 0) {
    return randomInteger(lower, upper, rng);
  }

  const index = randomInteger(0, upper - lower - 1, rng);
  const candidate = lower + index;
  return candidate >= 0 ? candidate + 1 : candidate;
}

export function pickRandom(items, rng = Math.random) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Impossible de choisir dans une liste vide.");
  }

  return items[randomInteger(0, items.length - 1, rng)];
}

export function weightedPick(items, rng = Math.random) {
  const available = items.filter((item) => (item.weight ?? 1) > 0);

  if (available.length === 0) {
    throw new Error("Au moins une variante doit avoir un poids positif.");
  }

  const total = available.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  let cursor = rng() * total;

  for (const item of available) {
    cursor -= item.weight ?? 1;
    if (cursor <= 0) {
      return item;
    }
  }

  return available[available.length - 1];
}

export function shuffle(items, rng = Math.random) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = randomInteger(0, index, rng);
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }

  return copy;
}
