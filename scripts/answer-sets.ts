import { matches, type Answers, type Question } from "../src/engine";

/** Every non-empty subset, smallest first, in option order. */
function subsets<T>(xs: T[]): T[][] {
  return Array.from({ length: 2 ** xs.length - 1 }, (_, i) =>
    xs.filter((_, bit) => (i + 1) & (1 << bit)));
}

/**
 * Every answer set a visitor can actually reach.
 *
 * Derived from `questions.json` rather than hand-written loops: each question is
 * branched over only when the engine's own `matches` says it would be shown,
 * given the answers chosen so far. That is the same predicate `visibleQuestions`
 * uses at runtime, so a question that gates itself off — `use` on the server
 * path, `gpu` on ARM — drops out here for free, and adding a question never
 * means editing this file.
 *
 * Answers are mutated in place while walking and copied on yield, so a caller
 * may keep every set it is handed.
 */
export function* everyAnswerSet(questions: Question[]): Generator<Answers> {
  function* walk(index: number, answers: Answers): Generator<Answers> {
    const question = questions[index];
    if (!question) {
      yield { ...answers };
      return;
    }
    if (!matches(question.showIf, answers)) {
      yield* walk(index + 1, answers);
      return;
    }

    const ids = question.options.map((o) => o.id);
    for (const choice of question.multi ? subsets(ids) : ids.map((id) => [id])) {
      answers[question.id] = choice;
      yield* walk(index + 1, answers);
    }
    delete answers[question.id];
  }

  yield* walk(0, {});
}
