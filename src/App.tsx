import { useEffect, useRef, useState } from "react";
import { Modal } from "./Dialog";
import { HelpPanel } from "./HelpPanel";
import type { HelpState } from "./HelpPanel";
import { GardenAudio, isSoundName } from "./audio";
import type { SoundName } from "./audio";
import { BunnyFace, Flower, GardenScene, GrowingPlant, Icon } from "./Art";
import { copy } from "./i18n";
import type { Copy } from "./i18n";
import {
  createSession,
  defaultSettings,
  parseSaved,
  sessionReducer,
  summarize,
  toHistory,
} from "./engine";
import type {
  HistoryEntry,
  Operation,
  Question,
  SavedState,
  SessionAction,
  Settings,
} from "./engine";

const STORAGE_KEY = "bunny-garden:v1";
type View = "home" | "quiz" | "results" | "stickers";

function initialData(): SavedState {
  try {
    const restored = parseSaved(localStorage.getItem(STORAGE_KEY));
    if (restored) return restored;
  } catch {
    /* Practice remains usable without storage. */
  }
  return {
    version: 1,
    settings: { ...defaultSettings },
    session: null,
    history: [],
    totals: { rounds: 0, questions: 0 },
  };
}

function SettingsPanel({
  settings,
  update,
  t,
  onClose,
}: {
  settings: Settings;
  update: (settings: Partial<Settings>) => void;
  t: Copy;
  onClose: () => void;
}) {
  return (
    <Modal title={t.settings} onClose={onClose} closeLabel={t.close}>
      <fieldset className="setting-group">
        <legend>{t.levelLabel}</legend>
        <div className="level-options">
          {(["gentle", "garden"] as const).map((level) => (
            <button
              key={level}
              className={`level-option ${settings.level === level ? "selected" : ""}`}
              aria-pressed={settings.level === level}
              onClick={() => update({ level })}
            >
              <span className="choice-radio" />
              <span>
                <strong>{level === "gentle" ? t.gentle : t.gardenLevel}</strong>
                <small>
                  {level === "gentle"
                    ? t.gentleDescription
                    : t.gardenDescription}
                </small>
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="setting-group">
        <legend>{t.lengthLabel}</legend>
        <div className="length-options">
          {([15, 20] as const).map((length) => (
            <button
              key={length}
              className={settings.length === length ? "selected" : ""}
              aria-pressed={settings.length === length}
              onClick={() => update({ length })}
            >
              {length} <span>{t.questions}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="sound-setting">
        <span>
          <strong>{t.soundLabel}</strong>
          <small>{t.soundDescription}</small>
        </span>
        <button
          role="switch"
          data-sound="none"
          aria-label={t.soundLabel}
          aria-checked={settings.sound}
          className={`switch ${settings.sound ? "on" : ""}`}
          onClick={() => update({ sound: !settings.sound })}
        >
          <span />
        </button>
      </div>
      <p className="settings-note">{t.settingsNote}</p>
      <button className="button primary full-width" onClick={onClose}>
        {t.save}
        <Icon name="check" />
      </button>
    </Modal>
  );
}

export function App() {
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<View>(() =>
    data.session ? (data.session.complete ? "results" : "quiz") : "home",
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [help, setHelp] = useState<HelpState | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const audioRef = useRef<GardenAudio | null>(null);
  const t = copy[data.settings.language];
  const session = data.session;
  const active = !!session && !session.complete;
  const question = session?.questions[session.index];
  const result: HistoryEntry | null = inspectedId
    ? data.history.find((h) => h.id === inspectedId) || null
    : session?.complete
      ? toHistory(session)
      : null;

  useEffect(() => {
    document.documentElement.lang =
      data.settings.language === "zh" ? "zh-CN" : "en";
    document.title = `${t.brand} · ${data.settings.language === "zh" ? "快乐加减法" : "Little maths, lovely blooms"}`;
  }, [data.settings.language, t.brand]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }, [data]);
  useEffect(() => {
    if (view === "quiz") headingRef.current?.focus({ preventScroll: true });
  }, [view, session?.index]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view]);

  function playSound(name: SoundName, enabled = data.settings.sound) {
    const audio = audioRef.current || (audioRef.current = new GardenAudio());
    void audio.play(name, enabled);
  }
  function updateSettings(settings: Partial<Settings>) {
    if (settings.sound === true) playSound("start", true);
    if (settings.sound === false) audioRef.current?.mute();
    setData((previous) => ({
      ...previous,
      settings: { ...previous.settings, ...settings },
    }));
  }
  function dispatch(action: SessionAction) {
    setData((previous) => {
      if (!previous.session) return previous;
      const next = sessionReducer(previous.session, action);
      if (next === previous.session) return previous;
      const newlyComplete = next.complete && !previous.session.complete;
      return {
        ...previous,
        session: next,
        history: newlyComplete
          ? [...previous.history, toHistory(next)].slice(-40)
          : previous.history,
        totals: newlyComplete
          ? {
              rounds: previous.totals.rounds + (next.review ? 0 : 1),
              questions: previous.totals.questions + next.questions.length,
            }
          : previous.totals,
      };
    });
  }
  function submit() {
    if (!session || session.phase !== "answering" || !session.input) return;
    playSound(Number(session.input) === question?.answer ? "correct" : "retry");
    const predicted = sessionReducer(session, { type: "submit" });
    dispatch({ type: "submit" });
    if (predicted.phase === "walkthrough" && question)
      setHelp({ question, mode: "full", step: 0, during: true });
  }
  function next() {
    if (!session || session.phase === "answering") return;
    playSound(
      session.index + 1 === session.questions.length ? "complete" : "step",
    );
    if (session.index + 1 === session.questions.length) {
      setInspectedId(null);
      setView("results");
    }
    setHintOpen(false);
    dispatch({ type: "next" });
  }
  function openHelp(mode: "hint" | "full" = "hint") {
    if (!question || !session) return;
    playSound("hint");
    if (session.phase === "answering") dispatch({ type: "help" });
    setHelp({ question, mode, step: 0, during: true });
    setHintOpen(true);
  }
  function begin(
    reviewQuestions?: Question[],
    reviewSource?: Pick<HistoryEntry, "level" | "operation">,
  ) {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    setData((previous) => ({
      ...previous,
      session: createSession(
        { ...previous.settings, ...reviewSource },
        seed,
        previous.history,
        reviewQuestions,
      ),
    }));
    setHintOpen(false);
    setInspectedId(null);
    setView("quiz");
  }
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        view !== "quiz" ||
        settingsOpen ||
        help ||
        !session ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        if (session.phase === "answering" && session.input.length < 2)
          playSound("tap");
        dispatch({ type: "digit", digit: event.key });
      } else if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        if (session.phase === "answering" && session.input) playSound("tap");
        dispatch({ type: "erase" });
      } else if (
        event.key === "Enter" &&
        !(event.target instanceof HTMLButtonElement)
      ) {
        event.preventDefault();
        session.phase === "answering" ? submit() : next();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });

  const navigate = (nextView: View) => {
    setView(nextView);
    setInspectedId(null);
  };
  const modeLabels = { add: t.add, subtract: t.subtract, mixed: t.mixed };
  return (
    <div
      className={`app view-${view}`}
      onClickCapture={(event) => {
        if (!(event.target instanceof Element)) return;
        const button = event.target.closest("button");
        if (!button || button.disabled || button.dataset.sound === "none")
          return;
        playSound(
          isSoundName(button.dataset.sound) ? button.dataset.sound : "tap",
        );
      }}
    >
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand"
            onClick={() => navigate("home")}
            aria-label={t.back}
          >
            <BunnyFace />
            <span>
              <strong>{t.brand}</strong>
              <small>
                {data.settings.language === "zh"
                  ? "BUNNY GARDEN"
                  : "A LITTLE MATHS, A LITTLE MAGIC"}
              </small>
            </span>
          </button>
          <nav
            className="main-nav"
            aria-label={
              data.settings.language === "zh" ? "主导航" : "Main navigation"
            }
          >
            <button
              className={view === "home" || view === "quiz" ? "active" : ""}
              onClick={() => navigate("home")}
            >
              <Icon name="sprout" size={19} />
              {t.garden}
            </button>
            <button
              className={view === "stickers" ? "active" : ""}
              onClick={() => navigate("stickers")}
            >
              <Icon name="flower" size={19} />
              {t.stickers}
              <span className="nav-count">{data.totals.rounds}</span>
            </button>
          </nav>
          <div className="header-actions">
            <div
              className="language-switch"
              aria-label={
                data.settings.language === "zh"
                  ? "界面语言"
                  : "Interface language"
              }
            >
              <button
                lang="zh-CN"
                className={data.settings.language === "zh" ? "active" : ""}
                aria-pressed={data.settings.language === "zh"}
                onClick={() => updateSettings({ language: "zh" })}
              >
                中
              </button>
              <button
                lang="en"
                className={data.settings.language === "en" ? "active" : ""}
                aria-pressed={data.settings.language === "en"}
                onClick={() => updateSettings({ language: "en" })}
              >
                EN
              </button>
            </div>
            <button
              className="icon-button sound-toggle"
              data-sound="none"
              aria-label={data.settings.sound ? t.muteSound : t.enableSound}
              aria-pressed={data.settings.sound}
              title={data.settings.sound ? t.muteSound : t.enableSound}
              onClick={() => updateSettings({ sound: !data.settings.sound })}
            >
              <Icon name={data.settings.sound ? "sound" : "mute"} size={21} />
              <span>{data.settings.sound ? t.soundOn : t.soundOff}</span>
            </button>
            <button
              className="icon-button settings-button"
              aria-label={t.settings}
              onClick={() => setSettingsOpen(true)}
            >
              <Icon name="settings" />
            </button>
          </div>
        </div>
      </header>
      {storageWarning && (
        <p className="storage-warning" role="status">
          {t.storageWarning}
        </p>
      )}

      {view === "home" && (
        <main className="home-page page-container">
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow">
                <span /> {t.eyebrow}
              </div>
              <h1>
                {t.hero1}
                <br />
                <span>
                  {t.hero2}
                  <svg
                    viewBox="0 0 380 16"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path d="M4 10Q186-2 376 9M25 15Q187 5 353 12" />
                  </svg>
                </span>
              </h1>
              <p>
                {t.intro}
                <br />
                {t.intro2}
              </p>
              <div className="hero-note">
                <Icon name="heart" size={17} />
                {t.noTimer}
              </div>
            </div>
            <div className="hero-art">
              <GardenScene />
              <span className="art-caption">
                a little maths, a little magic ✳
              </span>
            </div>
          </section>
          <section className="adventure-card" aria-labelledby="adventure-title">
            <div className="adventure-top">
              <div>
                <div className="section-kicker">
                  <Icon name="sprout" size={17} />
                  {data.settings.language === "zh"
                    ? "小小的日常冒险"
                    : "YOUR LITTLE DAILY ADVENTURE"}
                </div>
                <h2 id="adventure-title">{t.adventure}</h2>
                <p>{t.adventureSub}</p>
              </div>
              <button
                className="difficulty-chip"
                onClick={() => setSettingsOpen(true)}
              >
                <span className="tiny-leaf">
                  <Icon name="leaf" size={18} />
                </span>
                <span>
                  {(active ? session.level : data.settings.level) === "gentle"
                    ? t.gentle
                    : t.gardenLevel}
                  <small>{t.noRegroup}</small>
                </span>
                <Icon name="chevron" size={16} />
              </button>
            </div>
            <div className="mode-options">
              {(["add", "subtract", "mixed"] as Operation[]).map((mode, i) => (
                <button
                  key={mode}
                  className={`mode-option mode-${mode} ${data.settings.operation === mode ? "selected" : ""}`}
                  onClick={() => updateSettings({ operation: mode })}
                  aria-pressed={data.settings.operation === mode}
                  disabled={active}
                >
                  <span className="mode-symbol">{["+", "−", "±"][i]}</span>
                  <span className="mode-text">
                    <strong>{modeLabels[mode]}</strong>
                    <small>{[t.addNote, t.subtractNote, t.mixedNote][i]}</small>
                  </span>
                  <span className="mode-check">
                    <Icon name="check" size={13} />
                  </span>
                </button>
              ))}
            </div>
            <div className="adventure-bottom">
              <div className="round-description">
                <span className="round-number">
                  {active ? session.questions.length : data.settings.length}
                </span>
                <span>
                  {t.questions}
                  <small>{active ? t.resumeNote : t.noTimer}</small>
                </span>
                <button
                  className="small-setting"
                  aria-label={t.settings}
                  onClick={() => setSettingsOpen(true)}
                >
                  <Icon name="settings" size={18} />
                </button>
              </div>
              <button
                className="button primary start-button"
                data-sound="start"
                onClick={() => (active ? navigate("quiz") : begin())}
              >
                {active ? t.resume : t.start}
                <Icon name="arrow" />
              </button>
            </div>
          </section>
          <div className="features">
            <span>
              <Icon name="refresh" />
              {t.feature1}
            </span>
            <span>
              <Icon name="book" />
              {t.feature2}
            </span>
            <span>
              <Icon name="heart" />
              {t.feature3}
            </span>
          </div>
          {data.history.length > 0 && (
            <section className="recent-section">
              <h2>{t.recent}</h2>
              <div className="recent-list">
                {data.history
                  .slice(-3)
                  .reverse()
                  .map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => {
                        setInspectedId(entry.id);
                        setView("results");
                      }}
                    >
                      <Flower
                        kind={data.history.indexOf(entry) % 6}
                        size={53}
                      />
                      <span>
                        <strong>
                          {entry.review
                            ? t.review
                            : modeLabels[entry.operation]}
                        </strong>
                        <small>
                          {new Date(entry.completedAt).toLocaleDateString(
                            data.settings.language === "zh" ? "zh-CN" : "en-GB",
                            { month: "short", day: "numeric" },
                          )}{" "}
                          · {entry.questions.length} {t.questions}
                        </small>
                      </span>
                      <span className="recent-score">
                        {summarize(entry.responses).independent}/
                        {entry.questions.length}
                      </span>
                      <Icon name="chevron" size={18} />
                    </button>
                  ))}
              </div>
            </section>
          )}
        </main>
      )}

      {view === "quiz" && session && question && !session.complete && (
        <main className="quiz-page page-container">
          <div className="quiz-toolbar">
            <button className="text-button" onClick={() => navigate("home")}>
              <Icon name="back" size={20} />
              <span>{t.pause}</span>
            </button>
            <span className="quiz-mode">
              {session.review ? t.review : modeLabels[session.operation]}
            </span>
          </div>
          <div className="progress-row">
            <span className="progress-flower">
              <Icon name="flower" size={22} />
            </span>
            <div
              className="progress-track"
              role="progressbar"
              aria-label={t.adventure}
              aria-valuenow={session.responses.length}
              aria-valuemin={0}
              aria-valuemax={session.questions.length}
            >
              <span
                style={{
                  width: `${(session.responses.length / session.questions.length) * 100}%`,
                }}
              />
            </div>
            <span className="progress-count">
              {t.questionLabel}
              {session.index + 1} {t.questionOf} {session.questions.length}
              {t.questionEnd}
            </span>
          </div>
          <div className="quiz-grid">
            <section className="question-card">
              <div className="question-intro">
                <span className="section-kicker">
                  <Icon name="sprout" size={17} />
                  {session.level === "gentle" ? t.gentle : t.gardenLevel} ·{" "}
                  {t.noRegroup}
                </span>
                <h1 ref={headingRef} tabIndex={-1}>
                  {t.quizTitle}
                </h1>
                <p>{t.quizSub}</p>
              </div>
              <div
                className={`equation ${session.phase === "correct" ? "is-correct" : ""}`}
              >
                <span>{question.a}</span>
                <span className="math-sign">
                  {question.op === "add" ? "+" : "−"}
                </span>
                <span>{question.b}</span>
                <span className="math-sign">=</span>
                <input
                  className="answer-box"
                  aria-label={t.answer}
                  value={
                    session.phase === "answering"
                      ? session.input
                      : String(question.answer)
                  }
                  placeholder="?"
                  readOnly
                  inputMode="none"
                  autoComplete="off"
                />
              </div>
              <div
                className={`answer-feedback ${session.phase === "correct" ? "success" : session.attempts.length ? "try-again" : ""}`}
                role="status"
                aria-live="polite"
              >
                <Icon
                  name={
                    session.phase === "correct"
                      ? "check"
                      : session.attempts.length
                        ? "heart"
                        : "leaf"
                  }
                  size={19}
                />
                {session.phase === "correct"
                  ? session.usedHelp
                    ? t.helpedCorrect
                    : t.correct
                  : session.phase === "walkthrough"
                    ? t.walkthrough
                    : session.attempts.length
                      ? t.retry
                      : t.think}
              </div>
              <div className="question-bottom">
                <div className="mini-bunny">
                  <BunnyFace />
                  <span>{hintOpen ? t.hintText : t.littleNote}</span>
                </div>
                <button
                  className="hint-button"
                  data-sound="none"
                  onClick={() =>
                    openHelp(session.phase === "answering" ? "hint" : "full")
                  }
                >
                  <Icon name="help" size={19} />
                  {session.phase === "answering" ? t.hint : t.showMe}
                </button>
              </div>
            </section>
            <aside className="answer-side">
              <div className="plant-progress">
                <GrowingPlant
                  progress={session.responses.length / session.questions.length}
                />
                <span>
                  {session.responses.length / session.questions.length < 0.35
                    ? t.seedling
                    : session.responses.length / session.questions.length < 0.7
                      ? t.budding
                      : t.blooming}
                </span>
              </div>
              <div className="keypad">
                {[
                  "1",
                  "2",
                  "3",
                  "4",
                  "5",
                  "6",
                  "7",
                  "8",
                  "9",
                  "?",
                  "0",
                  "erase",
                ].map((key) => (
                  <button
                    key={key}
                    aria-label={
                      key === "erase"
                        ? t.erase
                        : key === "?"
                          ? session.phase === "answering"
                            ? t.hint
                            : t.showMe
                          : `${t.digit} ${key}`
                    }
                    className={`key ${key === "?" || key === "erase" ? "utility" : ""}`}
                    data-sound={key === "?" ? "none" : "tap"}
                    disabled={session.phase !== "answering" && key !== "?"}
                    onClick={() =>
                      key === "erase"
                        ? dispatch({ type: "erase" })
                        : key === "?"
                          ? openHelp(
                              session.phase === "answering" ? "hint" : "full",
                            )
                          : dispatch({ type: "digit", digit: key })
                    }
                  >
                    {key === "erase" ? (
                      <Icon name="delete" size={24} />
                    ) : key === "?" ? (
                      <Icon name="help" size={23} />
                    ) : (
                      key
                    )}
                  </button>
                ))}
              </div>
              <button
                className="button primary check-button"
                data-sound="none"
                disabled={session.phase === "answering" && !session.input}
                onClick={() =>
                  session.phase === "answering" ? submit() : next()
                }
              >
                {session.phase === "answering"
                  ? t.check
                  : session.index + 1 === session.questions.length
                    ? t.finish
                    : t.next}
                <Icon
                  name={session.phase === "answering" ? "check" : "arrow"}
                />
              </button>
            </aside>
          </div>
        </main>
      )}

      {view === "results" && result && (
        <main className="results-page page-container">
          <div className="results-hero">
            <div className="result-flower-wrap">
              <span className="result-spark s1">✧</span>
              <Flower
                kind={Math.max(0, data.totals.rounds - 1) % 6}
                size={160}
              />
              <span className="result-spark s2">✧</span>
            </div>
            <div className="eyebrow">
              {result.review ? t.finishedReview : t.littleNote}
            </div>
            <h1>{t.completeTitle}</h1>
            <p>{t.completeSub}</p>
            <span className="completed-pill">
              <Icon name="check" size={17} />
              {t.completed} {result.questions.length} {t.questions}
            </span>
          </div>
          <div className="result-stats">
            {(["independent", "retry", "assisted"] as const).map((type, i) => (
              <div className={`result-stat stat-${type}`} key={type}>
                <Icon name={["sparkle", "refresh", "heart"][i]} size={24} />
                <strong>{summarize(result.responses)[type]}</strong>
                <span>{[t.independent, t.retried, t.assisted][i]}</span>
              </div>
            ))}
          </div>
          <div className="result-actions">
            {!active &&
              result.responses.some((r) => r.outcome !== "independent") && (
                <button
                  className="button secondary"
                  onClick={() =>
                    begin(
                      result.questions.filter(
                        (_, i) => result.responses[i].outcome !== "independent",
                      ),
                      result,
                    )
                  }
                >
                  <Icon name="refresh" size={19} />
                  {t.reviewThese}
                </button>
              )}
            <button
              className="button primary"
              onClick={() => (active ? navigate("quiz") : begin())}
            >
              {active ? t.resume : t.playAgain}
              <Icon name="arrow" />
            </button>
          </div>
          <section className="review-section">
            <h2>{t.questionReview}</h2>
            <div className="review-grid">
              {result.questions.map((q, i) => (
                <button
                  key={`${q.id}-${i}`}
                  className={`review-question ${result.responses[i].outcome}`}
                  onClick={() =>
                    setHelp({
                      question: q,
                      mode: "full",
                      step: 0,
                      during: false,
                    })
                  }
                >
                  <span>
                    {q.a} {q.op === "add" ? "+" : "−"} {q.b} ={" "}
                    <strong>{q.answer}</strong>
                  </span>
                  <small>
                    <Icon
                      name={
                        result.responses[i].outcome === "independent"
                          ? "check"
                          : result.responses[i].outcome === "retry"
                            ? "refresh"
                            : "heart"
                      }
                      size={13}
                    />
                    {result.responses[i].outcome === "independent"
                      ? t.solvedAlone
                      : result.responses[i].outcome === "retry"
                        ? t.solvedRetry
                        : t.solvedHelp}
                  </small>
                </button>
              ))}
            </div>
          </section>
          <details className="parent-details">
            <summary>
              <Icon name="book" size={19} />
              {t.parent}
              <Icon name="chevron" size={16} />
            </summary>
            <div className="parent-content">
              <p>
                {t.accuracy}:{" "}
                <strong>
                  {Math.round(
                    (summarize(result.responses).independent /
                      result.questions.length) *
                      100,
                  )}
                  %
                </strong>
              </p>
              {(["add", "subtract"] as const).map((op) => {
                const matching = result.questions
                  .map((q, i) => ({ q, r: result.responses[i] }))
                  .filter((pair) => pair.q.op === op);
                return (
                  matching.length > 0 && (
                    <p key={op}>
                      {op === "add" ? t.addition : t.subtraction}:{" "}
                      <strong>
                        {
                          matching.filter(
                            (pair) => pair.r.outcome === "independent",
                          ).length
                        }
                        /{matching.length}
                      </strong>{" "}
                      · {t.independent}
                    </p>
                  )
                );
              })}
              <p>
                {result.level === "gentle" ? t.gentle : t.gardenLevel} ·{" "}
                {t.noRegroup}
              </p>
            </div>
          </details>
          <button
            className="text-button result-back"
            onClick={() => navigate("home")}
          >
            <Icon name="back" size={18} />
            {t.back}
          </button>
        </main>
      )}

      {view === "stickers" && (
        <main className="stickers-page page-container">
          <div className="eyebrow">
            <Icon name="flower" size={17} />
            {t.stickers}
          </div>
          <h1>{t.stickerTitle}</h1>
          <p>{t.stickerSub}</p>
          <div className="sticker-total">
            {t.collected} <strong>{data.totals.rounds}</strong> {t.flowers}
          </div>
          <div className="sticker-grid">
            {Array.from({ length: 6 }, (_, i) => {
              const earned = data.totals.rounds > i;
              const quantity = Math.max(
                0,
                Math.floor((data.totals.rounds - 1 - i) / 6) + 1,
              );
              return (
                <div
                  className={`sticker-card ${earned ? "earned" : "unearned"}`}
                  key={i}
                >
                  <Flower kind={i} size={135} />
                  <h2>{t.stickerNames[i]}</h2>
                  <span>
                    {earned
                      ? `${t.earned}${quantity > 1 ? ` × ${quantity}` : ""}`
                      : t.waiting}
                  </span>
                  {!earned && (
                    <Icon name="lock" className="sticker-lock" size={17} />
                  )}
                </div>
              );
            })}
          </div>
          {data.totals.rounds === 0 && (
            <p className="sticker-empty">{t.stickerEmpty}</p>
          )}
          <button className="button primary" onClick={() => navigate("home")}>
            {t.back}
            <Icon name="arrow" />
          </button>
        </main>
      )}

      <footer className="site-footer">
        <span>
          <Icon name="sprout" size={16} />
          {t.footer}
        </span>
        <small>{t.localNote}</small>
      </footer>
      {settingsOpen && (
        <SettingsPanel
          settings={data.settings}
          update={updateSettings}
          t={t}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {help && (
        <HelpPanel
          help={help}
          setHelp={setHelp}
          t={t}
          onClose={() => setHelp(null)}
        />
      )}
    </div>
  );
}
