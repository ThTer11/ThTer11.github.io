export function localize(value, lang = "fr") {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value[lang] ?? value.fr ?? value.en ?? "";
  }

  return String(value);
}

export function localizeList(values = [], lang = "fr") {
  return values.map((value) => localize(value, lang));
}
