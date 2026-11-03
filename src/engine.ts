export type Language = "zh" | "en";
export type Level = "gentle" | "garden";
export type Operation = "add" | "subtract" | "mixed";
export type Outcome = "independent" | "retry" | "assisted";
export type Phase = "answering" | "correct" | "walkthrough";

export interface Settings {
  language: Language;
  level: Level;
  operation: Operation;
  length: 15 | 20;
  sound: boolean;
}
export interface Question {
  id: string;
  a: number;
  b: number;
  op: "add" | "subtract";
  answer: number;
  skill: string;
}
export interface Response {
  questionId: string;
  attempts: number[];
  usedHelp: boolean;
  outcome: Outcome;
}
export interface Session {
  id: string;
  seed: number;
  level: Level;
  operation: Operation;
  questions: Question[];
  index: number;
  input: string;
  attempts: number[];
  usedHelp: boolean;
  phase: Phase;
  responses: Response[];
  review: boolean;
  complete: boolean;
  startedAt: string;
}
export interface HistoryEntry {
  id: string;
  completedAt: string;
  level: Level;
  operation: Operation;
  review: boolean;
  questions: Question[];
  responses: Response[];
}
export interface SavedState {
  version: 1;
  settings: Settings;
  session: Session | null;
  history: HistoryEntry[];
  totals: { rounds: number; questions: number };
}

export const defaultSettings: Settings = {
  language: "zh",
  level: "garden",
  operation: "mixed",
  length: 15,
  sound: true,
};

export function random(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = Math.imul(value ^ (value >>> 15), value | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function validArithmetic(
  a: number,
  b: number,
  op: Question["op"],
  limit: number,
): boolean {
  if (
    !Number.isInteger(a) ||
    !Number.isInteger(b) ||
    a < 2 ||
    b < 2 ||
    a > limit ||
    b > limit
  )
    return false;
  if (op === "add")
    return (
      a + b <= limit &&
      (a % 10) + (b % 10) < 10 &&
      Math.floor(a / 10) + Math.floor(b / 10) < 10
    );
  return a > b && a % 10 >= b % 10 && Math.floor(a / 10) >= Math.floor(b / 10);
}

export function skillFor(a: number, b: number, op: Question["op"]): string {
  return `${op}:${a < 20 && b < 20 ? "small" : b % 10 === 0 ? "tens" : b < 10 ? "ones" : "two-digit"}`;
}

export function canonical(q: Question): string {
  return q.op === "add"
    ? `+${Math.min(q.a, q.b)}:${Math.max(q.a, q.b)}`
    : `-${q.a}:${q.b}`;
}

export function questionPool(level: Level, op: Question["op"]): Question[] {
  const limit = level === "gentle" ? 19 : 99;
  const pool: Question[] = [];
  for (let a = 2; a <= limit; a++) {
    for (let b = 2; b <= limit; b++) {
      if (!validArithmetic(a, b, op, limit)) continue;
      if (op === "add" && a < b) continue;
      pool.push({
        id: `${op}-${a}-${b}`,
        a,
        b,
        op,
        answer: op === "add" ? a + b : a - b,
        skill: skillFor(a, b, op),
      });
    }
  }
  return pool;
}

const pools = {
  gentle: {
    add: questionPool("gentle", "add"),
    subtract: questionPool("gentle", "subtract"),
  },
  garden: {
    add: questionPool("garden", "add"),
    subtract: questionPool("garden", "subtract"),
  },
};

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateQuestions(
  settings: Pick<Settings, "length" | "level" | "operation">,
  seed: number,
  history: HistoryEntry[] = [],
): Question[] {
  const rng = random(seed);
  const used = new Set<string>();
  const warmupCount = settings.length === 15 ? 3 : 4;
  const reviewStart = settings.length === 15 ? 12 : 16;
  const weakSkills = new Set(
    history
      .filter((h) => !h.review)
      .slice(-5)
      .flatMap((h) =>
        h.responses
          .filter((r) => r.outcome !== "independent")
          .map((r) => h.questions.find((q) => q.id === r.questionId)?.skill),
      )
      .filter(Boolean),
  );
  const ops: Question["op"][] =
    settings.operation === "mixed"
      ? shuffle(
          Array.from({ length: settings.length }, (_, i) =>
            i < Math.ceil(settings.length / 2)
              ? ("add" as const)
              : ("subtract" as const),
          ),
          rng,
        )
      : Array.from(
          { length: settings.length },
          () => settings.operation as Question["op"],
        );
  return ops.map((op, i) => {
    const available = pools[settings.level][op].filter(
      (q) => !used.has(canonical(q)),
    );
    let preferred = available;
    if (i < warmupCount && settings.level === "garden")
      preferred = available.filter(
        (q) => q.a < 20 && q.b < 20 && q.answer < 20,
      );
    else if (i >= reviewStart && weakSkills.size)
      preferred = available.filter((q) => weakSkills.has(q.skill));
    else if (settings.level === "garden")
      preferred = available.filter((q) => q.a >= 20 && q.b >= 10);
    if (!preferred.length) preferred = available;
    if (!preferred.length) throw new Error("Not enough unique questions");
    const q = { ...preferred[Math.floor(rng() * preferred.length)] };
    used.add(canonical(q));
    return q;
  });
}

export function createSession(
  settings: Settings,
  seed: number,
  history: HistoryEntry[] = [],
  reviewQuestions?: Question[],
): Session {
  const questions =
    reviewQuestions?.map((q) => ({ ...q })) ??
    generateQuestions(settings, seed, history);
  if (!questions.length) throw new Error("A round needs at least one question");
  return {
    id: `round-${Date.now()}-${seed}`,
    seed,
    level: settings.level,
    operation: settings.operation,
    questions,
    index: 0,
    input: "",
    attempts: [],
    usedHelp: false,
    phase: "answering",
    responses: [],
    review: !!reviewQuestions,
    complete: false,
    startedAt: new Date().toISOString(),
  };
}

export type SessionAction =
  | { type: "digit"; digit: string }
  | { type: "erase" }
  | { type: "submit" }
  | { type: "help" }
  | { type: "next" };

export function sessionReducer(
  session: Session,
  action: SessionAction,
): Session {
  if (session.complete) return session;
  const question = session.questions[session.index];
  switch (action.type) {
    case "digit":
      if (
        session.phase !== "answering" ||
        !/^\d$/.test(action.digit) ||
        session.input.length >= 2
      )
        return session;
      return {
        ...session,
        input:
          session.input === "0" ? action.digit : session.input + action.digit,
      };
    case "erase":
      return session.phase === "answering"
        ? { ...session, input: session.input.slice(0, -1) }
        : session;
    case "help":
      return session.phase === "answering"
        ? { ...session, usedHelp: true }
        : session;
    case "submit": {
      if (session.phase !== "answering" || session.input === "") return session;
      const answer = Number(session.input);
      const attempts = [...session.attempts, answer];
      if (answer === question.answer)
        return { ...session, attempts, phase: "correct" };
      return {
        ...session,
        attempts,
        input: "",
        phase: attempts.length >= 2 ? "walkthrough" : "answering",
        usedHelp: session.usedHelp || attempts.length >= 2,
      };
    }
    case "next": {
      if (session.phase === "answering") return session;
      const outcome: Outcome = session.usedHelp
        ? "assisted"
        : session.attempts.length === 1
          ? "independent"
          : "retry";
      const responses = [
        ...session.responses,
        {
          questionId: question.id,
          attempts: session.attempts,
          usedHelp: session.usedHelp,
          outcome,
        },
      ];
      if (session.index + 1 === session.questions.length)
        return { ...session, responses, complete: true };
      return {
        ...session,
        responses,
        index: session.index + 1,
        input: "",
        attempts: [],
        usedHelp: false,
        phase: "answering",
      };
    }
  }
}

export function summarize(responses: Response[]) {
  return responses.reduce(
    (acc, response) => ({
      ...acc,
      [response.outcome]: acc[response.outcome] + 1,
    }),
    { independent: 0, retry: 0, assisted: 0 },
  );
}

export function toHistory(session: Session): HistoryEntry {
  return {
    id: session.id,
    completedAt: new Date().toISOString(),
    level: session.level,
    operation: session.operation,
    review: session.review,
    questions: session.questions,
    responses: session.responses,
  };
}

export function explanation(q: Question) {
  const sign = q.op === "add" ? "+" : "−";
  const tensA = Math.floor(q.a / 10) * 10;
  const tensB = Math.floor(q.b / 10) * 10;
  const onesA = q.a % 10;
  const onesB = q.b % 10;
  const tens = q.op === "add" ? tensA + tensB : tensA - tensB;
  const ones = q.op === "add" ? onesA + onesB : onesA - onesB;
  return {
    sign,
    tensA,
    tensB,
    onesA,
    onesB,
    tens,
    ones,
    steps: [
      `${tensA} ${sign} ${tensB} = ${tens}`,
      `${onesA} ${sign} ${onesB} = ${ones}`,
      `${tens} + ${ones} = ${q.answer}`,
    ],
  };
}

function isQuestion(value: unknown): value is Question {
  if (!value || typeof value !== "object") return false;
  const q = value as Question;
  return (
    typeof q.id === "string" &&
    (q.op === "add" || q.op === "subtract") &&
    validArithmetic(q.a, q.b, q.op, 99) &&
    q.answer === (q.op === "add" ? q.a + q.b : q.a - q.b) &&
    q.skill === skillFor(q.a, q.b, q.op)
  );
}
function isResponse(value: unknown): value is Response {
  if (!value || typeof value !== "object") return false;
  const r = value as Response;
  return (
    typeof r.questionId === "string" &&
    Array.isArray(r.attempts) &&
    r.attempts.every((n) => Number.isInteger(n) && n >= 0 && n <= 99) &&
    typeof r.usedHelp === "boolean" &&
    ["independent", "retry", "assisted"].includes(r.outcome)
  );
}
export function parseSaved(raw: string | null): SavedState | null {
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as SavedState;
    if (saved.version !== 1 || !saved.settings) return null;
    saved.session ??= null;
    const s = saved.settings;
    if (
      !["zh", "en"].includes(s.language) ||
      !["gentle", "garden"].includes(s.level) ||
      !["add", "subtract", "mixed"].includes(s.operation) ||
      ![15, 20].includes(s.length) ||
      typeof s.sound !== "boolean"
    )
      return null;
    if (!Array.isArray(saved.history)) return null;
    saved.history = saved.history
      .filter(
        (h) =>
          h &&
          typeof h.id === "string" &&
          typeof h.completedAt === "string" &&
          Number.isFinite(Date.parse(h.completedAt)) &&
          ["gentle", "garden"].includes(h.level) &&
          ["add", "subtract", "mixed"].includes(h.operation) &&
          typeof h.review === "boolean" &&
          Array.isArray(h.questions) &&
          h.questions.every(isQuestion) &&
          Array.isArray(h.responses) &&
          h.responses.length === h.questions.length &&
          h.responses.every(
            (r, i) => isResponse(r) && r.questionId === h.questions[i].id,
          ),
      )
      .slice(-40);
    if (
      !saved.totals ||
      !Number.isSafeInteger(saved.totals.rounds) ||
      saved.totals.rounds < 0 ||
      !Number.isSafeInteger(saved.totals.questions) ||
      saved.totals.questions < 0
    )
      saved.totals = {
        rounds: saved.history.filter((h) => !h.review).length,
        questions: saved.history.reduce(
          (sum, h) => sum + h.questions.length,
          0,
        ),
      };
    if (saved.session) {
      const r = saved.session;
      if (
        typeof r.id !== "string" ||
        !Number.isInteger(r.seed) ||
        !["gentle", "garden"].includes(r.level) ||
        !["add", "subtract", "mixed"].includes(r.operation) ||
        !Array.isArray(r.questions) ||
        !r.questions.length ||
        r.questions.length > 20 ||
        !r.questions.every(isQuestion) ||
        !Number.isInteger(r.index) ||
        r.index < 0 ||
        r.index >= r.questions.length ||
        !/^\d{0,2}$/.test(r.input) ||
        !Array.isArray(r.attempts) ||
        !r.attempts.every((n) => Number.isInteger(n) && n >= 0 && n <= 99) ||
        typeof r.usedHelp !== "boolean" ||
        typeof r.review !== "boolean" ||
        typeof r.complete !== "boolean" ||
        typeof r.startedAt !== "string" ||
        !["answering", "correct", "walkthrough"].includes(r.phase) ||
        !Array.isArray(r.responses) ||
        r.responses.length !== (r.complete ? r.questions.length : r.index) ||
        !r.responses.every(
          (response, i) =>
            isResponse(response) && response.questionId === r.questions[i].id,
        )
      )
        saved.session = null;
    }
    return saved;
  } catch {
    return null;
  }
}
