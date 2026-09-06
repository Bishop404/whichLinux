/**
 * Regenerates the Simple Icons logo files in public/logos/.
 *
 * Only the Simple Icons marks are generated. Bazzite and Ubuntu Studio come from
 * their own projects and are committed as downloaded — Bazzite's press kit
 * forbids modifying its logo, so it must stay exactly as published.
 *
 * Run with: npm run logos
 * Provenance and licensing live in public/logos/LOGOS.md.
 */
import { writeFileSync } from "node:fs";
import * as simpleIcons from "simple-icons";

/** distro id -> Simple Icons title. */
const MARKS = {
  mint: "Linux Mint",
  ubuntu: "Ubuntu",
  // Ubuntu Server is Ubuntu; Leap and Tumbleweed are both openSUSE.
  "ubuntu-server": "Ubuntu",
  kubuntu: "Kubuntu",
  lubuntu: "Lubuntu",
  zorin: "Zorin",
  popos: "Pop!_OS",
  debian: "Debian",
  fedora: "Fedora",
  "opensuse-leap": "openSUSE",
  "opensuse-tumbleweed": "openSUSE",
  mx: "MX Linux",
  manjaro: "Manjaro",
  endeavouros: "EndeavourOS",
  cachyos: "CachyOS",
  nobara: "Nobara Linux",
  omarchy: "Omarchy",
  "fedora-asahi": "Asahi Linux",
};

const byTitle = new Map(
  Object.values(simpleIcons).filter((i) => i?.title).map((i) => [i.title, i]),
);

let written = 0;
for (const [id, title] of Object.entries(MARKS)) {
  const icon = byTitle.get(title);
  if (!icon) throw new Error(`simple-icons no longer provides "${title}" (for ${id})`);

  // Filled with the brand's own published colour, so this is not a recolouring.
  writeFileSync(`public/logos/${id}.svg`, icon.svg.replace("<svg ", `<svg fill="#${icon.hex}" `) + "\n");
  written++;
}
console.log(`wrote ${written} logos to public/logos/`);
