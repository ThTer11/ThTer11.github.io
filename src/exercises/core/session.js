export function createSession(questionCount, startedAt = Date.now()) {
  return {
    questionCount,
    completed: 0,
    answered: 0,
    correct: 0,
    correctOnTime: 0,
    correctLate: 0,
    incorrect: 0,
    timedCompleted: 0,
    timedOut: 0,
    unanswered: 0,
    streak: 0,
    bestStreak: 0,
    totalAnswerTimeMs: 0,
    startedAt,
    attempts: [],
  };
}

export function recordAttempt(session, outcome, elapsedMs = 0, details = {}) {
  const correct = Boolean(outcome.correct);
  const submitted = outcome.submitted !== false && !outcome.unanswered;
  const timing = outcome.timing ?? (outcome.timedOut ? "late" : "untimed");
  const timed = timing !== "untimed";
  const timedOut = timing === "late" || timing === "expired";
  const unanswered = !submitted;
  const streak = correct && !timedOut ? session.streak + 1 : 0;

  return {
    ...session,
    completed: session.completed + 1,
    answered: session.answered + (submitted ? 1 : 0),
    correct: session.correct + (correct ? 1 : 0),
    correctOnTime: session.correctOnTime + (correct && timing === "on-time" ? 1 : 0),
    correctLate: session.correctLate + (correct && timing === "late" ? 1 : 0),
    incorrect: session.incorrect + (!correct && submitted ? 1 : 0),
    timedCompleted: session.timedCompleted + (timed ? 1 : 0),
    timedOut: session.timedOut + (timedOut ? 1 : 0),
    unanswered: session.unanswered + (unanswered ? 1 : 0),
    streak,
    bestStreak: Math.max(session.bestStreak, streak),
    totalAnswerTimeMs: session.totalAnswerTimeMs + (submitted ? Math.max(0, elapsedMs) : 0),
    attempts: [
      ...(session.attempts ?? []),
      {
        number: session.completed + 1,
        correct,
        submitted,
        timing,
        timedOut,
        unanswered,
        elapsedMs: Math.max(0, elapsedMs),
        ...details,
      },
    ],
  };
}

export function sessionSummary(session) {
  return {
    ...session,
    successRate: session.completed === 0
      ? 0
      : Math.round((session.correct / session.completed) * 100),
    accuracyRate: session.answered === 0
      ? 0
      : Math.round((session.correct / session.answered) * 100),
    timedSuccessRate: session.timedCompleted === 0
      ? null
      : Math.round((session.correctOnTime / session.timedCompleted) * 100),
    averageTimeMs: session.answered === 0
      ? 0
      : Math.round(session.totalAnswerTimeMs / session.answered),
  };
}
