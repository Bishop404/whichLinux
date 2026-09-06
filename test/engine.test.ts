import { describe, expect, it } from "vitest";

import distrosJson from "../src/data/distros.json";
import desktopsJson from "../src/data/desktops.json";
import questionsJson from "../src/data/questions.json";

import { nextQuestion, recommend, visibleQuestions } from "../src/engine";
import type { Answers, Desktop, Distro, EngineData, Question } from "../src/engine";

const data: EngineData = {
  distros: distrosJson as Distro[],
  desktops: desktopsJson as Desktop[],
  questions: questionsJson as Question[],
};

/** Shorthand: `a({ device: "desktop", use: ["dev", "gaming"] })`. */
function a(spec: Record<string, string | string[]>): Answers {
  return Object.fromEntries(
    Object.entries(spec).map(([k, v]) => [k, Array.isArray(v) ? v : [v]]),
  );
}

const top = (answers: Answers) => recommend(answers, data).candidates[0]!;
const topIds = (answers: Answers) => recommend(answers, data).candidates.map((c) => c.distro.id);

/* -------------------------------------------------------------------------- */

describe("persona goldens", () => {
  it("Windows 7 refugee who never wants a terminal gets Mint Cinnamon", () => {
    const best = top(a({
      device: "desktop", arch: "x86", ram: "8plus", terminal: "never",
      stability: "stable", familiarity: "win7", customize: "no",
      use: "officeWeb", gpu: "other",
    }));
    expect(best.distro.id).toBe("mint");
    expect(best.edition.de).toBe("cinnamon");
  });

  it("old laptop under 4 GB gets a lightweight desktop", () => {
    const best = top(a({
      device: "desktop", arch: "x86", ram: "under4", terminal: "never",
      stability: "stable", familiarity: "win7", customize: "no",
      use: "officeWeb", gpu: "other",
    }));
    expect(["mx", "lubuntu", "mint"]).toContain(best.distro.id);
    expect(["xfce", "lxqt", "mate"]).toContain(best.edition.de);
  });

  it("Apple Silicon collapses to Asahi alone", () => {
    const result = recommend(a({ device: "desktop", arch: "apple" }), data);
    expect(result.candidates.map((c) => c.distro.id)).toEqual(["fedora-asahi"]);
    expect(result.relaxed).toEqual([]);
  });

  it("handheld gamer who wants it to just work gets Bazzite", () => {
    const best = top(a({
      device: "console", arch: "x86", ram: "8plus", terminal: "never",
      stability: "stable", familiarity: "none", customize: "no",
      use: "gaming", gpu: "other",
    }));
    expect(best.distro.id).toBe("bazzite");
  });

  it("never offers Bazzite to someone setting up a desktop", () => {
    // Bazzite is a console-style image; on a desktop it is the wrong shape of
    // answer even though it technically installs there.
    for (const stability of ["stable", "balanced", "fresh"]) {
      for (const terminal of ["never", "paste", "tinker"]) {
        const ids = recommend(a({
          device: "desktop", arch: "x86", ram: "8plus", terminal,
          stability, familiarity: "win11", customize: "no", use: "gaming", gpu: "nvidia",
        }), data, 20).candidates.map((c) => c.distro.id);
        expect(ids, `${stability}/${terminal}`).not.toContain("bazzite");
      }
    }
  });

  it("offers a stable desktop gaming answer that is actually about gaming", () => {
    const ids = topIds(a({
      device: "desktop", arch: "x86", ram: "8plus", terminal: "paste",
      stability: "stable", familiarity: "win11", customize: "no",
      use: "gaming", gpu: "nvidia",
    }));
    expect(["nobara", "popos"]).toContain(ids[0]);
  });

  it("gamer who wants the latest and can use a terminal gets CachyOS", () => {
    const best = top(a({
      device: "desktop", arch: "x86", ram: "8plus", terminal: "tinker",
      stability: "fresh", familiarity: "win11", customize: "yes",
      use: "gaming", gpu: "nvidia",
    }));
    expect(best.distro.id).toBe("cachyos");
  });

  it("separates the two handheld picks by appetite for maintenance", () => {
    // Both are gaming-first, so stability alone does not tell them apart:
    // Bazzite's whole point is that it is hands-off, which keeps winning for a
    // user who wants out-of-the-box. CachyOS is for someone who wants to tune it.
    const base = { device: "console", arch: "x86", ram: "8plus", familiarity: "none", use: "gaming", gpu: "other" };

    expect(top(a({ ...base, terminal: "never", stability: "stable", customize: "no" })).distro.id)
      .toBe("bazzite");
    expect(top(a({ ...base, terminal: "tinker", stability: "fresh", customize: "yes" })).distro.id)
      .toBe("cachyos");
  });

  it("content creator gets Ubuntu Studio", () => {
    const best = top(a({
      device: "desktop", arch: "x86", ram: "8plus", terminal: "paste",
      stability: "stable", familiarity: "win11", customize: "no",
      use: "creative", gpu: "other",
    }));
    expect(best.distro.id).toBe("ubuntu-studio");
  });

  it("developer who enjoys tinkering and likes no existing UI gets Omarchy", () => {
    const best = top(a({
      device: "desktop", arch: "x86", ram: "8plus", terminal: "tinker",
      stability: "fresh", familiarity: "none", customize: "yes",
      use: "dev", gpu: "other",
    }));
    expect(best.distro.id).toBe("omarchy");
  });

  it("developer who only wants to paste a command never sees Omarchy", () => {
    const ids = topIds(a({
      device: "desktop", arch: "x86", ram: "8plus", terminal: "paste",
      stability: "fresh", familiarity: "none", customize: "yes",
      use: "dev", gpu: "other",
    }));
    expect(ids).not.toContain("omarchy");
    expect(["fedora", "popos", "opensuse-tumbleweed", "manjaro", "cachyos"]).toContain(ids[0]);
  });

  it("home server gets a headless image and is never asked about desktops", () => {
    const answers = a({ device: "server", arch: "x86", ram: "4to8", stability: "stable", use: "dev" });
    const best = top(answers);
    expect(["ubuntu-server", "debian"]).toContain(best.distro.id);
    expect(best.edition.de).toBe("none");

    const asked = visibleQuestions(data.questions, answers).map((q) => q.id);
    expect(asked).not.toContain("familiarity");
    expect(asked).not.toContain("customize");
    expect(asked).not.toContain("terminal");
  });
});

/* -------------------------------------------------------------------------- */

describe("question flow", () => {
  it("hides the graphics question on non-x86 hardware", () => {
    const arm = visibleQuestions(data.questions, a({ device: "desktop", arch: "arm" })).map((q) => q.id);
    expect(arm).not.toContain("gpu");

    const x86 = visibleQuestions(data.questions, a({ device: "desktop", arch: "x86" })).map((q) => q.id);
    expect(x86).toContain("gpu");
  });

  it("walks every question exactly once and then finishes", () => {
    const answers: Answers = {};
    const asked: string[] = [];
    for (;;) {
      const q = nextQuestion(data.questions, answers);
      if (!q) break;
      asked.push(q.id);
      answers[q.id] = [q.options[0]!.id];
    }
    expect(new Set(asked).size).toBe(asked.length);
    expect(asked[0]).toBe("device");
    expect(nextQuestion(data.questions, answers)).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */

/** Every reachable combination of answers, including each non-empty subset of the multi-select. */
function* everyAnswerSet(): Generator<Answers> {
  const q = new Map(data.questions.map((x) => [x.id, x.options.map((o) => o.id)]));
  const subsets = (xs: string[]) =>
    Array.from({ length: 2 ** xs.length - 1 }, (_, i) =>
      xs.filter((_, bit) => i + 1 & (1 << bit)));

  for (const device of q.get("device")!)
    for (const arch of q.get("arch")!)
      for (const ram of q.get("ram")!)
        for (const stability of q.get("stability")!)
          for (const use of subsets(q.get("use")!))
            for (const terminal of device === "server" ? [null] : q.get("terminal")!)
              for (const familiarity of device === "server" ? [null] : q.get("familiarity")!)
                for (const customize of device === "server" ? [null] : q.get("customize")!)
                  for (const gpu of arch === "x86" || arch === "unsure" ? q.get("gpu")! : [null]) {
                    const answers: Answers = { device: [device], arch: [arch], ram: [ram], stability: [stability], use };
                    if (terminal) answers.terminal = [terminal];
                    if (familiarity) answers.familiarity = [familiarity];
                    if (customize) answers.customize = [customize];
                    if (gpu) answers.gpu = [gpu];
                    yield answers;
                  }
}

describe("invariants over every reachable answer set", () => {
  it("never returns an empty recommendation", () => {
    let count = 0;
    for (const answers of everyAnswerSet()) {
      const result = recommend(answers, data);
      if (result.candidates.length === 0) {
        throw new Error(`empty result for ${JSON.stringify(answers)}`);
      }
      count++;
    }
    expect(count).toBeGreaterThan(10000);
  });

  it("only reports a relaxed match when the answers genuinely have none", () => {
    for (const answers of everyAnswerSet()) {
      const { relaxed } = recommend(answers, data);
      // Architecture is the one constraint that must never be given up.
      expect(relaxed).not.toContain("arch");
    }
  });

  it("every distro in the dataset wins at least one answer set", () => {
    const winners = new Set<string>();
    for (const answers of everyAnswerSet()) {
      winners.add(recommend(answers, data).candidates[0]!.distro.id);
    }
    const dead = data.distros.map((d) => d.id).filter((id) => !winners.has(id));
    expect(dead).toEqual([]);
  });

  it("scores stay within their normalised bounds", () => {
    for (const answers of everyAnswerSet()) {
      for (const c of recommend(answers, data).candidates) {
        expect(c.normalised).toBeGreaterThanOrEqual(0);
        expect(c.normalised).toBeLessThanOrEqual(1);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */

describe("explanations", () => {
  it("gives the winner reasons, strongest first", () => {
    const best = top(a({
      device: "desktop", arch: "x86", ram: "8plus", terminal: "never",
      stability: "stable", familiarity: "win7", customize: "no",
      use: "officeWeb", gpu: "other",
    }));
    expect(best.reasons.length).toBeGreaterThan(2);
    const magnitudes = best.reasons.map((r) => Math.abs(r.value));
    expect([...magnitudes].sort((x, y) => y - x)).toEqual(magnitudes);
  });

  it("surfaces the NVIDIA caveat as a negative reason", () => {
    const result = recommend(a({
      device: "desktop", arch: "x86", ram: "8plus", terminal: "tinker",
      stability: "fresh", familiarity: "none", customize: "yes",
      use: "dev", gpu: "nvidia",
    }), data, 20);
    const omarchy = result.candidates.find((c) => c.distro.id === "omarchy");
    expect(omarchy?.reasons.some((r) => r.key === "reason.nvidia" && r.value < 0)).toBe(true);
  });
});
