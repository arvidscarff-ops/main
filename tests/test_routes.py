"""Check the published entry points and every local resource they link to."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import unittest

ROOT = Path(__file__).resolve().parents[1]

class Links(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.urls = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ('href', 'src', 'poster') and value:
                self.urls.append(value)

class RoutesTest(unittest.TestCase):
    def test_all_reachable_local_routes_and_assets_exist(self):
        queue = [ROOT / 'index.html']
        visited = set()
        while queue:
            source = queue.pop()
            if source in visited:
                continue
            visited.add(source)
            for raw in Links(source.read_text()).urls:
                url = urlsplit(raw)
                if url.scheme or url.netloc or not url.path:
                    continue
                destination = (source.parent / unquote(url.path)).resolve()
                if destination.is_dir():
                    destination /= 'index.html'
                with self.subTest(source=source.relative_to(ROOT), link=raw):
                    self.assertTrue(destination.is_file(), f'Missing local target: {destination}')
                if destination.suffix == '.html' and destination.is_file():
                    queue.append(destination)
        self.assertTrue({ROOT / section / 'index.html' for section in ('work', 'design', 'about', 'contact', 'ai-labs')}.issubset(visited))

if __name__ == '__main__':
    unittest.main()
