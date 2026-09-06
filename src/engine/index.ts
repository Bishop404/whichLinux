import type {
  Answers, Candidate, Desktop, Distro, FilterSpec, Question, Recommendation, WeightSpec,
} from "./types";
import { flatten, type FlatCandidate } from "./flatten";
import { matches } from "./condition";
import { passes } from "./filter";
import { contribution } from "./score";
import { explain } from "./explain";

export * from "./types";
export { matches } from "./condition";
export { effectiveRam, weightClass } from "./flatten";

export interface EngineData {
  distros: Distro[];
  desktops: Desktop[];
  questions: Question[];
}

/**
 * Non-free firmware in the installer is a flat win for this audience — they want
 * their Wi-Fi to work, and were deliberately never asked to have an opinion on
 * it. Applied as a symmetric bias so both sides produce a visible reason.
 */
const FIRMWARE_BIAS = 0.5;
/** Small prior so ties break toward well-supported options rather than data order. */
const BEGINNER_PRIOR = 0.3;

/**
 * Hard filters are dropped in this order when nothing survives, weakest claim
 * first. Architecture is last because recommending an x86 image to an Apple
 * Silicon Mac is not a "close match", it simply does not boot.
 */
const RELAXATION_ORDER = ["terminal", "ram", "device", "arch"];

/** Filters contributed by one question: any chosen option's set may satisfy it. */
interface FilterGroup {
  questionId: string;
  optionFilterSets: FilterSpec[][];
}

/** Questions whose `showIf` currently holds, in declaration order. */
export function visibleQuestions(questions: Question[], answers: Answers): Question[] {
  return questions.filter((q) => matches(q.showIf, answers));
}

/** The first visible question with no answer yet, or undefined when the flow is done. */
export function nextQuestion(questions: Question[], answers: Answers): Question | undefined {
  return visibleQuestions(questions, answers).find((q) => !answers[q.id]?.length);
}

function collect(questions: Question[], answers: Answers) {
  const groups: FilterGroup[] = [];
  const weights: WeightSpec[] = [];

  for (const question of visibleQuestions(questions, answers)) {
    const chosen = answers[question.id] ?? [];
    const selected = question.options.filter((o) => chosen.includes(o.id));

    const sets = selected.map((o) => o.filters ?? []).filter((s) => s.length > 0);
    if (sets.length > 0) groups.push({ questionId: question.id, optionFilterSets: sets });

    for (const option of selected) weights.push(...(option.weights ?? []));
  }

  return { groups, weights };
}

function satisfies(candidate: FlatCandidate, group: FilterGroup): boolean {
  return group.optionFilterSets.some((set) => set.every((f) => passes(candidate, f)));
}

interface Pair {
  distro: Distro;
  edition: Distro["editions"][number];
  flat: FlatCandidate;
}

/** Flattening is pure and depends only on the dataset, so it is done once per dataset. */
const pairCache = new WeakMap<EngineData, Pair[]>();

function buildPairs(data: EngineData): Pair[] {
  const cached = pairCache.get(data);
  if (cached) return cached;

  const desktops = new Map<string, Desktop>(data.desktops.map((d) => [d.id, d]));
  const pairs = data.distros.flatMap((distro) =>
    distro.editions.map((edition) => ({
      distro,
      edition,
      flat: flatten(distro, edition, desktops),
    })),
  );
  pairCache.set(data, pairs);
  return pairs;
}

/**
 * Applies the hard filters, relaxing them one question at a time if that would
 * otherwise leave nothing. Returns which questions had to be given up, so the UI
 * can be honest that it is showing a closest match rather than an exact one.
 */
function applyFilters(pairs: Pair[], groups: FilterGroup[]): { kept: Pair[]; relaxed: string[] } {
  const active = new Map(groups.map((g) => [g.questionId, g]));
  const relaxed: string[] = [];

  for (;;) {
    const kept = pairs.filter((p) => [...active.values()].every((g) => satisfies(p.flat, g)));
    if (kept.length > 0) return { kept, relaxed };

    const next = RELAXATION_ORDER.find((id) => active.has(id));
    if (!next) return { kept: pairs, relaxed };
    active.delete(next);
    relaxed.push(next);
  }
}

/**
 * Best achievable score for this answer set, used to turn a raw score into a
 * percentage that means something rather than a number relative to the winner.
 */
function ceilingFor(pairs: Pair[], weights: WeightSpec[]): number {
  let ceiling = FIRMWARE_BIAS + BEGINNER_PRIOR * 5;
  for (const weight of weights) {
    let best = 0;
    for (const pair of pairs) best = Math.max(best, contribution(pair.flat, weight));
    ceiling += best;
  }
  return ceiling;
}

/**
 * Distinct distros still standing after the hard filters, ignoring relaxation.
 *
 * Once this reaches one, no further question can change the outcome — an Apple
 * Silicon Mac has exactly one answer — so the flow should stop asking.
 */
export function survivingDistros(answers: Answers, data: EngineData): string[] {
  const pairs = buildPairs(data);
  const { groups } = collect(data.questions, answers);
  const kept = pairs.filter((p) => groups.every((g) => satisfies(p.flat, g)));
  return [...new Set(kept.map((p) => p.distro.id))];
}

export function recommend(answers: Answers, data: EngineData, limit = 3): Recommendation {
  const pairs = buildPairs(data);
  const { groups, weights } = collect(data.questions, answers);
  const { kept, relaxed } = applyFilters(pairs, groups);
  const ceiling = ceilingFor(pairs, weights);

  const scored: Candidate[] = kept.map((pair) => {
    const reasons = explain(pair.flat, weights);
    let score = reasons.reduce((sum, r) => sum + r.value, 0);

    const firmware = pair.distro.firmware === "included" ? FIRMWARE_BIAS : -FIRMWARE_BIAS;
    score += firmware;
    reasons.push({ key: "reason.firmware", value: firmware });
    score += BEGINNER_PRIOR * pair.distro.beginner;

    return {
      distro: pair.distro,
      edition: pair.edition,
      score,
      normalised: ceiling > 0 ? Math.min(1, Math.max(0, score / ceiling)) : 0,
      reasons: reasons.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
    };
  });

  scored.sort((a, b) => b.score - a.score || a.distro.id.localeCompare(b.distro.id));

  // One card per distro: showing Mint Cinnamon above Mint Xfce above Mint MATE
  // is three ways of saying the same thing.
  const seen = new Set<string>();
  const unique = scored.filter((c) => !seen.has(c.distro.id) && seen.add(c.distro.id));

  return { candidates: unique.slice(0, limit), relaxed };
}
