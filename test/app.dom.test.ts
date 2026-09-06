// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { start } from "../src/main";

/**
 * Drives the real application through the real DOM: no mocked engine, no mocked
 * rendering. This is what catches the wiring bugs the pure engine tests cannot.
 */

/** Lets the app's async boot and any queued microtasks settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Polls until `check` passes — a lazily imported locale is not ready on the next tick. */
async function waitFor(check: () => boolean, what: string): Promise<void> {
  for (let i = 0; i < 100; i++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`timed out waiting for ${what}`);
}

async function boot(hash = ""): Promise<void> {
  document.body.innerHTML = `<header id="masthead"></header><main id="app"></main>`;
  location.hash = hash;
  await start();
  await settle();
}

const heading = () => document.querySelector(".question__title")?.textContent ?? "";
const options = () => [...document.querySelectorAll<HTMLButtonElement>(".option")];
const historyRows = () => [...document.querySelectorAll<HTMLButtonElement>(".history__item button")];

/** Clicks the option whose visible label contains `label`. */
async function pick(label: string): Promise<void> {
  const button = options().find((b) => b.textContent?.includes(label));
  if (!button) {
    throw new Error(`no option matching "${label}" in: ${options().map((b) => b.textContent).join(" | ")}`);
  }
  button.click();
  await settle();
}

describe("the app, end to end", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it("walks a Windows 7 refugee to Linux Mint", async () => {
    await boot();

    expect(heading()).toContain("What are you setting up");
    await pick("laptop or desktop");
    await pick("regular PC");
    await pick("8 GB or more");
    await pick("rather never see it");
    await pick("don't break it");
    await pick("Windows 7");
    await pick("out of the box");
    await pick("Web and documents");

    // Multi-select needs confirming; single-choice questions advance on click.
    document.querySelector<HTMLButtonElement>(".btn--primary")!.click();
    await settle();

    await pick("Intel");

    const name = document.querySelector(".pick__name")?.textContent;
    expect(name).toBe("Linux Mint");
    expect(document.querySelector(".pick__edition")?.textContent).toContain("Cinnamon");

    // The result must justify itself, and offer somewhere to go next.
    expect(document.querySelectorAll(".reasons--pos li").length).toBeGreaterThan(1);
    expect(document.querySelector<HTMLAnchorElement>(".links a")?.href).toMatch(/^https:\/\//);
    expect(document.querySelectorAll(".alt").length).toBe(2);
  });

  it("puts the answers in the URL so the result can be shared", async () => {
    await boot();
    await pick("laptop or desktop");
    await pick("regular PC");

    expect(location.hash).toBe("#a=device.desktop~arch.x86");
  });

  it("restores a shared link without re-asking", async () => {
    await boot("#a=device.desktop~arch.apple");

    expect(document.querySelector(".pick__name")?.textContent).toBe("Fedora Asahi Remix");
    expect(document.querySelector(".question__title")).toBeNull();
  });

  it("ends the flow early when only one distro can possibly fit", async () => {
    await boot();
    await pick("laptop or desktop");
    await pick("Apple Silicon");

    expect(document.querySelector(".pick__name")?.textContent).toBe("Fedora Asahi Remix");
    expect(document.querySelector(".question__title")).toBeNull();
  });

  it("lets an earlier answer be revised, dropping the answers that followed", async () => {
    await boot();
    await pick("laptop or desktop");
    await pick("regular PC");
    await pick("8 GB or more");
    expect(historyRows()).toHaveLength(3);

    // Go back to the second question via the history strip.
    historyRows()[1]!.click();
    await settle();

    expect(heading()).toContain("What's inside it");
    expect(historyRows()).toHaveLength(1);
    expect(location.hash).toBe("#a=device.desktop");
  });

  it("never asks a home server about desktops", async () => {
    await boot();
    await pick("home server");
    await pick("regular PC");

    const asked: string[] = [];
    while (document.querySelector(".question__title")) {
      asked.push(heading());
      options()[0]!.click();
      await settle();
      if (document.querySelector(".btn--primary:not([disabled])")?.textContent?.includes("Continue")) {
        document.querySelector<HTMLButtonElement>(".btn--primary")!.click();
        await settle();
      }
    }

    expect(asked.join(" ")).not.toContain("feels most like home");
    expect(asked.join(" ")).not.toContain("decorating");
    expect(document.querySelector(".pick__edition")?.textContent).toContain("Server");
  });

  /** Answers everything up to the multi-select "what will you do" question. */
  async function toMultiSelect(): Promise<void> {
    await boot();
    await pick("laptop or desktop");
    await pick("regular PC");
    await pick("8 GB or more");
    await pick("rather never see it");
    await pick("don't break it");
    await pick("Windows 7");
    await pick("out of the box");
    expect(heading()).toContain("What will you mostly do");
  }

  it("confirms a multi-select with Enter when nothing is focused", async () => {
    await toMultiSelect();
    await pick("Web and documents");

    dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await settle();

    expect(heading()).toContain("graphics card");
  });

  it("confirms with Enter while an option button has focus, without re-toggling it", async () => {
    await toMultiSelect();
    const gaming = options().find((b) => b.textContent?.includes("Gaming"))!;
    gaming.click();
    gaming.focus();
    await settle();
    expect(gaming.getAttribute("aria-pressed")).toBe("true");

    gaming.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await settle();

    // It advanced, and it kept the selection rather than un-picking it.
    expect(heading()).toContain("graphics card");
    expect(location.hash).toContain("use.gaming");
  });

  it("does not confirm an empty multi-select with Enter", async () => {
    await toMultiSelect();
    dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await settle();

    expect(heading()).toContain("What will you mostly do");
  });

  it("leaves Enter alone on a single-choice question", async () => {
    await boot();
    dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await settle();

    expect(heading()).toContain("What are you setting up");
  });

  it("selects options with the number keys", async () => {
    await boot();
    dispatchEvent(new KeyboardEvent("keydown", { key: "1", bubbles: true }));
    await settle();

    expect(heading()).toContain("What's inside it");
  });

  it("switches language without losing the answers", async () => {
    await boot();
    await pick("laptop or desktop");
    await pick("regular PC");

    const select = document.querySelector<HTMLSelectElement>("select.control")!;
    select.value = "pl";
    select.dispatchEvent(new Event("change"));
    await waitFor(() => document.documentElement.lang === "pl", "the Polish locale to load");

    expect(heading()).toContain("pamięci");
    expect(historyRows()).toHaveLength(2);
    expect(document.documentElement.lang).toBe("pl");
  });
});
