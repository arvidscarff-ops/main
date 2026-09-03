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

## Before publishing

Replace `your@email.com` in `contact/index.html`, add real biography/project content, and update per-project metadata and social preview images.
