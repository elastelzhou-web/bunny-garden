import test from "node:test";
import assert from "node:assert/strict";
import { GardenAudio } from "../src/audio.ts";
import type { SoundName } from "../src/audio.ts";

class Parameter {
  values: number[] = [];
  cancelled = false;
  setValueAtTime(value: number) {
    this.values.push(value);
  }
  exponentialRampToValueAtTime(value: number) {
    this.values.push(value);
  }
  cancelScheduledValues() {
    this.cancelled = true;
  }
}
class Oscillator {
  type = "sine";
  frequency = new Parameter();
  onended: (() => void) | null = null;
  starts: number[] = [];
  stops: (number | undefined)[] = [];
  disconnected = false;
  connect() {}
  disconnect() {
    this.disconnected = true;
  }
  start(time: number) {
    this.starts.push(time);
  }
  stop(time?: number) {
    this.stops.push(time);
  }
}
class Gain {
  gain = new Parameter();
  connect() {}
  disconnect() {}
}
class Context {
  state: AudioContextState = "suspended";
  currentTime = 1;
  destination = {};
  resumes = 0;
  oscillators: Oscillator[] = [];
  gains: Gain[] = [];
  async resume() {
    this.resumes++;
    this.state = "running";
  }
  createOscillator() {
    const oscillator = new Oscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }
  createGain() {
    const gain = new Gain();
    this.gains.push(gain);
    return gain;
  }
}
function service(context: Context) {
  return new GardenAudio(() => context as unknown as AudioContext);
}

test("muted actions never create or unlock an audio device", async () => {
  let created = 0;
  const audio = new GardenAudio(() => {
    created++;
    return null;
  });
  assert.equal(await audio.play("correct", false), false);
  assert.equal(created, 0);
});
test("all cues unlock once, use gentle gains, and have finite notes that stop", async () => {
  for (const name of [
    "tap",
    "start",
    "correct",
    "retry",
    "hint",
    "step",
    "complete",
  ] as SoundName[]) {
    const context = new Context(),
      audio = service(context);
    assert.equal(await audio.play(name, true), true);
    assert.equal(context.resumes, 1);
    assert.ok(context.oscillators.length > 0);
    for (const oscillator of context.oscillators) {
      assert.ok(
        oscillator.frequency.values.every((f) => f > 0 && Number.isFinite(f)),
      );
      assert.ok(oscillator.stops[0]! > oscillator.starts[0]);
    }
    assert.ok(
      context.gains.every((g) =>
        g.gain.values.every((v) => v > 0 && v <= 0.045),
      ),
    );
  }
});
test("muting cuts off scheduled notes immediately", async () => {
  const context = new Context(),
    audio = service(context);
  await audio.play("complete", true);
  audio.mute();
  assert.ok(
    context.oscillators.every(
      (o) => o.stops.at(-1) === undefined && o.disconnected,
    ),
  );
  assert.ok(
    context.gains.every((g) => g.gain.cancelled && g.gain.values.at(-1) === 0),
  );
});
test("muting during device unlock prevents a delayed sound from starting", async () => {
  const context = new Context();
  let unlock = () => {};
  context.resume = () =>
    new Promise<void>((resolve) => {
      unlock = () => {
        context.state = "running";
        resolve();
      };
    });
  const audio = service(context),
    pending = audio.play("correct", true);
  audio.mute();
  unlock();
  assert.equal(await pending, false);
  assert.equal(context.oscillators.length, 0);
});
test("rapid taps are limited and unsupported audio never breaks the caller", async () => {
  const context = new Context(),
    audio = service(context);
  assert.equal(await audio.play("tap", true), true);
  assert.equal(await audio.play("tap", true), false);
  context.currentTime += 0.1;
  assert.equal(await audio.play("tap", true), true);
  assert.equal(await new GardenAudio(() => null).play("start", true), false);
  assert.equal(
    await new GardenAudio(() => {
      throw Error("No device");
    }).play("start", true),
    false,
  );
});
