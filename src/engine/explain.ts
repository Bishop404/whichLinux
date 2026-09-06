import type { Reason, WeightSpec } from "./types";
import type { FlatCandidate } from "./flatten";
import { contribution } from "./score";

/**
 * Turns the weights that actually fired into user-facing reason keys.
 * Several questions can share a reason (tinkering is rewarded by both the
 * terminal and the customisation question), so contributions are summed per key
 * rather than listed twice.
 */
export function explain(candidate: FlatCandidate, weights: WeightSpec[]): Reason[] {
  const totals = new Map<string, number>();

  for (const weight of weights) {
    const value = contribution(candidate, weight);
    if (value === 0) continue;
    totals.set(weight.reason, (totals.get(weight.reason) ?? 0) + value);
  }

  return [...totals]
    .map(([key, value]) => ({ key, value }))
    .filter((r) => r.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}
