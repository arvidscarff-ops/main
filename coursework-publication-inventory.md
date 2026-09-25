# Growth Toolbox — publication inventory

The bundle includes the coursework hub, three reading pages, the interactive investigation and archive, source data, content downloads, and scraper support files.

The public content plan, sample outreach and PDF are portfolio editions. The investigation data and article retain their methodological limitations. Original coursework is retained separately. The approved unchanged company TXT and actual scraper code TXT are included under `/scraping`; company CSV, submission ZIPs, dependency packages, teacher briefs and private notes remain excluded. Weekender is embedded at `work/growth-toolbox/weekender/` with a direct-app fallback; Worker code is unchanged.

## Files

42 files, 4,933,879 bytes.

| File | Bytes |
|---|---:|
| `scraping/foretag.txt` | 10,559 |
| `scraping/scraper.txt` | 4,955 |
| `work/growth-toolbox/above-the-law/archive/assets/campaigns.csv` | 25,045 |
| `work/growth-toolbox/above-the-law/archive/assets/data.js` | 147,339 |
| `work/growth-toolbox/above-the-law/archive/assets/observations.csv` | 128,689 |
| `work/growth-toolbox/above-the-law/archive/assets/provenance.json` | 2,245 |
| `work/growth-toolbox/above-the-law/archive/assets/story.css` | 14,174 |
| `work/growth-toolbox/above-the-law/archive/assets/story.js` | 20,253 |
| `work/growth-toolbox/above-the-law/archive/assets/vendor/CHART-JS-LICENSE.md` | 1,093 |
| `work/growth-toolbox/above-the-law/archive/assets/vendor/chart.umd.min.js` | 208,522 |
| `work/growth-toolbox/above-the-law/archive/index.html` | 23,022 |
| `work/growth-toolbox/above-the-law/assets/favicon.svg` | 206 |
| `work/growth-toolbox/above-the-law/assets/investigation.css` | 20,860 |
| `work/growth-toolbox/above-the-law/assets/investigation.js` | 3,149 |
| `work/growth-toolbox/above-the-law/assets/opinion-comparison.css` | 5,560 |
| `work/growth-toolbox/above-the-law/assets/poll-data.js` | 3,019 |
| `work/growth-toolbox/above-the-law/data/accountability.json` | 2,400 |
| `work/growth-toolbox/above-the-law/data/actions.json` | 832 |
| `work/growth-toolbox/above-the-law/data/opinion-comparison.csv` | 8,451 |
| `work/growth-toolbox/above-the-law/data/opinion-comparison.json` | 15,874 |
| `work/growth-toolbox/above-the-law/data/opinion-provenance.json` | 3,304 |
| `work/growth-toolbox/above-the-law/data/poll.csv` | 4,780 |
| `work/growth-toolbox/above-the-law/data/protest-coding.csv` | 290,587 |
| `work/growth-toolbox/above-the-law/data/protest-events.csv` | 3,569,673 |
| `work/growth-toolbox/above-the-law/data/protest-provenance.json` | 1,227 |
| `work/growth-toolbox/above-the-law/data/protests.json` | 2,417 |
| `work/growth-toolbox/above-the-law/data/sources.json` | 4,376 |
| `work/growth-toolbox/above-the-law/index.html` | 50,024 |
| `work/growth-toolbox/above-the-law/scripts/compile_protests.py` | 4,596 |
| `work/growth-toolbox/article/index.html` | 10,475 |
| `work/growth-toolbox/content-examples/index.html` | 5,673 |
| `work/growth-toolbox/content-plan/index.html` | 7,324 |
| `work/growth-toolbox/files/content/above-the-law-content-package.pdf` | 183,888 |
| `work/growth-toolbox/files/content/article.md` | 6,891 |
| `work/growth-toolbox/files/content/content-examples.md` | 2,455 |
| `work/growth-toolbox/files/content/content-plan.md` | 3,984 |
| `work/growth-toolbox/files/content/social-chart.pdf` | 2,744 |
| `work/growth-toolbox/files/content/social-chart.png` | 115,287 |
| `work/growth-toolbox/files/scraping/LAS-MIG.txt` | 2,089 |
| `work/growth-toolbox/files/scraping/scraper.js` | 4,955 |
| `work/growth-toolbox/index.html` | 8,324 |
| `work/growth-toolbox/weekender/index.html` | 2,559 |

## TXT publication integrity — 25 September 2026

- `foretag.txt`: SHA-256 `68f614b9236c90aef214de49356cd2aae29b13d82219481e2e7ef173458f0c51`.
- `scraper.txt`: SHA-256 `a6754835c3736182e88b958e36a162ca57d4cd40337e2479235ba55cdf6f7837`; byte-identical to the original JS and retained public JS download.
- 125 rows; 122 distinct identifier strings (121 unmasked and one partly masked), not 122 verified organisations; three extra exact duplicates, 22 missing phones, seven missing addresses. Nothing normalized or repaired.
- Hub download paths use `../../scraping/` to retain the `/main/` hosting prefix.

## Earlier bundle verification (historical)

- 26 Node/browser tests and 9 Python tests pass.
- Root and `/main/` hosting: navigation, chart controls, 27 download activations per mode, and exact file-byte checks.
- Same-tab Weekender links and Back navigation verified from both Work pages.
- Responsive coursework layouts at 320px, 390px and 1440px; keyboard and no-JavaScript reading.
- Browser automation uses Chromium.
