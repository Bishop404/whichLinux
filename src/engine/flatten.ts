import type { Desktop, Distro, Edition, Familiarity } from "./types";

/**
 * A distro+edition pair collapsed into a flat bag of dotted keys, so weight and
 * filter specs in `questions.json` can address any attribute by name without the
 * engine knowing what any particular attribute means.
 */
export type FlatCandidate = Record<string, unknown>;

const NO_FAMILIARITY: Familiarity = { win11: 0, win7: 0, macos: 0 };

/** Memory the edition actually needs: the edition overrides the distro default. */
export function effectiveRam(distro: Distro, edition: Edition): number {
  return edition.ramMinMb ?? distro.ramMinMb;
}

/** Coarse memory bucket. Bucketing keeps the weights readable and explainable. */
export function weightClass(ramMb: number): "light" | "medium" | "heavy" {
  if (ramMb <= 1500) return "light";
  if (ramMb <= 2500) return "medium";
  return "heavy";
}

export function flatten(
  distro: Distro,
  edition: Edition,
  desktops: Map<string, Desktop>,
): FlatCandidate {
  const desktop = edition.de === "none" ? undefined : desktops.get(edition.de);
  // An edition may restyle its desktop (Zorin's Windows-like GNOME), in which
  // case its own familiarity wins over the desktop's generic scores.
  const familiarity = edition.familiarity ?? desktop?.familiarity ?? NO_FAMILIARITY;
  const ram = effectiveRam(distro, edition);

  return {
    id: distro.id,
    family: distro.family,
    base: distro.base,
    releaseModel: distro.releaseModel,
    archs: distro.archs,
    deviceClasses: distro.deviceClasses,
    nvidia: distro.nvidia,
    firmware: distro.firmware,
    terminalRequired: distro.terminalRequired,
    tinkering: distro.tinkering,
    beginner: distro.beginner,

    "use.officeWeb": distro.use.officeWeb,
    "use.dev": distro.use.dev,
    "use.creative": distro.use.creative,
    "use.gaming": distro.use.gaming,

    // Absent on desktop records. 0 matches no key in a weight's `values`, so a
    // desktop distro pulled in by relaxation scores nothing here rather than
    // being credited or penalised for a job it was never rated on.
    "server.files": distro.server?.files ?? 0,
    "server.apps": distro.server?.apps ?? 0,

    de: edition.de,
    official: edition.official,
    "de.customizable": desktop?.customizable ?? 0,
    "de.ramMinMb": desktop?.ramMinMb ?? 0,

    "familiarity.win11": familiarity.win11,
    "familiarity.win7": familiarity.win7,
    "familiarity.macos": familiarity.macos,

    effectiveRamMinMb: ram,
    weightClass: weightClass(ram),
  };
}
