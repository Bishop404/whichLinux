import type { Candidate, Recommendation } from "../engine";
import { locale, reasonText, t } from "../i18n";
import { el } from "./dom";

/** How many ticks and caveats the primary card shows before it becomes noise. */
const MAX_REASONS = 4;
const MAX_CAVEATS = 2;

function editionLabel(candidate: Candidate): string {
  return t("result.edition", { desktop: t(`de.${candidate.edition.de}`) });
}

function socialLink(label: string, href: string, icon: "email" | "github"): HTMLAnchorElement {
  const link = el("a", {
    class: "result-footer__link",
    href,
    "aria-label": label,
    title: label,
    ...(icon === "github" ? { target: "_blank", rel: "noopener noreferrer" } : {}),
  });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  const path = document.createElementNS(svg.namespaceURI, "path");
  if (icon === "email") {
    path.setAttribute("d", "M3 5h18v14H3z M3 6l9 7 9-7");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.8");
    path.setAttribute("stroke-linejoin", "round");
  } else {
    path.setAttribute("fill", "currentColor");
    path.setAttribute("d", "M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.53v-2.08c-3.1.68-3.76-1.32-3.76-1.32-.5-1.3-1.24-1.65-1.24-1.65-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 1.7 2.62 1.21 3.26.93.1-.72.39-1.21.71-1.49-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.15a10.6 10.6 0 0 1 5.55 0c2.11-1.45 3.04-1.15 3.04-1.15.61 1.54.23 2.68.12 2.96.71.78 1.14 1.78 1.14 3 0 4.29-2.61 5.23-5.1 5.51.4.35.76 1.03.76 2.08V22c0 .29.2.64.77.53A11.1 11.1 0 0 0 12 .9Z");
  }
  svg.append(path);
  link.append(svg);
  return link;
}

/**
 * Only approved source assets are displayed. They are loaded as ordinary images
 * so application code cannot recolour, rewrite, or otherwise alter the mark.
 * A missing asset intentionally falls back to the product name as text.
 */
function logo(candidate: Candidate, className: string): HTMLElement | undefined {
  const chip = el("span", { class: `chip ${className}`.trim(), "aria-hidden": "true" });
  if (candidate.distro.logo) {
    chip.append(el("img", { src: `${import.meta.env.BASE_URL}${candidate.distro.logo}`, alt: "" }));
    return chip;
  }

  if (!candidate.distro.logoColor) return undefined;
  // This is deliberately a neutral monogram, never an approximation of a logo.
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 48 48");
  const background = document.createElementNS(svg.namespaceURI, "rect");
  background.setAttribute("width", "48");
  background.setAttribute("height", "48");
  background.setAttribute("fill", candidate.distro.logoColor);
  const initial = document.createElementNS(svg.namespaceURI, "text");
  initial.setAttribute("x", "24");
  initial.setAttribute("y", "31");
  initial.setAttribute("fill", "white");
  initial.setAttribute("font-size", "25");
  initial.setAttribute("font-family", "system-ui, sans-serif");
  initial.setAttribute("font-weight", "700");
  initial.setAttribute("text-anchor", "middle");
  initial.textContent = t(`distro.${candidate.distro.id}.name`).trim().charAt(0).toUpperCase();
  svg.append(background, initial);
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
    el("footer", { class: "result-footer" }, [
      socialLink(t("result.emailContact"), "mailto:hello@whichlinux.eu", "email"),
      socialLink(t("result.github"), "https://github.com/Bishop404/whichLinux", "github"),
    ]),
  ]);
}
