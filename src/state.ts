import type { Answers, Question } from "./engine";

/**
 * Answers live in the location hash, which buys three things for free:
 * browser Back/Forward, surviving a reload, and a shareable permalink — useful
 * because a newcomer can paste their result into a forum when asking for help.
 *
 * Shape: `#a=device.desktop~arch.x86~use.dev,gaming`
 */
const PREFIX = "a=";

export function encodeAnswers(answers: Answers, questions: Question[]): string {
  return questions
    .filter((q) => answers[q.id]?.length)
    .map((q) => `${q.id}.${answers[q.id]!.join(",")}`)
    .join("~");
}

/** Anything unrecognised is dropped, so a hand-edited or stale URL still loads. */
export function decodeAnswers(raw: string, questions: Question[]): Answers {
  const known = new Map(questions.map((q) => [q.id, q]));
  const answers: Answers = {};

  for (const chunk of raw.split("~")) {
    const split = chunk.indexOf(".");
    if (split < 1) continue;

    const question = known.get(chunk.slice(0, split));
    if (!question) continue;

    const allowed = new Set(question.options.map((o) => o.id));
    const values = chunk.slice(split + 1).split(",").filter((v) => allowed.has(v));
    if (values.length === 0) continue;

    answers[question.id] = question.multi ? values : [values[0]!];
  }
  return answers;
}

export function readHash(questions: Question[]): Answers {
  const raw = location.hash.replace(/^#/, "");
  return raw.startsWith(PREFIX) ? decodeAnswers(raw.slice(PREFIX.length), questions) : {};
}

/**
 * `push` adds a history entry (answering a question, so Back undoes it);
 * `replace` does not (restoring or repairing state).
 */
export function writeHash(answers: Answers, questions: Question[], mode: "push" | "replace"): void {
  const encoded = encodeAnswers(answers, questions);
  const url = encoded ? `#${PREFIX}${encoded}` : location.pathname + location.search;

  if (mode === "push") location.hash = `${PREFIX}${encoded}`;
  else history.replaceState(null, "", url);
}

/**
 * Changing an earlier answer drops every later one: a different device or
 * architecture can change which questions even apply, so keeping the tail would
 * leave answers to questions that are no longer being asked.
 */
export function truncateFrom(answers: Answers, questionId: string, questions: Question[]): Answers {
  const cut = questions.findIndex((q) => q.id === questionId);
  if (cut < 0) return answers;

  const kept: Answers = {};
  for (const q of questions.slice(0, cut)) {
    if (answers[q.id]) kept[q.id] = answers[q.id]!;
  }
  return kept;
}
