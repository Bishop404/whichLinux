import type { Answers, Condition } from "./types";

/**
 * Evaluates a `showIf` predicate against the answers given so far.
 * Deliberately a tiny interpreter rather than `eval` or hand-written branching,
 * so question visibility stays declarative data.
 */
export function matches(condition: Condition | undefined, answers: Answers): boolean {
  if (!condition) return true;

  if ("all" in condition) return condition.all.every((c) => matches(c, answers));
  if ("any" in condition) return condition.any.some((c) => matches(c, answers));

  const given = answers[condition.q];
  // An unanswered question cannot satisfy a positive test, but must not block a
  // negative one — otherwise every `isNot` question would hide itself at the start.
  if ("is" in condition) return given?.includes(condition.is) ?? false;
  return !(given?.includes(condition.isNot) ?? false);
}
