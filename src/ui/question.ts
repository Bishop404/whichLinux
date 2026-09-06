import type { Answers, Question } from "../engine";
import { t } from "../i18n";
import { el } from "./dom";

export interface QuestionView {
  node: HTMLElement;
  /** Selects the nth option (1-based), for number-key shortcuts. */
  choose(index: number): void;
  /** Submits a multi-select answer. No-op elsewhere, or with nothing chosen. */
  confirm(): void;
}

export function renderQuestion(
  question: Question,
  answers: Answers,
  position: { current: number; total: number },
  onAnswer: (values: string[]) => void,
): QuestionView {
  const multi = question.multi === true;
  const selected = new Set(answers[question.id] ?? []);

  const hintKey = `question.${question.id}.hint`;
  const hint = t(hintKey);

  const options = el("div", { class: "options", role: multi ? "group" : "radiogroup" });
  const buttons: HTMLButtonElement[] = [];

  const confirm = el("button", {
    class: "btn btn--primary",
    type: "button",
    text: t("nav.confirm"),
  }) as HTMLButtonElement;

  const sync = () => {
    buttons.forEach((b, i) => {
      b.setAttribute("aria-pressed", String(selected.has(question.options[i]!.id)));
    });
    confirm.disabled = selected.size === 0;
  };

  question.options.forEach((option, index) => {
    const button = el("button", {
      class: "option",
      type: "button",
      "aria-pressed": String(selected.has(option.id)),
    }, [
      el("span", { class: "option__key", "aria-hidden": "true", text: String(index + 1) }),
      el("span", { text: t(`option.${question.id}.${option.id}`) }),
    ]) as HTMLButtonElement;

    button.addEventListener("click", () => {
      if (!multi) {
        // A single-choice answer needs no confirmation step; advance straight away.
        onAnswer([option.id]);
        return;
      }
      if (selected.has(option.id)) selected.delete(option.id);
      else selected.add(option.id);
      sync();
    });

    buttons.push(button);
    options.append(button);
  });

  const submit = () => {
    if (multi && selected.size > 0) onAnswer([...selected]);
  };
  confirm.addEventListener("click", submit);

  const progress = el("div", { class: "step" }, [
    el("span", {
      text: t("progress.label", { current: position.current, total: position.total }),
    }),
    el("span", { class: "step__bar", "aria-hidden": "true" }, [
      el("i", { style: `width:${Math.round((position.current - 1) / position.total * 100)}%` }),
    ]),
  ]);

  const node = el("section", { class: "view", "aria-labelledby": "q-title" }, [
    progress,
    el("h2", { class: "question__title", id: "q-title", text: t(`question.${question.id}.title`) }),
    hint !== hintKey ? el("p", { class: "question__hint", text: hint }) : undefined,
    options,
    multi ? el("div", { class: "actions" }, [
      confirm,
      // Its own class, not .keyhint: the keyboard hint is hidden on touch
      // devices, and this message is exactly what a phone user needs when the
      // Continue button is disabled.
      el("span", { class: "prompt", text: selected.size === 0 ? t("nav.pickOne") : "" }),
    ]) : undefined,
    el("p", { class: "keyhint", text: t(multi ? "nav.hintKeysMulti" : "nav.hintKeys") }),
  ]);

  // Enter anywhere inside a multi-select question means "done choosing". Without
  // preventDefault, Enter on a focused option would re-toggle that option
  // instead, which is the opposite of what the user intends.
  node.addEventListener("keydown", (event) => {
    if (!multi || event.key !== "Enter" || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    submit();
  });

  sync();

  return {
    node,
    choose(index) {
      buttons[index - 1]?.click();
    },
    confirm: submit,
  };
}
