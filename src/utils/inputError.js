export class InputError extends Error {
  constructor(fr, en) {
    super(fr);
    this.englishMessage = en;
  }
}

export function inputErrorMessage(error, lang, fallback) {
  if (!(error instanceof InputError)) return fallback;
  return lang === "en" ? error.englishMessage : error.message;
}
