"""Coursework integration: publication allowlist and reachable artifacts."""
from pathlib import Path
from html.parser import HTMLParser
import unittest

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / 'work/growth-toolbox'

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.links, self.ids, self.items = [], set(), 0
        self.feed(path.read_text())
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs: self.ids.add(attrs['id'])
        if 'data-work-item' in attrs: self.items += 1
        if tag == 'a': self.links.append(attrs)

class CourseworkTest(unittest.TestCase):
    def test_work_opens_coursework_alongside_weekender(self):
        page = Page(ROOT / 'work/index.html')
        self.assertTrue(any(a.get('href') == 'growth-toolbox/' for a in page.links), 'Work needs a coursework entry')
        self.assertEqual(page.items, 7)
        self.assertTrue(any(a.get('href') == 'https://weekender.arvidscarff.workers.dev' for a in page.links))
        self.assertTrue((COURSE / 'index.html').is_file(), 'Coursework destination must exist')

    def test_coursework_links_reach_all_allowed_artifacts(self):
        from urllib.parse import urlsplit, unquote
        page = Page(COURSE / 'index.html')
        self.assertTrue({'investigation', 'content', 'scraping', 'mashup', 'evidence'}.issubset(page.ids))
        for link in page.links:
            url = urlsplit(link.get('href', ''))
            if url.scheme or url.netloc or not url.path: continue
            destination = (COURSE / unquote(url.path)).resolve()
            if destination.is_dir(): destination /= 'index.html'
            self.assertTrue(destination.is_file(), f'Missing coursework artifact: {url.path}')
        text = (COURSE / 'index.html').read_text()
        self.assertNotIn('company/contact dataset is not published', text)
        self.assertIn('122 distinct identifier strings', text)
        self.assertIn('121 unmasked', text)
        self.assertIn('one partly masked', text)
        self.assertNotIn('122 unique organisation numbers', text)
        for href in ['../../scraping/foretag.txt', '../../scraping/scraper.txt',
                     'files/scraping/LAS-MIG.txt', 'files/scraping/scraper.js']:
            self.assertTrue(any(a.get('href') == href and 'download' in a for a in page.links), href)
        # Only this explicitly approved data export is public, at this exact path.
        exports = {p.relative_to(ROOT).as_posix() for p in ROOT.rglob('foretag.*')
                   if not {'.git', '.hermes'}.intersection(p.relative_to(ROOT).parts)}
        self.assertEqual(exports, {'scraping/foretag.txt'})
        for folder in [COURSE / 'files/scraping', ROOT / 'scraping']:
            for pattern in ['*.csv', '*.zip', 'package*.json']:
                self.assertFalse(list(folder.rglob(pattern)), f'Unapproved scraping artifact: {pattern}')
        self.assertFalse(list(COURSE.rglob('inlamning-scraping.zip')))

    def test_approved_scraping_txt_publication_preserves_bytes(self):
        import csv
        import hashlib
        import io
        import re
        expected = {
            'foretag.txt': (10559, '68f614b9236c90aef214de49356cd2aae29b13d82219481e2e7ef173458f0c51'),
            'scraper.txt': (4955, 'a6754835c3736182e88b958e36a162ca57d4cd40337e2479235ba55cdf6f7837'),
        }
        folder = ROOT / 'scraping'
        self.assertTrue(folder.is_dir(), 'Approved TXT publication is missing')
        self.assertEqual({p.name for p in folder.iterdir()}, set(expected), 'Only the two approved TXT files belong here')
        for name, (size, digest) in expected.items():
            data = (folder / name).read_bytes()
            self.assertEqual(len(data), size, name)
            self.assertEqual(hashlib.sha256(data).hexdigest(), digest, name)
        self.assertTrue((folder / 'scraper.txt').read_bytes() ==
                        (COURSE / 'files/scraping/scraper.js').read_bytes(), 'TXT must contain the actual unchanged code')
        rows = list(csv.reader(io.StringIO((folder / 'foretag.txt').read_text(encoding='utf-8')), delimiter='\t', strict=True))
        self.assertEqual(rows[0], ['name', 'orgnr', 'phone', 'address'])
        records = rows[1:]
        self.assertEqual(len(records), 125)
        self.assertTrue(all(len(row) == 4 for row in records))
        identifiers = {row[1] for row in records}
        self.assertEqual(len(identifiers), 122)
        self.assertEqual(sum(bool(re.fullmatch(r'\d{6}-\d{4}', value)) for value in identifiers), 121)
        self.assertEqual(sum(bool(re.fullmatch(r'\d{6}-X{4}', value)) for value in identifiers), 1)
        self.assertEqual(len(records) - len({tuple(row) for row in records}), 3)
        self.assertEqual(sum(not row[2] for row in records), 22)
        self.assertEqual(sum(not row[3] for row in records), 7)

    def test_weekender_is_embedded_on_the_portfolio(self):
        page = COURSE / 'weekender/index.html'
        self.assertTrue(page.is_file(), 'Portfolio API embed route is missing')
        html = page.read_text()
        self.assertIn('title="Weekender live API app"', html)
        self.assertIn('src="https://weekender.arvidscarff.workers.dev"', html)
        self.assertIn('href="../#mashup"', html)
        self.assertIn('href="https://weekender.arvidscarff.workers.dev"', html)
        self.assertIn('width:100%', html)
        hub = Page(COURSE / 'index.html')
        self.assertTrue(any(a.get('href') == 'weekender/' for a in hub.links))

    def test_public_copy_has_no_internal_handoff_notes(self):
        pages = [ROOT / 'work/index.html', COURSE / 'index.html']
        pages += [COURSE / slug / 'index.html' for slug in ['content-plan', 'article', 'content-examples']]
        pages += list((COURSE / 'files/content').glob('*.md'))
        pages += [COURSE / 'files/scraping/LAS-MIG.txt']
        banned = ['prepared locally', 'teacher confirmation', 'publication approval',
                  'currently local', 'not completed by this package',
                  'not a teacher-set deadline', 'automated checks as reader feedback',
                  'requirement-to-artifact map', 'assignment fit and current status',
                  'lärarens besked', 'nästa lektion', 'vid paketeringen', 'npm ci',
                  'assignment scope', 'no completed reader test is claimed here',
                  'the plan therefore explains', 'material suggests checking whether',
                  'for the final hand-in, jesper']
        for page in pages:
            text = page.read_text().lower()
            for phrase in banned:
                self.assertNotIn(phrase, text, f'{phrase}: {page}')
        # Removing status notes must not erase evidential limitations or label samples as results.
        article = (COURSE / 'article/index.html').read_text()
        self.assertIn('The questions, populations and demands differ', article)
        self.assertIn('Sample journalist email', (COURSE / 'content-examples/index.html').read_text())

    def test_downloaded_article_links_resolve_in_published_bundle(self):
        import re
        from urllib.parse import urlsplit
        article = COURSE / 'files/content/article.md'
        for href in re.findall(r'\]\(([^)]+)\)', article.read_text()):
            url = urlsplit(href)
            if url.netloc and url.netloc != 'arvidscarff-ops.github.io': continue
            if url.netloc:
                self.assertTrue(url.path.startswith('/main/'))
                target = ROOT / url.path.removeprefix('/main/')
            else:
                target = (article.parent / url.path).resolve()
            if target.is_dir(): target /= 'index.html'
            self.assertTrue(target.is_file(), href)

if __name__ == '__main__':
    unittest.main()
