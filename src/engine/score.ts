import type { WeightSpec } from "./types";
import type { FlatCandidate } from "./flatten";

/** This weight's signed contribution to a candidate's score. */
export function contribution(candidate: FlatCandidate, weight: WeightSpec): number {
  const value = candidate[weight.attr];

  if ("values" in weight) {
    return weight.values[String(value)] ?? 0;
  }
  return typeof value === "number" ? value * weight.scale : 0;
}
