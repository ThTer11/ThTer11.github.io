import { createSession, recordAttempt, sessionSummary } from "./session";

describe("exercise session statistics", () => {
  test("records score, streak and exact session timing", () => {
    let session = createSession(3, 1000);
    session = recordAttempt(session, { correct: true }, 1200);
    session = recordAttempt(session, { correct: true }, 800);
    session = recordAttempt(session, { correct: false }, 1000);
    const summary = sessionSummary(session);

    expect(summary).toMatchObject({
      completed: 3,
      answered: 3,
      correct: 2,
      correctOnTime: 0,
      correctLate: 0,
      incorrect: 1,
      timedCompleted: 0,
      timedOut: 0,
      unanswered: 0,
      streak: 0,
      bestStreak: 2,
      successRate: 67,
      averageTimeMs: 1000,
    });
    expect(summary.attempts.map((attempt) => attempt.elapsedMs)).toEqual([1200, 800, 1000]);
  });

  test("separates a late correct answer from an unanswered timeout", () => {
    let session = createSession(3);
    session = recordAttempt(session, { correct: true, timing: "late", submitted: true }, 2200);
    session = recordAttempt(session, {
      correct: false,
      timing: "expired",
      submitted: false,
    }, 3000);
    const summary = sessionSummary(session);

    expect(summary).toMatchObject({
      completed: 2,
      answered: 1,
      correct: 1,
      correctOnTime: 0,
      correctLate: 1,
      incorrect: 0,
      timedCompleted: 2,
      timedOut: 2,
      unanswered: 1,
      streak: 0,
      successRate: 50,
      accuracyRate: 100,
      timedSuccessRate: 0,
      averageTimeMs: 2200,
    });
  });

  test("breaks the current streak when a correct answer is late", () => {
    let session = createSession(3);
    session = recordAttempt(session, { correct: true, timing: "on-time", submitted: true });
    session = recordAttempt(session, { correct: true, timing: "on-time", submitted: true });
    session = recordAttempt(session, { correct: true, timing: "late", submitted: true });

    expect(session).toMatchObject({
      correct: 3,
      correctLate: 1,
      timedOut: 1,
      streak: 0,
      bestStreak: 2,
    });
  });
});
