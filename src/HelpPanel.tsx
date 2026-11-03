import { useState } from "react";
import { Icon } from "./Art";
import { Modal } from "./Dialog";
import type { Copy } from "./i18n";
import type { Question } from "./engine";
import { makeHelpScene } from "./help-scene";
import type { BeanMark } from "./help-scene";

export interface HelpState {
  question: Question;
  mode: "hint" | "full";
  step: number;
  during: boolean;
}

function markClass(mark: BeanMark) {
  return mark === "removed" ? "taken-away" : mark;
}

function TenPack({
  mark = "base",
  mini = false,
}: {
  mark?: BeanMark;
  mini?: boolean;
}) {
  return (
    <span
      className={`ten-pack ${markClass(mark)} ${mini ? "mini" : ""}`}
      aria-hidden="true"
    >
      <span className="pack-beans">
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} />
        ))}
      </span>
      <b>10</b>
      {mark === "added" && <em>+</em>}
      {mark === "removed" && <span className="take-cross" />}
    </span>
  );
}

export function HelpPanel({
  help,
  setHelp,
  t,
  onClose,
}: {
  help: HelpState;
  setHelp: (help: HelpState) => void;
  t: Copy;
  onClose: () => void;
}) {
  const [packOpen, setPackOpen] = useState(false);
  const q = help.question;
  const step = help.step;
  const scene = makeHelpScene(q, step);
  const adding = q.op === "add";
  const instruction =
    step === 0
      ? t.placeBeans(q.a)
      : step === 1
        ? adding
          ? t.addBeans(q.b)
          : t.takeBeans(q.b)
        : adding
          ? t.totalBeans(q.answer)
          : t.leftBeans(q.answer);
  const action =
    step === 0
      ? adding
        ? t.addBeans(q.b)
        : t.takeBeans(q.b)
      : step === 1
        ? adding
          ? t.countTogether
          : t.seeRemaining
        : t.backToTry;
  const steps = [t.placeStep, adding ? t.addStep : t.takeStep, t.countStep];
  return (
    <Modal
      title={t.easyHelpTitle}
      onClose={onClose}
      closeLabel={t.close}
      className="help-modal easy-help"
    >
      <div className="help-scroll">
        <ol className="help-stepper" aria-label={t.step}>
          {steps.map((label, i) => (
            <li
              key={i}
              className={i === step ? "current" : i < step ? "done" : ""}
              aria-current={i === step ? "step" : undefined}
            >
              <span>{i < step ? <Icon name="check" size={16} /> : i + 1}</span>
              {label}
            </li>
          ))}
        </ol>
        <div className="easy-equation" aria-live="polite">
          <span>{q.a}</span>
          <span className="easy-sign">{adding ? "+" : "−"}</span>
          <span>{q.b}</span>
          <span className="easy-sign">=</span>
          <strong>{step === 2 ? q.answer : "?"}</strong>
        </div>
        <p className="easy-instruction" aria-live="polite">
          {instruction}
        </p>
        <figure
          className={`bean-scene phase-${step} ${adding ? "adding" : "taking"}`}
          aria-label={instruction}
        >
          {step === 1 && (
            <div className={`scene-change ${adding ? "added" : "taken-away"}`}>
              <span>
                {adding ? "+" : "−"} {q.b}
              </span>
              {adding ? t.purpleAdded : t.crossedTaken}
            </div>
          )}
          <div className="bean-parts">
            {scene.tens.length > 0 && (
              <section className="bean-part">
                <h3>
                  {step === 2 ? t.packCount(scene.tens.length) : t.tenPerPack}
                </h3>
                <div
                  className="ten-packs"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(3, scene.tens.length)}, var(--ten-packet-width))`,
                  }}
                >
                  {scene.tens.map((token) => (
                    <TenPack key={token.id} mark={token.mark} />
                  ))}
                </div>
                {step === 2 && (
                  <span className="bean-subtotal">
                    {scene.tens.length * 10}
                  </span>
                )}
              </section>
            )}
            {scene.ones.length > 0 && (
              <section className="bean-part">
                <h3>
                  {step === 2 ? t.singleCount(scene.ones.length) : t.oneByOne}
                </h3>
                <div
                  className="loose-beans"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(5, scene.ones.length)}, var(--single-bean-width))`,
                  }}
                >
                  {scene.ones.map((token) => (
                    <span
                      key={token.id}
                      className={`loose-bean ${markClass(token.mark)}`}
                      aria-hidden="true"
                    >
                      {token.mark === "removed" && (
                        <span className="take-cross" />
                      )}
                      {token.mark === "added" && <em>+</em>}
                    </span>
                  ))}
                </div>
                {step === 2 && (
                  <span className="bean-subtotal">{scene.ones.length}</span>
                )}
              </section>
            )}
          </div>
          {step === 2 && scene.tens.length > 0 && scene.ones.length > 0 && (
            <figcaption className="bean-total">
              {Math.floor(q.answer / 10) * 10} + {q.answer % 10} ={" "}
              <strong>{q.answer}</strong>
            </figcaption>
          )}
        </figure>
        {step === 0 && (q.a >= 10 || q.answer >= 10) && (
          <div className="pack-guide">
            <button
              className="pack-guide-button"
              data-sound="hint"
              aria-expanded={packOpen}
              onClick={() => setPackOpen(!packOpen)}
            >
              <TenPack mini />
              <span>
                {t.packIsTen}
                <small>{packOpen ? t.closePack : t.openPack}</small>
              </span>
              <Icon name="chevron" size={19} />
            </button>
            {packOpen && (
              <div className="opened-pack" aria-label={t.tenBeans}>
                {Array.from({ length: 10 }, (_, i) => (
                  <span key={i}>{i + 1}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="help-actions">
        <button
          className="button secondary"
          data-sound="step"
          onClick={() =>
            step === 0
              ? onClose()
              : setHelp({ ...help, step: step === 2 ? 0 : step - 1 })
          }
        >
          {step === 0 ? t.backToTry : step === 2 ? t.replay : t.previous}
        </button>
        <button
          className="button primary"
          data-sound={step === 2 ? "correct" : "step"}
          onClick={() =>
            step === 2 ? onClose() : setHelp({ ...help, step: step + 1 })
          }
        >
          {action}
          <Icon name={step === 2 ? "check" : "arrow"} size={21} />
        </button>
      </div>
    </Modal>
  );
}
