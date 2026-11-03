export type SoundName =
  "tap" | "start" | "correct" | "retry" | "hint" | "step" | "complete";
type Note = readonly [frequency: number, offset: number, duration: number];

const sounds: Record<SoundName, readonly Note[]> = {
  tap: [[880, 0, 0.065]],
  start: [
    [523.25, 0, 0.15],
    [659.25, 0.1, 0.15],
    [783.99, 0.2, 0.24],
  ],
  correct: [
    [659.25, 0, 0.16],
    [880, 0.11, 0.18],
    [1046.5, 0.22, 0.27],
  ],
  retry: [
    [440, 0, 0.16],
    [392, 0.13, 0.2],
  ],
  hint: [
    [587.33, 0, 0.17],
    [880, 0.12, 0.25],
  ],
  step: [
    [698.46, 0, 0.13],
    [880, 0.09, 0.18],
  ],
  complete: [
    [523.25, 0, 0.22],
    [659.25, 0.13, 0.24],
    [783.99, 0.26, 0.25],
    [1046.5, 0.41, 0.42],
  ],
};

export function isSoundName(value: string | undefined): value is SoundName {
  return !!value && Object.hasOwn(sounds, value);
}

function browserContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const BrowserAudio =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  return BrowserAudio ? new BrowserAudio() : null;
}

/** Created only inside a user gesture; every sound is synthesized locally. */
export class GardenAudio {
  private context: AudioContext | null = null;
  private createContext: () => AudioContext | null;
  private generation = 0;
  private lastTap = -Infinity;
  private voices = new Set<{ oscillator: OscillatorNode; gain: GainNode }>();

  constructor(createContext: () => AudioContext | null = browserContext) {
    this.createContext = createContext;
  }

  async play(name: SoundName, enabled: boolean): Promise<boolean> {
    if (!enabled) return false;
    const generation = this.generation;
    try {
      if (!this.context || this.context.state === "closed")
        this.context = this.createContext();
      const context = this.context;
      if (!context) return false;
      if (context.state !== "running") await context.resume();
      if (generation !== this.generation || context.state !== "running")
        return false;
      if (name === "tap" && context.currentTime - this.lastTap < 0.045)
        return false;
      if (name === "tap") this.lastTap = context.currentTime;
      for (const [frequency, offset, duration] of sounds[name]) {
        // A short note and a small gain keep rapid taps gentle too.
        if (this.voices.size >= 24) break;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + 0.005 + offset;
        const voice = { oscillator, gain };
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(
          name === "tap" ? 0.025 : 0.045,
          start + 0.012,
        );
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.onended = () => {
          this.voices.delete(voice);
          oscillator.disconnect();
          gain.disconnect();
        };
        this.voices.add(voice);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.015);
      }
      return true;
    } catch {
      // A missing audio device or restricted browser never blocks practice.
      return false;
    }
  }

  mute(): void {
    this.generation++;
    for (const { oscillator, gain } of this.voices) {
      try {
        gain.gain.cancelScheduledValues(this.context?.currentTime || 0);
        gain.gain.setValueAtTime(0, this.context?.currentTime || 0);
        oscillator.stop();
        oscillator.disconnect();
        gain.disconnect();
      } catch {
        /* The note may already have finished. */
      }
    }
    this.voices.clear();
    this.lastTap = -Infinity;
  }
}
