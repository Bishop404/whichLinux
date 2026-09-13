import "./styles/tokens.css";
import "./styles/app.css";

import distrosJson from "./data/distros.json";
import desktopsJson from "./data/desktops.json";
import questionsJson from "./data/questions.json";

import {
  nextQuestion, recommend, survivingDistros, visibleQuestions,
  type Answers, type Desktop, type Distro, type EngineData, type Question,
} from "./engine";
import { readHash, truncateFrom, writeHash } from "./state";
import { LOCALE_NAMES, LOCALES, detectLocale, setLocale, t, type Locale } from "./i18n";
import { clear, el } from "./ui/dom";
import { renderHistory } from "./ui/history";
import { renderQuestion, type QuestionView } from "./ui/question";
import { renderResults } from "./ui/results";

const data: EngineData = {
  distros: distrosJson as Distro[],
  desktops: desktopsJson as Desktop[],
  questions: questionsJson as Question[],
};

const THEME_KEY = "which-linux:theme";
const APP_NAME = "Which Linux?";

let root: HTMLElement;
let masthead: HTMLElement;

let answers: Answers = {};
let current: QuestionView | undefined;
let listenersBound = false;

/* ------------------------------------------------------------------ theme -- */

function storedTheme(): "light" | "dark" | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: "light" | "dark" | null): void {
  if (theme) document.documentElement.dataset["theme"] = theme;
  else delete document.documentElement.dataset["theme"];
}

function toggleTheme(): void {
  const dark = typeof matchMedia === "function"
    && matchMedia("(prefers-color-scheme: dark)").matches;
  const showing = storedTheme() ?? (dark ? "dark" : "light");
  const next = showing === "dark" ? "light" : "dark";

  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Theme memory is a nicety; the toggle still works for this visit.
  }
}

/* ------------------------------------------------------------------- flow -- */

function setAnswer(questionId: string, values: string[]): void {
  // Answering re-answers: drop everything downstream, since a changed answer can
  // change which questions apply at all.
  answers = { ...truncateFrom(answers, questionId, data.questions), [questionId]: values };
  writeHash(answers, data.questions, "push");
  render();
}

function revise(questionId: string): void {
  answers = truncateFrom(answers, questionId, data.questions);
  writeHash(answers, data.questions, "push");
  render();
}

function restart(): void {
  answers = {};
  writeHash(answers, data.questions, "push");
  render();
}

function render(): void {
  clear(root);
  current = undefined;

  // Stop asking as soon as the answers can only lead to one distribution: more
  // questions would be busywork the user can already tell is pointless.
  const settled = Object.keys(answers).length > 0
    && survivingDistros(answers, data).length <= 1;
  const question = settled ? undefined : nextQuestion(data.questions, answers);

  const history = renderHistory(data.questions, answers, revise);
  if (history) root.append(history);

  if (question) {
    const visible = visibleQuestions(data.questions, answers);
    const view = renderQuestion(
      question,
      answers,
      { current: visible.indexOf(question) + 1, total: visible.length },
      (values) => setAnswer(question.id, values),
    );
    current = view;
    root.append(view.node);
  } else {
    root.append(renderResults(recommend(answers, data)));
  }

  renderMasthead();
  document.title = question
    ? `${t(`question.${question.id}.title`)} · ${APP_NAME}`
    : APP_NAME;
}

/* --------------------------------------------------------------- masthead -- */

function renderMasthead(): void {
  clear(masthead);

  const language = el("select", { class: "control", "aria-label": t("app.language") });
  for (const code of LOCALES) {
    language.append(el("option", {
      value: code, text: LOCALE_NAMES[code], selected: code === document.documentElement.lang,
    }));
  }
  language.addEventListener("change", async () => {
    await setLocale(language.value as Locale);
    render();
  });

  const theme = el("button", { class: "control", type: "button", text: "◐" });
  theme.setAttribute("aria-label", t("app.theme"));
  theme.title = t("app.theme");
  theme.addEventListener("click", toggleTheme);

  const restartButton = el("button", { class: "control", type: "button", text: t("app.restart") });
  restartButton.addEventListener("click", restart);

  const copy = el("button", { class: "control", type: "button", text: t("app.copyLink") });
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      copy.textContent = t("app.copied");
      setTimeout(() => (copy.textContent = t("app.copyLink")), 2000);
    } catch {
      // Clipboard access can be refused; the URL is in the address bar regardless.
    }
  });

  masthead.append(
    el("h1", { class: "brand", text: APP_NAME }),
    el("span", { class: "masthead__spacer" }),
    ...(Object.keys(answers).length > 0 ? [copy, restartButton] : []),
    language,
    theme,
  );
}

/* -------------------------------------------------------------- keyboard -- */

function onKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  if (target && /^(INPUT|SELECT|TEXTAREA|A)$/.test(target.tagName)) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  if (event.key === "Enter") {
    // Choosing with the number keys leaves focus on the page rather than on a
    // control, so Enter has to be caught here too. A focused control (a masthead
    // button, a download link) keeps its own Enter behaviour.
    const active = document.activeElement;
    if (current && (!active || active === document.body || active === root)) {
      event.preventDefault();
      current.confirm();
    }
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    history.back();
    return;
  }

  const digit = Number(event.key);
  if (current && Number.isInteger(digit) && digit >= 1 && digit <= 9) {
    event.preventDefault();
    current.choose(digit);
  }
}

/* ----------------------------------------------------------------- start -- */

export async function start(): Promise<void> {
  root = document.getElementById("app")!;
  masthead = document.getElementById("masthead")!;

  applyTheme(storedTheme());
  await setLocale(detectLocale());

  answers = readHash(data.questions);
  render();

  // Bound once per module instance: start() may be called again to remount.
  if (listenersBound) return;
  listenersBound = true;

  addEventListener("hashchange", () => {
    answers = readHash(data.questions);
    render();
  });
  addEventListener("keydown", onKeydown);
}
