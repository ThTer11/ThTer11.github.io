import { pickRandom, weightedPick } from "./random";

function matchesDifficulty(question, difficulty) {
  if (question.difficulty === undefined || difficulty === undefined) {
    return true;
  }

  if (Array.isArray(question.difficulty)) {
    return question.difficulty.includes(difficulty);
  }

  return question.difficulty === difficulty;
}

function matchesLevel(question, level) {
  if (question.level === undefined || level === undefined || level === null) {
    return true;
  }

  if (Array.isArray(question.level)) {
    return question.level.map(String).includes(String(level));
  }

  return String(question.level) === String(level);
}

function fromBank(source, context) {
  const bank = typeof source.questions === "function"
    ? source.questions(context)
    : source.questions;
  const matching = (bank ?? []).filter((question) =>
    matchesDifficulty(question, context.difficulty) && matchesLevel(question, context.level));
  const questions = matching.length > 0 ? matching : bank;

  return { ...pickRandom(questions, context.rng) };
}

function fromGenerator(source, context) {
  if (typeof source.generate !== "function") {
    throw new Error("La source générée doit fournir une fonction generate.");
  }

  return source.generate(context);
}

export function generateQuestionFromSource(source, context) {
  if (!source) {
    throw new Error("Cet outil ne possède aucune source de questions.");
  }

  if (source.type === "generator") {
    return fromGenerator(source, context);
  }

  if (source.type === "bank") {
    return fromBank(source, context);
  }

  if (source.type === "mix") {
    const selected = weightedPick(source.sources ?? [], context.rng);
    const question = generateQuestionFromSource(selected.source ?? selected, context);
    return { variant: selected.id, ...question };
  }

  throw new Error(`Type de source inconnu : ${source.type}`);
}

export function createQuestion(tool, difficulty, rng = Math.random, level = null) {
  const context = { difficulty, exercise: difficulty, level, rng, tool };
  const question = generateQuestionFromSource(tool.source, context);

  if (!question || question.expected === undefined) {
    throw new Error(`Le générateur de « ${tool.id} » doit fournir expected.`);
  }

  return {
    prompt: "",
    explanation: "",
    hints: [],
    courseHintIds: tool.courseHintIds ?? [],
    ...question,
  };
}

export function pickStudyExercise(tool, difficulty, rng = Math.random, level = null) {
  const source = tool.source;

  if (source?.type !== "bank") {
    throw new Error("Le mode corrigé utilise une banque d'exercices.");
  }

  const bank = (source.questions ?? []).filter((question) =>
    matchesDifficulty(question, difficulty) && matchesLevel(question, level));
  return { ...pickRandom(bank.length > 0 ? bank : source.questions, rng) };
}
