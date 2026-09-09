import distros from "../src/data/distros.json";
import desktops from "../src/data/desktops.json";
import questions from "../src/data/questions.json";
import { recommend, type Answers } from "../src/engine";
import { everyAnswerSet } from "./answer-sets";

const target = process.argv[2] ?? "omarchy";
const data = { distros, desktops, questions } as any;

let total = 0;
const hits: Answers[] = [];
for (const answers of everyAnswerSet(questions as any)) {
  total++;
  if (recommend(answers, data).candidates[0]!.distro.id === target) hits.push(answers);
}

const pct = (hits.length / total) * 100;
console.log(`${target}: ${hits.length} wins of ${total}  = ${pct.toFixed(4)}%  (toFixed(1) would print "${pct.toFixed(1)}%")\n`);

// Which answers are constant across every win? Those are what gate it.
for (const question of questions as any[]) {
  const vals = new Set(hits.map((h) => (h[question.id] ?? ["-"]).join("+")));
  console.log(`  ${question.id.padEnd(12)} ${vals.size === 1 ? "ALWAYS " : "varies "} ${[...vals].sort().join(", ").slice(0, 90)}`);
}
