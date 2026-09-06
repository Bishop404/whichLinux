import type { Answers, Question } from "../engine";
import { t } from "../i18n";
import { el } from "./dom";

/**
 * Remembered across re-renders so answering a question does not undo the user's
 * decision to fold the strip away (or to keep it open on a phone).
 */
let expanded: boolean | undefined;

function defaultExpanded(): boolean {
  // On a phone the strip would push the current question off the screen, so it
  // starts folded; on a wide screen it is the context the design asks for.
  // Where the query is unavailable, showing the answers is the safer default.
  return typeof matchMedia !== "function" || matchMedia("(min-width: 34rem)").matches;
}

/**
 * The answered-questions strip. Every row is a button: without a way back, one
 * misclick means starting the whole flow again.
 */
export function renderHistory(
  questions: Question[],
  answers: Answers,
  onRevise: (questionId: string) => void,
): HTMLElement | null {
  const answered = questions.filter((q) => answers[q.id]?.length);
  if (answered.length === 0) return null;

  const list = el("ol", { class: "history__list" });

  for (const question of answered) {
    const chosen = answers[question.id]!
      .map((id) => t(`option.${question.id}.${id}`))
      .join(", ");

    const button = el("button", { type: "button", title: t("progress.change") }, [
      el("span", { class: "history__q", text: t(`question.${question.id}.title`) }),
      el("q", { text: chosen }),
      el("span", { class: "pencil", "aria-hidden": "true", text: "✎" }),
    ]);
    button.addEventListener("click", () => onRevise(question.id));

    list.append(el("li", { class: "history__item" }, [button]));
  }

  expanded ??= defaultExpanded();

  const details = el("details", { class: "history", open: expanded }, [
    el("summary", { class: "history__legend" }, [
      el("span", { text: t("progress.answered") }),
      el("span", { class: "history__count", text: String(answered.length) }),
    ]),
    list,
  ]);
  details.addEventListener("toggle", () => (expanded = details.open));

  return details;
}
