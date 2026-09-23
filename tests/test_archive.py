from pathlib import Path
from html.parser import HTMLParser
import unittest
ROOT=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self,path):
        super().__init__(); self.tags=[]; self.text=[]; self.feed(path.read_text())
    def handle_starttag(self,tag,attrs): self.tags.append((tag,dict(attrs)))
    def handle_data(self,data): self.text.append(data)
class ArchiveTests(unittest.TestCase):
    def test_design_archive_remains_separate_from_work_window(self):
        work=Page(ROOT/'work/index.html')
        links=[a['href'] for t,a in work.tags if t=='a' and 'href' in a]
        self.assertNotIn('../design/',links)
        self.assertIn('../#navigation',links)
        archive=ROOT/'work/graphic-design/index.html'
        self.assertTrue(archive.exists(),'Archive landing must exist')
        page=Page(archive)
        self.assertIn('Earlier work',' '.join(page.text))
        copy=' '.join(page.text).lower()
        self.assertIn('started with one fascination: branding',copy)
        self.assertIn('graphic design was where i began',copy)
    def test_every_collection_has_its_complete_gallery(self):
        expected={'textur':6,'event-festival':3,'motion-graphics':9,'logofolio':8,'karnevalen':24}
        index=Page(ROOT/'work/graphic-design/index.html')
        links=[a.get('href') for t,a in index.tags if t=='a']
        for slug,count in expected.items():
            with self.subTest(collection=slug):
                self.assertIn(slug+'/',links)
                path=ROOT/'work/graphic-design'/slug/'index.html'
                self.assertTrue(path.exists(),f'Missing {slug}')
                page=Page(path)
                media=[(t,a) for t,a in page.tags if t==('video' if slug=='motion-graphics' else 'img')]
                self.assertEqual(len(media),count)
                for tag,attrs in media:
                    self.assertNotIn('squarespace',attrs['src'])
                    self.assertTrue((path.parent/attrs['src']).resolve().is_file())
                    if tag=='video':
                        self.assertIn('controls',attrs)
                        self.assertNotIn('autoplay',attrs)
                        self.assertEqual(attrs['preload'],'none')
                        self.assertTrue((path.parent/attrs['poster']).resolve().is_file())
                    else:
                        self.assertTrue(attrs.get('alt'))
                        self.assertTrue(attrs.get('width'))
                        self.assertTrue(attrs.get('height'))
                self.assertNotIn('Blandat',' '.join(page.text))
    def test_project_shell_is_complete(self):
        for slug in ['textur','event-festival','motion-graphics','logofolio','karnevalen']:
            with self.subTest(project=slug):
                p=ROOT/'work/graphic-design'/slug/'index.html'
                self.assertTrue(p.exists()); s=p.read_text()
                self.assertIn('src="../../../assets/js/site.js"',s)
                self.assertIn('class="window-bar" data-window-level="project"',s)
                self.assertIn('data-window-parent href="../../../design/"',s)
                self.assertIn('data-window-close href="../../../#navigation"',s)
                self.assertNotIn('section-menu',s)
                self.assertNotIn('Project One',s)
                self.assertIn('https://arvidscarff-ops.github.io/main/work/graphic-design/'+slug+'/',s)
    def test_source_contact_replaces_placeholder(self):
        s=(ROOT/'contact/index.html').read_text()
        self.assertIn('href="mailto:arvidscarff@gmail.com"',s)
        self.assertIn('data-copy-email="arvidscarff@gmail.com"',s)
        self.assertNotIn('your@email.com',s)
        self.assertNotIn('Replace the placeholder',s)
if __name__=='__main__': unittest.main()
