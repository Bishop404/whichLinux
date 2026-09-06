import { describe, expect, it } from "vitest";

import en from "../src/i18n/locales/en.json";
import pl from "../src/i18n/locales/pl.json";
import distrosJson from "../src/data/distros.json";
import desktopsJson from "../src/data/desktops.json";
import questionsJson from "../src/data/questions.json";
import type { Desktop, Distro, Question } from "../src/engine";

const distros = distrosJson as Distro[];
const desktops = desktopsJson as Desktop[];
const questions = questionsJson as Question[];

const dict = en as Record<string, string>;

/** Every key the data or the UI will ask for at runtime. */
function requiredKeys(): string[] {
  const keys = new Set<string>();

  for (const question of questions) {
    keys.add(`question.${question.id}.title`);
    for (const option of question.options) {
      keys.add(`option.${question.id}.${option.id}`);
      for (const weight of option.weights ?? []) {
        // Reasons read differently as a tick and as a caveat, so both must exist.
        keys.add(`${weight.reason}.pos`);
        keys.add(`${weight.reason}.neg`);
      }
    }
  }

  for (const distro of distros) {
    keys.add(`distro.${distro.id}.name`);
    keys.add(`distro.${distro.id}.tagline`);
  }

  for (const desktop of desktops) keys.add(`de.${desktop.id}`);
  keys.add("de.none");

  // Applied by the engine itself rather than by any question.
  keys.add("reason.firmware.pos");
  keys.add("reason.firmware.neg");

  return [...keys];
}

describe("i18n", () => {
  it("English covers every key the data and engine reference", () => {
    expect(requiredKeys().filter((k) => !(k in dict))).toEqual([]);
  });

  it("Polish has the same keys as English", () => {
    const plDict = pl as Record<string, string>;
    expect(Object.keys(dict).filter((k) => !(k in plDict))).toEqual([]);
    expect(Object.keys(plDict).filter((k) => !(k in dict))).toEqual([]);
  });

  it("no locale string is left empty", () => {
    for (const [name, d] of [["en", dict], ["pl", pl as Record<string, string>]] as const) {
      const blank = Object.entries(d).filter(([, v]) => v.trim() === "").map(([k]) => k);
      expect(blank, `${name} has blank strings`).toEqual([]);
    }
  });

  it("placeholders match between English and Polish", () => {
    const plDict = pl as Record<string, string>;
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
    const mismatched = Object.keys(dict)
      .filter((k) => placeholders(dict[k]!) !== placeholders(plDict[k]!));
    expect(mismatched).toEqual([]);
  });

  it("every distro points at a logo and a review date", () => {
    for (const distro of distros) {
      expect(distro.logo, distro.id).toMatch(/^logos\/.+\.svg$/);
      expect(distro.lastReviewed, distro.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("every edition points at a real desktop or is headless", () => {
    const known = new Set(desktops.map((d) => d.id));
    for (const distro of distros) {
      for (const edition of distro.editions) {
        expect(edition.de === "none" || known.has(edition.de), `${distro.id}/${edition.de}`).toBe(true);
        expect(edition.downloadUrl, distro.id).toMatch(/^https:\/\//);
      }
    }
  });
});
