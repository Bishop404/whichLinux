import type { FilterSpec } from "./types";
import type { FlatCandidate } from "./flatten";

/** True when the candidate survives this hard knockout. */
export function passes(candidate: FlatCandidate, filter: FilterSpec): boolean {
  const value = candidate[filter.attr];

  if ("contains" in filter) {
    return Array.isArray(value) && value.includes(filter.contains);
  }
  if ("lte" in filter) {
    return typeof value === "number" && value <= filter.lte;
  }
  if ("gte" in filter) {
    return typeof value === "number" && value >= filter.gte;
  }
  if ("in" in filter) {
    return filter.in.includes(String(value));
  }
  return !filter.nin.includes(String(value));
}
