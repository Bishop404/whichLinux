import { describe, expect, it } from "vitest";

import questionsJson from "../src/data/questions.json";
import { decodeAnswers, encodeAnswers, truncateFrom } from "../src/state";
import type { Answers, Question } from "../src/engine";

const questions = questionsJson as Question[];

describe("answer URL encoding", () => {
  it("round-trips single and multi answers", () => {
    const answers: Answers = {
      device: ["desktop"], arch: ["x86"], use: ["dev", "gaming"],
    };
    expect(decodeAnswers(encodeAnswers(answers, questions), questions)).toEqual(answers);
  });

  it("encodes in question order, so the same answers give the same link", () => {
    const a: Answers = { use: ["dev"], device: ["desktop"], arch: ["x86"] };
    const b: Answers = { arch: ["x86"], device: ["desktop"], use: ["dev"] };
    expect(encodeAnswers(a, questions)).toBe(encodeAnswers(b, questions));
    expect(encodeAnswers(a, questions)).toBe("device.desktop~arch.x86~use.dev");
  });

  it("drops unknown questions and options from a hand-edited link", () => {
    const decoded = decodeAnswers("device.desktop~nonsense.value~arch.pdp11", questions);
    expect(decoded).toEqual({ device: ["desktop"] });
  });

  it("keeps only the first value for a single-choice question", () => {
    expect(decodeAnswers("device.desktop,server", questions)).toEqual({ device: ["desktop"] });
  });

  it("survives junk without throwing", () => {
    for (const junk of ["", "~", "...", "device", "device.", "=&#"]) {
      expect(() => decodeAnswers(junk, questions)).not.toThrow();
    }
  });
});

describe("revising an earlier answer", () => {
  it("drops every later answer, because visibility depends on earlier ones", () => {
    const answers: Answers = {
      device: ["desktop"], arch: ["x86"], ram: ["8plus"], terminal: ["never"], gpu: ["nvidia"],
    };
    expect(truncateFrom(answers, "ram", questions)).toEqual({
      device: ["desktop"], arch: ["x86"],
    });
  });

  it("leaves answers untouched for an unknown question", () => {
    const answers: Answers = { device: ["desktop"] };
    expect(truncateFrom(answers, "nope", questions)).toEqual(answers);
  });
});
