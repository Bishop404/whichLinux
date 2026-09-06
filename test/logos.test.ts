import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as simpleIcons from "simple-icons";

import distrosJson from "../src/data/distros.json";
import type { Distro } from "../src/engine";

const distros = distrosJson as Distro[];

/**
 * The licensing position for these logos rests entirely on shipping them
 * unmodified — Fedora's guidelines permit inclusion in an icon collection only
 * "unmodified from the logo image except in size and/or file format", and
 * Bazzite's press kit forbids changing colour outright. Baking a fill into the
 * files would quietly break both, so it is asserted rather than just documented.
 */
const byTitle = new Map(
  Object.values(simpleIcons).filter((i: any) => i?.title).map((i: any) => [i.title, i]),
);

const MARKS: Record<string, string> = {
  mint: "Linux Mint", ubuntu: "Ubuntu", "ubuntu-server": "Ubuntu", kubuntu: "Kubuntu",
  lubuntu: "Lubuntu", zorin: "Zorin", popos: "Pop!_OS", debian: "Debian", fedora: "Fedora",
  "opensuse-leap": "openSUSE", "opensuse-tumbleweed": "openSUSE", mx: "MX Linux",
  manjaro: "Manjaro", endeavouros: "EndeavourOS", cachyos: "CachyOS",
  nobara: "Nobara Linux", omarchy: "Omarchy", "fedora-asahi": "Asahi Linux",
};

describe("logo licensing", () => {
  it("ships every Simple Icons mark byte-identical to upstream", () => {
    for (const [id, title] of Object.entries(MARKS)) {
      const icon: any = byTitle.get(title);
      expect(icon, `simple-icons no longer has "${title}"`).toBeDefined();

      const shipped = readFileSync(`public/logos/${id}.svg`, "utf8");
      expect(shipped, `public/logos/${id}.svg differs from upstream`).toBe(icon.svg + "\n");
    }
  });

  it("never bakes a colour into a logo file", () => {
    for (const distro of distros) {
      const svg = readFileSync(`public/${distro.logo}`, "utf8");
      if (!distro.logoColor) continue; // full-colour marks legitimately carry colour
      expect(svg, `${distro.id} has a fill baked in`).not.toMatch(/fill="#/);
    }
  });

  it("records a brand colour for every single-colour mark", () => {
    for (const distro of distros) {
      if (!(distro.id in MARKS)) continue;
      expect(distro.logoColor, `${distro.id} is missing logoColor`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("keeps the full-colour marks that may not be altered as plain images", () => {
    // Bazzite's press kit and Ubuntu Studio's original are used exactly as
    // supplied, so they must not be given a tint to paint over them.
    for (const id of ["bazzite", "ubuntu-studio"]) {
      const distro = distros.find((d) => d.id === id)!;
      expect(distro.logoColor, `${id} must not be tinted`).toBeUndefined();
      expect(existsSync(`public/${distro.logo}`)).toBe(true);
    }
  });

  it("documents provenance for every logo that ships", () => {
    const notice = readFileSync("public/logos/LOGOS.md", "utf8");
    for (const distro of distros) {
      expect(notice, `${distro.id} is undocumented in LOGOS.md`).toContain(`\`${distro.id}\``);
    }
  });
});
