import { pickRandom, weightedPick } from "./random";

const QUESTION_SIGNATURE_IGNORED_KEYS = new Set([
  "answerDisplay",
  "courseHintIds",
  "explanation",
  "hints",
  "insight",
  "variant",
]);

function stableSerialize(value, ancestors = new Set()) {
  if (value === undefined) return "undefined";
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (typeof value === "bigint") return `bigint:${value.toString()}`;
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "function") return `function:${value.name || "anonymous"}`;
  if (typeof value !== "object") return String(value);

  if (ancestors.has(value)) return "[circular]";

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item, nextAncestors)).join(",")}]`;
  }

  const entries = Object.keys(value)
    .filter((key) => !QUESTION_SIGNATURE_IGNORED_KEYS.has(key))
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key], nextAncestors)}`);

  return `{${entries.join(",")}}`;
}

export function createQuestionSignature(question) {
  if (question?.dedupeKey !== undefined) {
    return `dedupe:${stableSerialize(question.dedupeKey)}`;
  }

  return stableSerialize(question);
}

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
  const unseenQuestions = context.seenSignatures instanceof Set
    ? questions.filter((question) => {
        const normalizedQuestion = {
          prompt: "",
          explanation: "",
          hints: [],
          courseHintIds: context.tool?.courseHintIds ?? [],
          ...question,
        };

        return !context.seenSignatures.has(createQuestionSignature(normalizedQuestion));
      })
    : [];
  const availableQuestions = unseenQuestions.length > 0 ? unseenQuestions : questions;

  return { ...pickRandom(availableQuestions, context.rng) };
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

export function createQuestion(tool, difficulty, rng = Math.random, level = null, options = {}) {
  const context = { difficulty, exercise: difficulty, level, rng, tool, ...options };
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

export function createQuestionAvoidingDuplicates(
  tool,
  difficulty,
  rng = Math.random,
  level = null,
  seenSignatures = new Set(),
  maximumAttempts = 60,
) {
  const attempts = Math.max(1, Number(maximumAttempts) || 1);
  let fallbackQuestion;
  let fallbackSignature;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const question = createQuestion(tool, difficulty, rng, level, { seenSignatures });
    const signature = createQuestionSignature(question);
    fallbackQuestion = question;
    fallbackSignature = signature;

    if (!seenSignatures.has(signature)) {
      return { question, signature, repeated: false };
    }
  }

  return {
    question: fallbackQuestion,
    signature: fallbackSignature,
    repeated: true,
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
