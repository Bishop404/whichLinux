import type { Candidate, Recommendation } from "../engine";
import { LOGO_MARKUP } from "../data/logos";
import { locale, reasonText, t } from "../i18n";
import { el } from "./dom";

/** How many ticks and caveats the primary card shows before it becomes noise. */
const MAX_REASONS = 4;
const MAX_CAVEATS = 2;

function editionLabel(candidate: Candidate): string {
  return t("result.edition", { desktop: t(`de.${candidate.edition.de}`) });
}

/**
 * Marks are inlined into the page rather than loaded as images.
 *
 * The markup is a verbatim copy of the shipped file, so the licensing position
 * is unchanged: a single-colour mark is tinted by setting `fill` on the copy in
 * the DOM, never on the file. Bazzite and Ubuntu Studio carry their own colours
 * and are left exactly as supplied.
 */
function logo(candidate: Candidate, className: string): HTMLElement {
  const chip = el("span", { class: `chip ${className}`.trim(), "aria-hidden": "true" });

  const markup = LOGO_MARKUP[candidate.distro.id];
  if (!markup) return chip;

  const parsed = new DOMParser().parseFromString(markup, "image/svg+xml");
  const root = parsed.documentElement;
  // A parse failure yields a <parsererror> document rather than throwing.
  if (root.nodeName.toLowerCase() !== "svg") return chip;

  const svg = document.importNode(root, true) as unknown as SVGElement;
  // Sized by CSS; the viewBox carries the aspect ratio.
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  // `fill` is inherited, and the single-colour marks set none of their own.
  if (candidate.distro.logoColor) svg.setAttribute("fill", candidate.distro.logoColor);

  chip.append(svg);
  return chip;
}

function reasonList(candidate: Candidate): (HTMLElement | undefined)[] {
  const positives = candidate.reasons.filter((r) => r.value > 0).slice(0, MAX_REASONS);
  const negatives = candidate.reasons.filter((r) => r.value < 0).slice(0, MAX_CAVEATS);

  const block = (
    title: string,
    entries: typeof positives,
    modifier: "pos" | "neg",
  ) => entries.length === 0 ? undefined : el("div", { class: "reasons" }, [
    el("h3", { text: title }),
    el("ul", { class: `reasons--${modifier}` },
      entries.map((r) => el("li", { text: reasonText(r.key, r.value) }))),
  ]);

  return [
    block(t("result.why"), positives, "pos"),
    block(t("result.caveats"), negatives, "neg"),
  ];
}

function primaryCard(candidate: Candidate): HTMLElement {
  const name = t(`distro.${candidate.distro.id}.name`);

  return el("article", { class: "pick" }, [
    el("div", { class: "pick__head" }, [
      logo(candidate, "chip--lg"),
      el("div", {}, [
        el("h2", { class: "pick__name", text: name }),
        el("span", { class: "pick__edition", text: editionLabel(candidate) }),
      ]),
      el("p", { class: "pick__match" }, [
        el("b", { text: `${Math.round(candidate.normalised * 100)}%` }),
        document.createTextNode(t("result.matchLabel")),
      ]),
    ]),
    el("p", { class: "pick__tagline", text: t(`distro.${candidate.distro.id}.tagline`) }),
    ...reasonList(candidate),
    el("div", { class: "links" }, [
      el("a", {
        class: "btn btn--primary",
        href: candidate.edition.downloadUrl,
        rel: "noopener noreferrer",
        target: "_blank",
        text: `${t("result.download")} ↗`,
      }),
      el("a", {
        class: "btn", href: candidate.distro.docsUrl,
        rel: "noopener noreferrer", target: "_blank",
        text: `${t("result.docs")} ↗`,
      }),
      el("a", {
        class: "btn", href: candidate.distro.homepage,
        rel: "noopener noreferrer", target: "_blank",
        text: `${t("result.homepage")} ↗`,
      }),
    ]),
  ]);
}

function alternativeCard(candidate: Candidate, winnerReasons: Set<string>): HTMLElement {
  // Say what sets this one apart from the pick above it. Repeating a reason the
  // winner already gave ("great for web and documents") tells the reader nothing
  // about why they might choose this instead.
  const positives = candidate.reasons.filter((r) => r.value > 0);
  const distinguishing = positives.find((r) => !winnerReasons.has(r.key)) ?? positives[0];

  return el("article", { class: "alt" }, [
    logo(candidate, "chip--sm"),
    el("div", {}, [
      el("h3", { text: t(`distro.${candidate.distro.id}.name`) }),
      el("p", { text: editionLabel(candidate) }),
      distinguishing
        ? el("p", { class: "alt__why", text: reasonText(distinguishing.key, distinguishing.value) })
        : undefined,
      el("p", {}, [
        el("a", {
          href: candidate.edition.downloadUrl,
          rel: "noopener noreferrer", target: "_blank",
          text: `${t("result.download")} ↗`,
        }),
      ]),
    ]),
  ]);
}

export function renderResults(result: Recommendation): HTMLElement {
  const [best, ...rest] = result.candidates;
  if (!best) return el("section", { class: "view" });

  const reviewed = new Intl.DateTimeFormat(locale(), { dateStyle: "long" })
    .format(new Date(best.distro.lastReviewed));

  const winnerReasons = new Set(best.reasons.filter((r) => r.value > 0).map((r) => r.key));

  return el("section", { class: "view" }, [
    el("h1", { class: "result__heading", text: t("result.heading") }),

    result.relaxed.length > 0
      ? el("p", {
          class: "notice",
          text: t("result.relaxed", {
            what: result.relaxed.map((id) => t(`result.relaxed.${id}`)).join(", "),
          }),
        })
      : undefined,

    primaryCard(best),

    rest.length > 0
      ? el("section", { class: "alts" }, [
          el("h2", { text: t("result.alternatives") }),
          el("div", { class: "alts__grid" }, rest.map((c) => alternativeCard(c, winnerReasons))),
        ])
      : undefined,

    el("p", { class: "disclaimer", text: t("result.disclaimer") }),
    el("p", { class: "reviewed", text: t("result.reviewed", { date: reviewed }) }),
    // Nominative use of these marks depends on not implying endorsement, so the
    // disclaimer belongs in front of visitors, not only in the repo.
    el("p", { class: "reviewed", text: t("result.trademarks") }),
  ]);
}
