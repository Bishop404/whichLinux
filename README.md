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
