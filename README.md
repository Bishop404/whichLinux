# Which Linux?

An interactive questionnaire that recommends a Linux distribution **and the
edition to download** to people who are new to Linux and overwhelmed by the
choice.

Static site, no backend. Vanilla TypeScript + Vite

## Running it

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # engine, i18n, URL state, and a full DOM walkthrough
npm run build      # -> dist/
npm run preview
npm run logos      # regenerate the Simple Icons logo files
npm run coverage   # sweep every answer set: who wins, and where the fit is weak
npm run wins mint  # show exactly which answers lead to one distro
npm run influence  # how often each question actually changes the answer
```

Deploy by uploading the contents of `dist/` to any static host. `.htaccess`
covers compression and cache headers if that host is Apache.

## How the recommendation works

Two separate mechanisms, kept deliberately apart:

- **Hard filters** knock candidates out — architecture, device class, memory,
  and how much terminal the user is willing to accept. If they would leave
  nothing, they are relaxed one at a time (weakest claim first; architecture is
  never given up) and the result is labelled a closest match.
- **Soft weights** rank whatever survives. Each answer contributes a two-sided
  lookup over distro attributes, so every weight that fires produces either a
  tick or a caveat the result page can show.

A candidate is a `(distro, edition)` pair, because "Fedora" is only half an
answer — beginners get stuck choosing between five spins.

## Editing the data

Everything the engine knows lives in three files, and none of them contains
prose:

| File | Holds |
| --- | --- |
| `src/data/distros.json` | One record per distribution, plus its editions |
| `src/data/desktops.json` | One record per desktop environment |
| `src/data/questions.json` | Question order, visibility, filters and weights |

**Adding a distribution** is one record in `distros.json`, one logo in
`public/logos/`, and a `distro.<id>.name` / `distro.<id>.tagline` pair in every
locale. No answer lists to update.

The test suite enforces that every distribution can actually win something —
a record no answer can ever surface is a bug, and `npm test` will name it.
`npm run coverage` goes further and reports how often each one wins across all
76,860 reachable answer sets, plus which answers get a poor best-match. Run it
after changing weights: a distro that drops to near-zero has usually been
squeezed out by a neighbour rather than genuinely beaten. It prints
`NEVER WINS` rather than a rounded `0.0%`, because a distro winning 36 times out
of 76,860 and one winning never are very different problems.

`npm run wins <id>` explains a single distro: it lists which answers are constant
across every set that distro wins, which is how you check that a deliberately
gated option is gated on what you intended.

## Adding a language

1. Copy `src/i18n/locales/en.json` to `src/i18n/locales/<code>.json` and
   translate the values. Keys are never translated.
2. Add the code to `LOCALES` and `LOCALE_NAMES` in `src/i18n/index.ts`, and a
   loader entry beside them.

`npm test` fails if a locale is missing keys, has extra ones, leaves a string
blank, or drops a `{placeholder}`. English backs every other language, so a
partial translation still renders.

Language is chosen by `?lang=`, then a remembered choice, then the browser.

## Things to know before this goes live

- **Distro facts go stale.** Each record carries `lastReviewed`, and the result
  page shows it. Re-check the dataset periodically; minimum memory, release
  models and NVIDIA handling all drift.
