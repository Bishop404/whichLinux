import distros from "../src/data/distros.json";
import desktops from "../src/data/desktops.json";
import questions from "../src/data/questions.json";
import { recommend, type Answers } from "../src/engine";

const target = process.argv[2] ?? "omarchy";
const data = { distros, desktops, questions } as any;
const opts = (id: string) => (questions as any[]).find(q => q.id === id).options.map((o: any) => o.id);
const subsets = (xs: string[]) =>
  Array.from({ length: 2 ** xs.length - 1 }, (_, i) => xs.filter((_, b) => (i + 1) & (1 << b)));

let total = 0;
const hits: Answers[] = [];
for (const device of opts("device"))
 for (const arch of opts("arch"))
  for (const ram of opts("ram"))
   for (const stability of opts("stability"))
    for (const use of subsets(opts("use")))
     for (const terminal of device === "server" ? [null] : opts("terminal"))
      for (const familiarity of device === "server" ? [null] : opts("familiarity"))
       for (const customize of device === "server" ? [null] : opts("customize"))
        for (const gpu of arch === "x86" ? opts("gpu") : [null]) {
          const a: Answers = { device:[device], arch:[arch], ram:[ram], stability:[stability], use };
          if (terminal) a.terminal = [terminal];
          if (familiarity) a.familiarity = [familiarity];
          if (customize) a.customize = [customize];
          if (gpu) a.gpu = [gpu];
          total++;
          if (recommend(a, data).candidates[0]!.distro.id === target) hits.push(a);
        }

const pct = (hits.length / total) * 100;
console.log(`${target}: ${hits.length} wins of ${total}  = ${pct.toFixed(4)}%  (toFixed(1) would print "${pct.toFixed(1)}%")\n`);

// Which answers are constant across every win? Those are what gate it.
const dims = ["device","arch","ram","terminal","stability","familiarity","customize","gpu","use"];
for (const d of dims) {
  const vals = new Set(hits.map(h => (h[d] ?? ["-"]).join("+")));
  const all = new Set<string>();
  console.log(`  ${d.padEnd(12)} ${vals.size === 1 ? "ALWAYS " : "varies "} ${[...vals].sort().join(", ").slice(0,90)}`);
}
