# Logo provenance and licensing

Every logo here is the real mark of the project it identifies.

## Every file is a verbatim copy

**No file in this directory has been modified.** Each one is byte-identical to
what its project (or Simple Icons) published. Brand colours are applied at
*render time* — the colour lives in `logoColor` in `src/data/distros.json` and
is painted with a CSS mask — so nothing here is a derivative work.

That single decision resolves most of the licensing questions below. Verbatim
redistribution needs only attribution and a licence notice, which is what this
file is. Had the colours been baked into the files, each one would have been a
derivative and would have carried the upstream licence's obligations onward —
and would have broken Fedora's and Bazzite's rules outright.

## Copyright and trademark are different questions

**Copyright** governs copying the file. **Trademark** governs using the mark in a
way that could mislead people about who endorses what. **No licence makes a
trademark free** — that part is never "resolved" by choosing a better file, only
by how the mark is used.

This site's use is *nominative*: the marks identify the actual products being
recommended, unaltered, beside each project's own name and a link to its site.
No mark appears in this site's name, domain, branding or favicon, and the results
page carries a visible "not affiliated with, nor endorsed by" notice.

## Sources

| Distro | Mark | Licence | Upstream |
| --- | --- | --- | --- |
| `mint` | Linux Mint | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [source](https://github.com/linuxmint/brand-logo/blob/540ac3b08e987866d77a340f557f994c988ac2ae/ring-mono-green.svg) |
| `ubuntu` | Ubuntu | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [source](https://design.ubuntu.com/resources) |
| `ubuntu-server` | Ubuntu | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [source](https://design.ubuntu.com/resources) |
| `kubuntu` | Kubuntu | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [source](https://kubuntu.org) |
| `lubuntu` | Lubuntu | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [source](https://lubuntu.net) |
| `zorin` | Zorin | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [source](https://zorin.com/press) |
| `popos` | Pop!_OS | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [source](https://github.com/system76/brand/blob/7a31740b54f929b62a165baa61dfb0b5164261e8/Pop_OS%20branding/Pop_icon.svg) |
| `debian` | Debian | [CC-BY-SA-3.0](https://spdx.org/licenses/CC-BY-SA-3.0) | [source](https://www.debian.org/logos) |
| `fedora` | Fedora | [custom](https://docs.fedoraproject.org/en-US/project/brand/) | [source](https://docs.fedoraproject.org/en-US/project/brand/) |
| `opensuse-leap` | openSUSE | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [source](https://github.com/openSUSE/artwork/blob/33e94aa76837c09f03d1712705949b71a246a53b/logos/buttons/button-colour.svg) |
| `opensuse-tumbleweed` | openSUSE | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [source](https://github.com/openSUSE/artwork/blob/33e94aa76837c09f03d1712705949b71a246a53b/logos/buttons/button-colour.svg) |
| `mx` | MX Linux | [GPL-3.0-only](https://spdx.org/licenses/GPL-3.0-only) | [source](https://mxlinux.org/art/) |
| `manjaro` | Manjaro | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [source](https://manjaro.org) |
| `endeavouros` | EndeavourOS | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [source](https://github.com/endeavouros-team/endeavouros-theming/blob/135f642c980ed8d8fc212783eb478f96226f6c72/endeavouros-logo-text.svg) |
| `cachyos` | CachyOS | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [source](https://commons.wikimedia.org/wiki/File:CachyOS_Logo.svg) |
| `nobara` | Nobara Linux | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [source](https://wiki.nobaraproject.org) |
| `omarchy` | Omarchy | [MIT](https://spdx.org/licenses/MIT) | [source](https://omarchy.org) |
| `fedora-asahi` | Asahi Linux | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [source](https://github.com/AsahiLinux/artwork/blob/292637c9658c1491ddc1128fb6134aec01d904dd/logos/svg/AsahiLinux_logomark_mono.svg) |
| `bazzite` | Bazzite | [Apache-2.0](https://spdx.org/licenses/Apache-2.0) | [press kit](https://github.com/ublue-os/bazzite/tree/main/press_kit) |
| `ubuntu-studio` | Ubuntu Studio | Public domain (below threshold of originality) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Ubuntustudio_v3_logo_only.svg) |

## What each obligation actually requires

- **Fedora** — not an open licence. Red Hat's guidelines say you "must not alter
  the logo's design, color, or proportions", and separately that the Fedora
  Council "grants permission for a version of the official Fedora logo to be
  included in collections of icons, unmodified from the logo image except in size
  and/or file format". Shipping it verbatim is squarely inside that grant.
- **Debian** — CC BY-SA 3.0. Attributed above, unmodified, so no share-alike
  obligation is triggered on anything else. Debian is a registered trademark of
  Software in the Public Interest, Inc.
- **MX Linux** — GPL-3.0-only. The SVG is its own source form, so shipping it
  satisfies the source requirement; this file is the licence notice.
- **Bazzite** — Apache-2.0, from the project's press kit, which says "do not
  distort or modify the artwork or logos, including spacing, color, elements, and
  scaling". It is used exactly as published, which is why it is one of the two
  full-colour marks rather than a tinted glyph.
- **Omarchy** — MIT. **Ubuntu / Kubuntu / Lubuntu / Ubuntu Server / Ubuntu
  Studio** — Canonical trademarks; their policy requires permission for use in a
  domain name, for merchandising, or for a confusingly similar mark. None apply.

## If you want zero residual risk

Trademark exposure cannot be licensed away, only avoided. To drop it entirely,
delete `logoColor` and `logo` usage and show project names as text. Note that
`test/i18n.test.ts` asserts every `logo` path exists, so that test needs
relaxing too. Nothing else in the app depends on the images.

## Regenerating

`npm run logos` rewrites the Simple Icons files verbatim and re-syncs
`logoColor` into `src/data/distros.json`. Bazzite and Ubuntu Studio are not
generated — they are committed as downloaded.

