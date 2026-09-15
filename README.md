# Arvid Shane Scarff — portfolio shell

Dependency-free static portfolio for GitHub Pages. Open it through a local web server rather than by double-clicking `index.html`, because the homepage uses JavaScript modules and video assets.

## Content map

- `index.html` — fullscreen homepage composition
- `work/` — editorial work index and work case-study routes
- `lab/` — experiment index and lab case-study routes
- `about/` — biography shell
- `contact/` — email and copy interaction
- `assets/css/site.css` — design tokens, frame, themes, bloom, layout, motion
- `assets/js/projects.js` — all placeholder Work and Lab project data
- `assets/js/home-config.js` — homepage feeds, cut timing, tear, and tracking controls
- `assets/js/tracking.js` — replaceable procedural tracking source and renderer

## Replace the homepage films

The three browser-ready feeds are in `assets/media/home/`. Replace matching desktop, mobile, and poster files while retaining their filenames, or update the three entries in `assets/js/home-config.js`.

Recommended exports:

- desktop: H.264 MP4, 1920×1080, muted, web optimized
- mobile: H.264 MP4, 960×540 or similar, muted, web optimized
- poster: optimized JPEG with the same crop as the film

## Art direction controls

- Cut timing: `cutInterval.min` and `cutInterval.max` in `assets/js/home-config.js`
- Tear: the `tear` object in `assets/js/home-config.js`
- Tracking frequency and strength: the `tracking` object in `assets/js/home-config.js`
- Bloom, frame, typography, motion, and color: tokens at the top of `assets/css/site.css`

## Add or edit projects

Edit `assets/js/projects.js`. Each item has a `type` of `work` or `lab`. Add a matching directory with an `index.html` based on an existing case-study route, then update its `data-type` and `data-slug` values. The reusable renderer in `assets/js/case-study.js` builds the editorial modules.

## Earlier graphic-design archive

`work/graphic-design/` is a separate archive of earlier graphic-design work, linked from Work without mixing it into the marketing-facing project data. Its five static galleries retain the Squarespace artwork and copy: TEXTUR, Event & Festival Social Media Design, Social Media Motion Graphics, Logofolio, and Karnevalen Brand Bible. Blandat is intentionally excluded.

- `assets/css/archive.css` extends the existing theme tokens, typography and frame.
- `assets/media/graphic-design/` contains 41 gallery images, five cover images, and nine H.264/AAC MP4s with posters. No runtime Squarespace dependency.
- Image and motion manifests preserve source URLs, order, dimensions and checksums. Original image backups and temporary authenticated export data are kept outside this public repository.
- Videos are on demand, initially muted, with native playback/audio/fullscreen controls. Images link to their full-size web copies.
- Contact now uses the email retained from the source portfolio.

Run regression checks with `python3 -m unittest discover -s tests -v` and `node --test tests/test_navigation.mjs`. Serve locally with `python3 -m http.server 8000`, then test Work → Graphic Design, all galleries, full-size image → Back, themes, mobile layouts, and video playback. GitHub Pages publishes the root of `main`.

## Remaining shell content

The existing primary Work/Lab placeholders and biography shell are unchanged. Replace those with marketing-focused content and update their metadata/social preview images as that work is ready.
