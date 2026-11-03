import test from "node:test";
import assert from "node:assert/strict";
import {
  canonical,
  createSession,
  defaultSettings,
  explanation,
  generateQuestions,
  parseSaved,
  questionPool,
  sessionReducer,
  summarize,
  toHistory,
  validArithmetic,
} from "../src/engine.ts";
import type { SavedState, Session } from "../src/engine.ts";
import type { HistoryEntry, Question } from "../src/engine.ts";

function enter(session: Session, answer: number): Session {
  for (const digit of String(answer))
    session = sessionReducer(session, { type: "digit", digit });
  return sessionReducer(session, { type: "submit" });
}

test("20-question rounds finish at exactly 20 in every operation mode", () => {
  for (const operation of ["add", "subtract", "mixed"] as const) {
    let session = createSession(
      { ...defaultSettings, length: 20, operation },
      63,
    );
    for (let i = 0; i < 20; i++) {
      assert.equal(session.complete, false);
      session = enter(session, session.questions[session.index].answer);
      session = sessionReducer(session, { type: "next" });
    }
    assert.equal(session.complete, true);
    assert.equal(session.responses.length, 20);
    assert.equal(summarize(session.responses).independent, 20);
  }
});

test("extra review rounds do not erase a previously troublesome skill", () => {
  const question: Question = {
    id: "subtract-76-20",
    a: 76,
    b: 20,
    op: "subtract",
    answer: 56,
    skill: "subtract:tens",
  };
  const entry: HistoryEntry = {
    id: "normal",
    completedAt: new Date().toISOString(),
    level: "garden",
    operation: "subtract",
    review: false,
    questions: [question],
    responses: [
      {
        questionId: question.id,
        attempts: [],
        usedHelp: true,
        outcome: "assisted",
      },
    ],
  };
  const reviews = Array.from({ length: 5 }, (_, i) => ({
    ...entry,
    id: `review-${i}`,
    review: true,
  }));
  const questions = generateQuestions(
    { ...defaultSettings, operation: "subtract" },
    321,
    [entry, ...reviews],
  );
  assert.ok(questions.slice(12).every((q) => q.skill === "subtract:tens"));
});

test("all supported pools have correct answers, nonnegative results, and no carrying or borrowing", () => {
  for (const level of ["gentle", "garden"] as const)
    for (const op of ["add", "subtract"] as const) {
      const limit = level === "gentle" ? 19 : 99;
      for (const q of questionPool(level, op)) {
        assert.ok(validArithmetic(q.a, q.b, q.op, limit));
        assert.equal(q.answer, op === "add" ? q.a + q.b : q.a - q.b);
        assert.ok(q.answer >= 0 && q.answer <= limit);
        if (op === "add") assert.ok((q.a % 10) + (q.b % 10) < 10);
        else
          assert.ok(
            q.a % 10 >= q.b % 10 &&
              Math.floor(q.a / 10) >= Math.floor(q.b / 10),
          );
      }
    }
});

test("1,200 seeded rounds have the requested length, balance, range, and no equivalent duplicates", () => {
  for (const level of ["gentle", "garden"] as const)
    for (const operation of ["add", "subtract", "mixed"] as const)
      for (const length of [15, 20] as const) {
        for (let seed = 0; seed < 100; seed++) {
          const settings = { ...defaultSettings, level, operation, length };
          const questions = generateQuestions(settings, seed);
          assert.equal(questions.length, length);
          assert.equal(new Set(questions.map(canonical)).size, length);
          const additions = questions.filter((q) => q.op === "add").length;
          if (operation === "mixed")
            assert.equal(additions, Math.ceil(length / 2));
          else assert.ok(questions.every((q) => q.op === operation));
          assert.ok(
            questions.every((q) =>
              validArithmetic(q.a, q.b, q.op, level === "gentle" ? 19 : 99),
            ),
          );
          if (level === "garden")
            assert.ok(
              questions
                .slice(0, length === 15 ? 3 : 4)
                .every((q) => q.a < 20 && q.b < 20 && q.answer < 20),
            );
        }
      }
});

test("seeds reproduce rounds and fresh seeds provide varied practice", () => {
  assert.deepEqual(
    generateQuestions(defaultSettings, 321),
    generateQuestions(defaultSettings, 321),
  );
  assert.notDeepEqual(
    generateQuestions(defaultSettings, 321),
    generateQuestions(defaultSettings, 322),
  );
});

test("every visual explanation adds up to the answer and subtraction never needs regrouping", () => {
  for (const level of ["gentle", "garden"] as const)
    for (const op of ["add", "subtract"] as const) {
      for (const q of questionPool(level, op)) {
        const e = explanation(q);
        assert.equal(e.tens + e.ones, q.answer);
        assert.ok(e.tens >= 0 && e.ones >= 0 && e.ones <= 9);
        assert.equal(e.tensA + e.onesA, q.a);
        assert.equal(e.tensB + e.onesB, q.b);
      }
    }
});

test("first tries, retries, hints, and guided answers are scored separately", () => {
  let s = createSession(defaultSettings, 77);
  s = enter(s, s.questions[0].answer);
  s = sessionReducer(s, { type: "next" });
  s = enter(s, 99);
  assert.equal(s.phase, "answering");
  s = enter(s, s.questions[1].answer);
  s = sessionReducer(s, { type: "next" });
  s = sessionReducer(s, { type: "help" });
  s = enter(s, s.questions[2].answer);
  s = sessionReducer(s, { type: "next" });
  s = enter(s, 99);
  s = enter(s, 99);
  assert.equal(s.phase, "walkthrough");
  s = sessionReducer(s, { type: "next" });
  assert.deepEqual(summarize(s.responses), {
    independent: 1,
    retry: 1,
    assisted: 2,
  });
  assert.deepEqual(s.responses[1].attempts, [99, s.questions[1].answer]);
});

test("empty answers, excess digits, and duplicate next taps cannot skip questions", () => {
  let s = createSession(defaultSettings, 12);
  assert.equal(sessionReducer(s, { type: "submit" }), s);
  assert.equal(sessionReducer(s, { type: "next" }), s);
  s = sessionReducer(s, { type: "digit", digit: "0" });
  s = sessionReducer(s, { type: "digit", digit: "5" });
  assert.equal(s.input, "5");
  s = sessionReducer(s, { type: "digit", digit: "3" });
  assert.equal(sessionReducer(s, { type: "digit", digit: "4" }), s);
  s = sessionReducer(s, { type: "erase" });
  assert.equal(s.input, "5");
  s = { ...s, input: "" };
  s = enter(s, s.questions[0].answer);
  const next = sessionReducer(s, { type: "next" });
  assert.equal(next.index, 1);
  assert.equal(sessionReducer(next, { type: "next" }), next);
});

test("a round finishes exactly once and a short review remains a separate round", () => {
  let s = createSession(defaultSettings, 98);
  for (let i = 0; i < 15; i++) {
    s = enter(s, s.questions[s.index].answer);
    s = sessionReducer(s, { type: "next" });
  }
  assert.equal(s.complete, true);
  assert.equal(s.responses.length, 15);
  assert.equal(sessionReducer(s, { type: "next" }), s);
  const review = createSession(
    defaultSettings,
    99,
    [],
    s.questions.slice(0, 2),
  );
  assert.equal(review.review, true);
  assert.equal(review.questions.length, 2);
  assert.equal(review.responses.length, 0);
});

test("unfinished input, attempts, assistance, and completed history survive save and restore", () => {
  let s = createSession(defaultSettings, 5);
  s = enter(s, 99);
  s = sessionReducer(s, { type: "help" });
  s = sessionReducer(s, { type: "digit", digit: "4" });
  const saved: SavedState = {
    version: 1,
    settings: defaultSettings,
    session: s,
    history: [],
    totals: { rounds: 0, questions: 0 },
  };
  assert.deepEqual(parseSaved(JSON.stringify(saved)), saved);
  const raw = JSON.parse(JSON.stringify(saved));
  raw.session.questions[0].answer = 500;
  assert.equal(parseSaved(JSON.stringify(raw))?.session, null);
  assert.equal(parseSaved("{broken"), null);
  assert.equal(parseSaved(null), null);
});

test("review slots target previously troublesome skills without exact repeats", () => {
  let s = createSession({ ...defaultSettings, operation: "subtract" }, 999);
  for (let i = 0; i < 15; i++) {
    s = sessionReducer(s, { type: "help" });
    s = enter(s, s.questions[s.index].answer);
    s = sessionReducer(s, { type: "next" });
  }
  const history = toHistory(s);
  const weak = new Set(history.questions.map((q) => q.skill));
  const round = generateQuestions(
    { ...defaultSettings, operation: "subtract" },
    1000,
    [history],
  );
  assert.ok(round.slice(12).every((q) => weak.has(q.skill)));
  assert.equal(new Set(round.map(canonical)).size, 15);
});
