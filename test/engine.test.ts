import { describe, expect, it } from "vitest";

import distrosJson from "../src/data/distros.json";
import desktopsJson from "../src/data/desktops.json";
import questionsJson from "../src/data/questions.json";

import { nextQuestion, recommend, visibleQuestions } from "../src/engine";
import type { Answers, Desktop, Distro, EngineData, Question } from "../src/engine";
import { everyAnswerSet } from "../scripts/answer-sets";

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

  it("home server gets a headless image and is only asked questions a server has", () => {
    const answers = a({ device: "server", arch: "x86", ram: "4to8", stability: "stable", serverUse: "apps" });
    const best = top(answers);
    expect(["ubuntu-server", "debian"]).toContain(best.distro.id);
    expect(best.edition.de).toBe("none");

    const asked = visibleQuestions(data.questions, answers).map((q) => q.id);
    expect(asked).toEqual(["device", "arch", "ram", "stability", "serverUse"]);
  });

  it("a server for photos and backups gets a storage distro, not a general one", () => {
    const best = top(a({
      device: "server", arch: "x86", ram: "8plus", stability: "stable", serverUse: "files",
    }));
    expect(best.distro.id).toBe("truenas");
    expect(best.edition.de).toBe("none");
  });

  it("drops the storage appliance on a machine too small to run it", () => {
    // TrueNAS asks for 8 GB. Below that the memory filter must knock it out
    // rather than recommend something that will not run.
    const ids = topIds(a({
      device: "server", arch: "x86", ram: "4to8", stability: "stable", serverUse: "files",
    }));
    expect(ids).not.toContain("truenas");
    expect(ids[0]).toBe("opensuse-leap");
  });

  it("a Raspberry Pi server gets the OS written for the Pi", () => {
    const best = top(a({
      device: "server", arch: "arm", ram: "4to8", stability: "stable", serverUse: "files",
    }));
    expect(best.distro.id).toBe("raspberry-pi-os");
  });

  it("a console too small for Bazzite gets one that actually fits the memory", () => {
    const result = recommend(a({
      device: "console", arch: "x86", ram: "under4", terminal: "never",
      stability: "stable", familiarity: "none", customize: "no", use: "gaming", gpu: "other",
    }), data);
    expect(result.candidates[0]!.distro.id).toBe("batocera");
    // The whole point: it fits, so nothing has to be given up to reach it.
    expect(result.relaxed).toEqual([]);
  });

  it("an ARM console is answered natively rather than by bending the device", () => {
    const result = recommend(a({
      device: "console", arch: "arm", ram: "4to8", terminal: "never",
      stability: "stable", familiarity: "none", customize: "no", use: "gaming",
    }), data);
    expect(result.candidates[0]!.distro.id).toBe("batocera");
    expect(result.relaxed).not.toContain("device");
  });

  it("hands the newest-software console user ChimeraOS rather than CachyOS", () => {
    const best = top(a({
      device: "console", arch: "x86", ram: "8plus", terminal: "never",
      stability: "fresh", familiarity: "none", customize: "no", use: "gaming", gpu: "other",
    }));
    expect(best.distro.id).toBe("chimeraos");
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

/**
 * Every reachable combination of answers, derived from the questions themselves
 * so a new question or a new `showIf` cannot silently leave part of the flow
 * untested. Shared with the analysis scripts in `scripts/`.
 */
const allAnswerSets = () => everyAnswerSet(data.questions);

describe("invariants over every reachable answer set", () => {
  it("never returns an empty recommendation", () => {
    let count = 0;
    for (const answers of allAnswerSets()) {
      const result = recommend(answers, data);
      if (result.candidates.length === 0) {
        throw new Error(`empty result for ${JSON.stringify(answers)}`);
      }
      count++;
    }
    expect(count).toBeGreaterThan(10000);
  });

  it("only reports a relaxed match when the answers genuinely have none", () => {
    for (const answers of allAnswerSets()) {
      const { relaxed } = recommend(answers, data);
      // Architecture is the one constraint that must never be given up.
      expect(relaxed).not.toContain("arch");
    }
  });

  it("every distro in the dataset wins at least one answer set", () => {
    const winners = new Set<string>();
    for (const answers of allAnswerSets()) {
      winners.add(recommend(answers, data).candidates[0]!.distro.id);
    }
    const dead = data.distros.map((d) => d.id).filter((id) => !winners.has(id));
    expect(dead).toEqual([]);
  });

  it("every server-class distro can be scored by the server question", () => {
    // `serverUse` is the only question the server flow ranks on. A server record
    // without these scores is invisible to it and can only ever tie.
    const unscored = data.distros
      .filter((d) => d.deviceClasses.includes("server") && !d.server)
      .map((d) => d.id);
    expect(unscored).toEqual([]);
  });

  it("scores stay within their normalised bounds", () => {
    for (const answers of allAnswerSets()) {
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
