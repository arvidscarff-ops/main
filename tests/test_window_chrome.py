"""Static close affordance is present without JavaScript on every window route."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]

class WindowChrome(unittest.TestCase):
    def test_static_left_close_only(self):
        pages = [p for p in ROOT.rglob('*.html') if '.git' not in p.parts and 'class="window-bar"' in p.read_text()]
        self.assertTrue(pages)
        for page in pages:
            text = page.read_text()
            with self.subTest(page=str(page.relative_to(ROOT))):
                self.assertNotRegex(text, r'class="window-close"')
                bar = re.search(r'<header class="window-bar".*?</header>', text, re.S).group()
                self.assertEqual(bar.count('data-window-close'), 1)
                self.assertRegex(text, r'class="window-orientation">\s*<span class="window-dots">\s*<a class="window-dot window-dot--close"[^>]+data-window-close')
                self.assertIn('aria-label="Close window and return to index"', text)
                self.assertNotIn('window-dot--zoom', text)

if __name__ == '__main__':
    unittest.main()
