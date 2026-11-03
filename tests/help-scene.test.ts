import test from "node:test";
import assert from "node:assert/strict";
import {
  questionPool,
  defaultSettings,
  createSession,
  parseSaved,
} from "../src/engine.ts";
import { makeHelpScene, sceneValue } from "../src/help-scene.ts";

test("every teaching scene puts down a, adds or removes exactly b, and leaves the right answer", () => {
  for (const level of ["gentle", "garden"] as const)
    for (const op of ["add", "subtract"] as const)
      for (const q of questionPool(level, op)) {
        const before = makeHelpScene(q, 0),
          action = makeHelpScene(q, 1),
          after = makeHelpScene(q, 2);
        assert.equal(sceneValue(before), q.a);
        assert.equal(
          sceneValue(action, op === "add" ? "added" : "removed"),
          q.b,
        );
        assert.equal(sceneValue(action), q.answer);
        assert.equal(sceneValue(after), q.answer);
        assert.equal(after.tens.length, Math.floor(q.answer / 10));
        assert.equal(after.ones.length, q.answer % 10);
        assert.ok(
          after.tens.every((t) => t.mark === "base") &&
            after.ones.every((t) => t.mark === "base"),
        );
        assert.equal(
          new Set([...action.tens, ...action.ones].map((t) => t.id)).size,
          action.tens.length + action.ones.length,
        );
      }
});

test("subtraction visibly crosses out the right packs and single beans", () => {
  const q = questionPool("garden", "subtract").find(
    (q) => q.a === 76 && q.b === 42,
  )!;
  const scene = makeHelpScene(q, 1);
  assert.equal(scene.tens.filter((t) => t.mark === "removed").length, 4);
  assert.equal(scene.ones.filter((t) => t.mark === "removed").length, 2);
  assert.equal(sceneValue(scene), 34);
});

test("v1 settings and an unfinished round restore without replacing a saved mute preference", () => {
  const settings = { ...defaultSettings, sound: false };
  const round = createSession(settings, 321);
  const restored = parseSaved(
    JSON.stringify({
      version: 1,
      settings,
      session: round,
      history: [],
      totals: { rounds: 0, questions: 0 },
    }),
  );
  assert.equal(restored?.settings.sound, false);
  assert.deepEqual(restored?.session, round);
});
