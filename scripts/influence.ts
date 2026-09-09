/**
 * Measures how much each question earns its place.
 *
 * For every question, take a real answer set, hold everything else fixed, and
 * vary just that question. If the top recommendation never changes, the question
 * did no work in that context. A question that rarely does work is a question
 * asked for nothing, which matters when the audience is defined by feeling
 * overwhelmed.
 *
 * Run with: npm run influence
 */
import distros from "../src/data/distros.json";
import desktops from "../src/data/desktops.json";
import questions from "../src/data/questions.json";
import { recommend, type Answers } from "../src/engine";
import { everyAnswerSet } from "./answer-sets";

const data = { distros, desktops, questions } as any;
const qs = questions as any[];

/** Deterministic sampler, so the numbers are reproducible run to run. */
let seed = 12345;
const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const SAMPLE = 4000;

const all = [...everyAnswerSet(questions as any)];
console.log(`answer sets: ${all.length}\n`);

interface Row { id: string; asked: number; decided: number; inert: string[] }
const rows: Row[] = [];

for (const q of qs) {
  const options: string[] = q.options.map((o: any) => o.id);
  const seen = new Set<string>();
  const contexts: Answers[] = [];

  for (const a of all) {
    if (!a[q.id]) continue;                       // not asked in this context
    const key = JSON.stringify(Object.entries(a).filter(([k]) => k !== q.id).sort());
    if (seen.has(key)) continue;
    seen.add(key);
    if (contexts.length < SAMPLE || rand() < 0.02) contexts.push(a);
  }
  const sample = contexts.slice(0, SAMPLE);

  let decided = 0;
  // Per-option: does picking this option ever differ from picking another?
  const optionMatters = new Map<string, number>(options.map((o) => [o, 0]));

  for (const base of sample) {
    const winners = new Map<string, string>();
    for (const o of options) {
      const probe: Answers = { ...base, [q.id]: q.multi ? [o] : [o] };
      winners.set(o, recommend(probe, data).candidates[0]!.distro.id);
    }
    const distinct = new Set(winners.values());
    if (distinct.size > 1) {
      decided++;
      // An option "matters" when it produces a winner no other option produces.
      for (const [o, w] of winners) {
        if ([...winners].filter(([o2, w2]) => o2 !== o && w2 === w).length === 0) {
          optionMatters.set(o, optionMatters.get(o)! + 1);
        }
      }
    }
  }

  rows.push({
    id: q.id,
    asked: seen.size,
    decided: decided / sample.length,
    inert: options.filter((o) => optionMatters.get(o) === 0),
  });
}

rows.sort((a, b) => b.decided - a.decided);
console.log("question      contexts   changes the answer   options that never decide anything");
for (const r of rows) {
  const pct = (r.decided * 100).toFixed(1);
  const bar = "█".repeat(Math.round(r.decided * 40));
  console.log(
    `  ${r.id.padEnd(12)} ${String(r.asked).padStart(7)}   ${pct.padStart(5)}%  ${bar.padEnd(40)} ${r.inert.join(", ") || "—"}`,
  );
}
