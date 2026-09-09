/**
 * Sweeps every reachable answer set and reports where the recommender is weak:
 * which answers produce a low-confidence winner, and which distros never win.
 *
 * Run with: npm run coverage
 */
import distros from "../src/data/distros.json";
import desktops from "../src/data/desktops.json";
import questions from "../src/data/questions.json";
import { recommend } from "../src/engine";
import { everyAnswerSet } from "./answer-sets";

const data = { distros, desktops, questions };

const wins = new Map();
/** The same tally, split by device class: see the note above the printout. */
const winsByDevice = new Map();
const setsByDevice = new Map();
const weak = [];
const relaxedCount = new Map();
let total = 0;

for (const answers of everyAnswerSet(questions)) {
  const r = recommend(answers, data);
  const best = r.candidates[0];
  total++;
  wins.set(best.distro.id, (wins.get(best.distro.id) ?? 0) + 1);

  const device = answers.device[0];
  setsByDevice.set(device, (setsByDevice.get(device) ?? 0) + 1);
  if (!winsByDevice.has(device)) winsByDevice.set(device, new Map());
  const perDevice = winsByDevice.get(device);
  perDevice.set(best.distro.id, (perDevice.get(best.distro.id) ?? 0) + 1);

  if (r.relaxed.length) {
    const k = r.relaxed.join("+");
    relaxedCount.set(k, (relaxedCount.get(k) ?? 0) + 1);
  }
  // "Weak" = the best available option still matches the stated needs poorly,
  // or barely beats the runner-up (the choice is close to arbitrary).
  const margin = r.candidates[1] ? best.score - r.candidates[1].score : Infinity;
  if (best.normalised < 0.55 || margin < 0.5) {
    weak.push({ answers, id: best.distro.id, n: best.normalised, margin, relaxed: r.relaxed });
  }
}

const byDevice = [...setsByDevice].map(([d, n]) => `${d} ${n}`).join(", ");
console.log(`answer sets swept: ${total}  (${byDevice})\n`);

console.log("wins per distro:");
for (const d of distros) {
  const n = wins.get(d.id) ?? 0;
  if (n === 0) {
    // The one result this tool exists to surface, so it must never be a rounded
    // percentage: a distro that wins 36 times and one that wins never both
    // printed as "0.0%" with no bar, which is exactly the case worth telling apart.
    console.log(`  ${d.id.padEnd(20)} ${"0".padStart(7)}          NEVER WINS — unreachable, check its data`);
    continue;
  }
  const pct = (n / total) * 100;
  // A distro that wins at all always gets at least one block.
  const bar = "█".repeat(Math.max(1, Math.round((n / total) * 240)));
  console.log(`  ${d.id.padEnd(20)} ${String(n).padStart(7)}  ${(pct < 0.1 ? pct.toFixed(3) : pct.toFixed(1)).padStart(7)}%  ${bar}`);
}

// The device classes are wildly uneven — the server flow asks fewer questions, so
// it is a fraction of a percent of the sweep. A server distro judged against the
// global total therefore looks broken when it is in fact winning its own class
// outright, which is the same mistake the NEVER WINS case above guards against.
console.log("\nwins within each device class:");
for (const [device, sets] of setsByDevice) {
  console.log(`  ${device} (${sets} sets)`);
  const ranked = [...winsByDevice.get(device)].sort((a, b) => b[1] - a[1]);
  for (const [id, n] of ranked) {
    const pct = (n / sets) * 100;
    console.log(`    ${id.padEnd(20)} ${String(n).padStart(7)}  ${pct.toFixed(1).padStart(6)}%  ${"█".repeat(Math.max(1, Math.round(pct / 2)))}`);
  }
}

console.log(`\nrelaxed (no exact match) : ${[...relaxedCount].map(([k, v]) => `${k}=${v}`).join(", ") || "none"}`);

console.log(`\nlow-confidence answer sets: ${weak.length} (${((weak.length / total) * 100).toFixed(1)}%)`);
const byBucket = new Map();
for (const w of weak) {
  const jobs = (w.answers.use ?? w.answers.serverUse ?? []).join("+");
  const k = `${w.answers.device}/${w.answers.arch}/${w.answers.ram}/${jobs}`;
  if (!byBucket.has(k)) byBucket.set(k, []);
  byBucket.get(k).push(w);
}
[...byBucket.entries()]
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 18)
  .forEach(([k, ws]) => {
    const worst = ws.reduce((m, w) => (w.n < m.n ? w : m));
    console.log(`  ${String(ws.length).padStart(4)}x  ${k.padEnd(42)} best=${worst.id} (${(worst.n * 100).toFixed(0)}%, margin ${worst.margin === Infinity ? "-" : worst.margin.toFixed(1)})`);
  });
