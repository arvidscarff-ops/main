# Arvid Shane Scarff — portfolio

Dependency-free static site for GitHub Pages. Serve over HTTP: the homepage uses JavaScript modules. No runtime build or framework is required.

## Local preview

```sh
python3 -m http.server 5190 --bind 127.0.0.1
```

Open http://127.0.0.1:5190/. All site URLs are relative and support GitHub Pages' `/main/` prefix. GitHub Pages publishes the repository root from `main` to https://arvidscarff-ops.github.io/main/. Local edits do not publish until merged to `main`; publication of the eagle/star navigation was separately approved.

## Navigation and content

- `index.html` — eagle and six orbiting stars. The eagle's eye retains the seventh star. First activation opens the two-row navigation; subsequent star activation follows its section. Eagle or Escape closes it. Back and section Index links restore the open menu.
- `work/` — Weekender only, described as in development, with no invented results or performance claims.
- `approach/` — clearly labelled editorial draft, awaiting the author's approval.
- `design/` — earlier graphic-design index, linking the five preserved collections at their original URLs.
- `about/` — concise profile, distinct from Approach.
- `contact/` — existing contact details and copy interaction.
- `redacted/` — cosmetic keypad and empty room. **Not authentication.** Everything in this static repository is public; never put sensitive material behind this interaction.

Original archive URLs under `work/graphic-design/` remain valid. Older Lab and sample case-study routes are retained for compatibility but not promoted in the six-section menu.

## Homepage implementation

- `assets/js/home.js` — requestAnimationFrame orbit and reversible, position-preserving opening/closing transitions. Pauses animation while hidden. No animation library.
- `assets/css/orbit.css` — responsive menu sizing, hover/press feedback, and usable no-JavaScript fallback.
- `assets/icons/eagle.webp`, `orbit-star.webp` — tightly cropped, transparent, resized derivatives of the supplied artwork.
- `assets/css/sections.css` — Index/Sections navigation, Work, draft Approach and keypad layouts.
- `assets/js/keypad.js` — public, decorative gate; digits, erase, Enter and Escape support.
- `assets/js/site.js` — themes, optional sound, clipboard and calm page transitions.

The landscape uses the existing `camera-01` video/poster, not the old three-feed cutting/tracking system. Replace its matching desktop/mobile MP4 and poster in `assets/media/home/` to change the scene. Old `home-config.js` and tracking assets are retained but not imported by the new homepage.

Reduced-motion preferences suppress video loading and continuous orbit movement, and make the menu settle immediately. A separate Pause motion button freezes both the landscape and orbit. Sound is optional and off by default. Browser-storage failures do not block navigation.

## Design archive

Five original collections: TEXTUR, Event & Festival Social Media Design, Social Media Motion Graphics, Logofolio, and Karnevalen Brand Bible. Blandat remains excluded.

- `assets/css/archive.css` retains archive layout and typography.
- `assets/media/graphic-design/` retains the gallery images, cover images and H.264/AAC MP4s with posters. No runtime Squarespace dependency.
- Manifests retain source URLs, order, dimensions and checksums. Original image backups and authenticated export data remain outside this public repository.
- Videos are on demand, initially muted, with native playback/audio/fullscreen controls. Images link to full-size web copies.

## Checks

With the preview server running:

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
node --test tests/test_navigation.mjs
```

Browser checks use Playwright/Chromium as external **test tooling only**; the site has no dependency on it. If Playwright is not resolvable in your environment, install it in a separate tooling directory, install its Chromium browser, then set `PLAYWRIGHT_PATH` to that installation's `node_modules/playwright/index.js`.

```sh
PLAYWRIGHT_PATH=/absolute/path/to/playwright/index.js \
EVIDENCE_DIR=/tmp/portfolio-orbit-evidence \
node --test tests/*.mjs
```

`TEST_URL` optionally overrides `http://127.0.0.1:5190/`. Coverage includes opening from a star or eagle, animation continuity, reversal, pause, return navigation, keyboard/touch, reduced motion, no-JavaScript links, blocked storage, keypad failure/success, all six destinations at four viewport sizes, local asset/link integrity, archive regressions and `/main/`-prefixed routing. Browser coverage is Chromium; it does not claim Safari/WebKit or physical-device validation.

The initial 2026-09-17 local verification passed all 17 Node tests (including browser checks), all 5 Python tests, and `git diff --check`. Desktop and mobile screenshots were visually inspected. That preview review did not publish changes; publishing was approved separately afterward.
