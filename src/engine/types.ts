/**
 * Language-neutral domain types.
 *
 * Nothing in `src/data/*.json` carries prose: records hold ids, enums and numbers
 * only. Every string a human reads is looked up from `src/i18n/locales/*.json` by
 * key, so translating the site never risks touching scoring data.
 */

export type Family = "debian" | "redhat" | "arch" | "suse" | "independent";

export type ReleaseModel = "lts" | "point" | "point-fast" | "rolling" | "atomic";

export type Arch = "x86_64" | "aarch64" | "apple-silicon";

export type DeviceClass = "desktop" | "server" | "console";

/** How much work the user does to get a working NVIDIA driver. */
export type NvidiaSupport = "builtin" | "installer-optin" | "third-party-repo" | "manual";

/** Whether non-free hardware firmware ships in the installer (Wi-Fi, GPU). */
export type Firmware = "included" | "restricted";

export type DesktopId =
  | "cinnamon" | "kde" | "gnome" | "xfce" | "lxqt"
  | "mate" | "budgie" | "cosmic" | "pantheon" | "hyprland";

/** Which prior OS a desktop feels like, 0 (not at all) to 3 (very much). */
export interface Familiarity {
  win11: number;
  win7: number;
  macos: number;
  chromeos: number;
}

export interface Desktop {
  id: DesktopId;
  familiarity: Familiarity;
  ramMinMb: number;
  /** How far it can be reshaped by the user, 1..5. */
  customizable: number;
}

/** A real, downloadable image. `de: "none"` is a headless server install. */
export interface Edition {
  de: DesktopId | "none";
  /** Official flavour rather than a community spin. */
  official: boolean;
  downloadUrl: string;
  ramMinMb?: number;
  /**
   * Overrides the desktop's familiarity when a distro reshapes it —
   * Zorin's GNOME is themed to look like Windows, so it must not inherit
   * plain GNOME's macOS-leaning scores.
   */
  familiarity?: Familiarity;
}

export interface UseCaseFit {
  officeWeb: number;
  dev: number;
  creative: number;
  gaming: number;
}

export interface Distro {
  id: string;
  family: Family;
  /** Upstream it is built on, or null when it is its own root. */
  base: string | null;
  editions: Edition[];
  releaseModel: ReleaseModel;
  archs: Arch[];
  deviceClasses: DeviceClass[];
  ramMinMb: number;
  nvidia: NvidiaSupport;
  firmware: Firmware;
  /** How much terminal the user must accept, 1..5. */
  terminalRequired: number;
  /** How much it invites customisation, 1..5. */
  tinkering: number;
  /** Newcomer-friendliness, 1..5. Doubles as the tie-break prior. */
  beginner: number;
  use: UseCaseFit;
  homepage: string;
  docsUrl: string;
  logo: string;
  /** ISO date. Distro facts go stale; make that visible rather than silent. */
  lastReviewed: string;
}

/* -------------------------------------------------------------------------- */
/* Questions                                                                  */
/* -------------------------------------------------------------------------- */

/** Hard knockout. Evaluated against the flattened candidate view. */
export type FilterSpec =
  | { attr: string; contains: string }
  | { attr: string; lte: number }
  | { attr: string; gte: number }
  | { attr: string; in: string[] }
  | { attr: string; nin: string[] };

/**
 * Soft ranking contribution. Either an enum lookup (`values`) or a numeric
 * attribute multiplied by `scale`. `reason` is the i18n key shown to the user
 * when this weight fires, which is what makes a recommendation explainable.
 */
export type WeightSpec =
  | { attr: string; values: Record<string, number>; reason: string }
  | { attr: string; scale: number; reason: string };

/** JSON predicate over already-given answers. No `eval`, no hand-written branching. */
export type Condition =
  | { q: string; is: string }
  | { q: string; isNot: string }
  | { all: Condition[] }
  | { any: Condition[] };

export interface QuestionOption {
  id: string;
  filters?: FilterSpec[];
  weights?: WeightSpec[];
}

export interface Question {
  id: string;
  /** Several answers may be selected; their weights all apply. */
  multi?: boolean;
  showIf?: Condition;
  options: QuestionOption[];
}

/** questionId -> chosen option id(s). */
export type Answers = Record<string, string[]>;

/* -------------------------------------------------------------------------- */
/* Results                                                                    */
/* -------------------------------------------------------------------------- */

export interface Reason {
  key: string;
  /** Signed contribution to the score; negative reasons are shown as caveats. */
  value: number;
}

export interface Candidate {
  distro: Distro;
  edition: Edition;
  score: number;
  /** `score` as a fraction of the best achievable score for these answers. */
  normalised: number;
  reasons: Reason[];
}

export interface Recommendation {
  candidates: Candidate[];
  /**
   * Filters dropped to avoid returning nothing, weakest-constraint first.
   * Non-empty means "closest match" rather than "exact match".
   */
  relaxed: string[];
}
