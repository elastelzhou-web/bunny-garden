import type { Question } from "./engine.ts";

export type BeanMark = "base" | "added" | "removed";
export interface BeanToken {
  id: string;
  mark: BeanMark;
}
export interface HelpScene {
  tens: BeanToken[];
  ones: BeanToken[];
}

/** A pack always means ten; a loose bean always means one. */
export function makeHelpScene(question: Question, step: number): HelpScene {
  const phase = Math.max(0, Math.min(2, step));
  const make = (unit: "tens" | "ones"): BeanToken[] => {
    const a = unit === "tens" ? Math.floor(question.a / 10) : question.a % 10;
    const b = unit === "tens" ? Math.floor(question.b / 10) : question.b % 10;
    const original: BeanToken[] = Array.from({ length: a }, (_, i) => ({
      id: `${unit}-base-${i}`,
      mark: "base",
    }));
    if (phase === 0) return original;
    if (question.op === "add") {
      return [
        ...original,
        ...Array.from({ length: b }, (_, i) => ({
          id: `${unit}-added-${i}`,
          mark: phase === 1 ? ("added" as const) : ("base" as const),
        })),
      ];
    }
    if (phase === 1)
      return original.map((token, i) => ({
        ...token,
        mark: i >= a - b ? "removed" : "base",
      }));
    return original.slice(0, a - b);
  };
  return { tens: make("tens"), ones: make("ones") };
}

export function sceneValue(scene: HelpScene, mark?: BeanMark): number {
  const count = (tokens: BeanToken[]) =>
    tokens.filter((token) =>
      mark ? token.mark === mark : token.mark !== "removed",
    ).length;
  return count(scene.tens) * 10 + count(scene.ones);
}
