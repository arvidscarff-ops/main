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
        self.assertEqual(page.items, 2)
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
        self.assertIn('company/contact dataset is not published', (COURSE / 'index.html').read_text())
        for name in ['foretag.txt', 'foretag.csv', 'inlamning-scraping.zip']:
            self.assertFalse(list(COURSE.rglob(name)), f'Private submission leaked: {name}')

    def test_public_copy_has_no_internal_handoff_notes(self):
        pages = [ROOT / 'work/index.html', COURSE / 'index.html']
        pages += [COURSE / slug / 'index.html' for slug in ['content-plan', 'article', 'content-examples']]
        pages += list((COURSE / 'files/content').glob('*.md'))
        pages += [COURSE / 'files/scraping/LAS-MIG.txt']
        banned = ['prepared locally', 'teacher confirmation', 'publication approval',
                  'currently local', 'not completed by this package',
                  'not a teacher-set deadline', 'automated checks as reader feedback',
                  'requirement-to-artifact map', 'assignment fit and current status',
                  'lärarens besked', 'nästa lektion', 'vid paketeringen', 'npm ci']
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
