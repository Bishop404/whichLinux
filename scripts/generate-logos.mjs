/**
 * Regenerates the Simple Icons logo files in public/logos/.
 *
 * Only the Simple Icons marks are generated. Bazzite and Ubuntu Studio come from
 * their own projects and are committed as downloaded — Bazzite's press kit
 * forbids modifying its logo, so it must stay exactly as published.
 *
 * Files are written EXACTLY as Simple Icons publishes them. Nothing is recoloured
 * on disk: the brand colour is recorded in distros.json as `logoColor` and applied
 * at render time instead. That keeps every file a verbatim redistribution, which
 * is what several of the upstream licences and brand guidelines actually require —
 * Fedora permits inclusion in icon collections only "unmodified from the logo
 * image except in size and/or file format", and Debian (CC BY-SA) and MX Linux
 * (GPL) are far simpler to comply with when nothing is derived from them.
 *
 * Run with: npm run logos
 * Provenance and licensing live in public/logos/LOGOS.md.
 */
import { readFileSync, writeFileSync } from "node:fs";
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

const distrosPath = "src/data/distros.json";
const distros = JSON.parse(readFileSync(distrosPath, "utf8"));
const byId = new Map(distros.map((d) => [d.id, d]));

let written = 0;
for (const [id, title] of Object.entries(MARKS)) {
  const icon = byTitle.get(title);
  if (!icon) throw new Error(`simple-icons no longer provides "${title}" (for ${id})`);

  writeFileSync(`public/logos/${id}.svg`, icon.svg + "\n");

  // The brand colour lives in the data, not in the file.
  const distro = byId.get(id);
  if (!distro) throw new Error(`no distro "${id}" in ${distrosPath}`);
  distro.logoColor = `#${icon.hex}`;
  written++;
}

writeFileSync(distrosPath, JSON.stringify(distros, null, 2) + "\n");
console.log(`wrote ${written} verbatim logos; synced logoColor into ${distrosPath}`);
