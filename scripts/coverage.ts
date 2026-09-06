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

const data = { distros, desktops, questions };
const opts = (id) => questions.find((q) => q.id === id).options.map((o) => o.id);
const subsets = (xs) =>
  Array.from({ length: 2 ** xs.length - 1 }, (_, i) => xs.filter((_, b) => (i + 1) & (1 << b)));

function* everyAnswerSet() {
  for (const device of opts("device"))
    for (const arch of opts("arch"))
      for (const ram of opts("ram"))
        for (const stability of opts("stability"))
          for (const use of subsets(opts("use")))
            for (const terminal of device === "server" ? [null] : opts("terminal"))
              for (const familiarity of device === "server" ? [null] : opts("familiarity"))
                for (const customize of device === "server" ? [null] : opts("customize"))
                  for (const gpu of arch === "x86" ? opts("gpu") : [null]) {
                    const a = { device: [device], arch: [arch], ram: [ram], stability: [stability], use };
                    if (terminal) a.terminal = [terminal];
                    if (familiarity) a.familiarity = [familiarity];
                    if (customize) a.customize = [customize];
                    if (gpu) a.gpu = [gpu];
                    yield a;
                  }
}

const wins = new Map();
const weak = [];
const relaxedCount = new Map();
let total = 0;

for (const answers of everyAnswerSet()) {
  const r = recommend(answers, data);
  const best = r.candidates[0];
  total++;
  wins.set(best.distro.id, (wins.get(best.distro.id) ?? 0) + 1);
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

const fmt = (a) => Object.entries(a).map(([k, v]) => `${k}=${v.join("+")}`).join(" ");

console.log(`answer sets swept: ${total}\n`);

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

console.log(`\nrelaxed (no exact match) : ${[...relaxedCount].map(([k, v]) => `${k}=${v}`).join(", ") || "none"}`);

console.log(`\nlow-confidence answer sets: ${weak.length} (${((weak.length / total) * 100).toFixed(1)}%)`);
const byBucket = new Map();
for (const w of weak) {
  const k = `${w.answers.device}/${w.answers.arch}/${w.answers.ram}/${w.answers.use.join("+")}`;
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
