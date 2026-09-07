import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import distrosJson from "../src/data/distros.json";
import type { Distro } from "../src/engine";

const distros = distrosJson as Distro[];
const approved = new Set([
  "ubuntu", "ubuntu-server", "debian", "bazzite", "cachyos", "endeavouros",
  "popos", "opensuse-leap", "opensuse-tumbleweed", "fedora-asahi", "omarchy",
]);

describe("logo policy", () => {
  it("ships only explicitly approved marks", () => {
    for (const distro of distros) {
      if (distro.logo) expect(approved, distro.id).toContain(distro.id);
      if (distro.logo) expect(existsSync(`public/${distro.logo}`), distro.id).toBe(true);
    }
  });

  it("keeps a public notice for every shipped mark", () => {
    const notice = readFileSync("public/logos/LOGOS.md", "utf8");
    for (const id of approved) expect(notice).toContain(`\`${id}\``);
  });
});
