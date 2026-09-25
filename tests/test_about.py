"""The About page preserves the owner's approved copy and local portrait."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
PARAGRAPHS = [
    "I started my first company at 18. What hooked me wasn’t any one business idea. It was the strange process of taking something that existed only in my head, working through everything needed to make it real, and then finding a way for other people to care about it too.",
    "I’ve followed that curiosity through a lot of experiments: a clothing brand, dropshipping, crypto, print on demand, freelance design and art direction, and organising raves. Some lasted longer than others. Each taught me something about making things, getting them in front of people, and finding out whether the idea survives contact with reality.",
    "Over the past two years, most of my attention has moved to AI. I don’t know exactly what role language models will play in the future, but I’m convinced they’ll change who can build things and how quickly. For me, they’re already the most useful tools I’ve found for turning an idea into something I can test. I follow new developments closely, try the tools myself, and build software to solve problems I run into. I’m beginning to explore which of those solutions could be useful beyond my own work.",
    "I’m studying growth marketing at Berghs because I want to get better at the part that comes after making something: understanding who it’s for, reaching them, and learning from what happens. My aim is to use those skills to build my own projects and companies, ideally with people who are just as curious about the work.",
]


class AboutParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paragraphs = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        if tag == 'p':
            self.current = []

    def handle_data(self, data):
        if self.current is not None:
            self.current.append(data)

    def handle_endtag(self, tag):
        if tag == 'p' and self.current is not None:
            self.paragraphs.append(''.join(self.current))
            self.current = None


class AboutTests(unittest.TestCase):
    def test_approved_story_replaces_previous_copy_verbatim(self):
        source = (ROOT / 'about/index.html').read_text()
        parser = AboutParser()
        parser.feed(source)
        self.assertEqual(parser.paragraphs[1:], PARAGRAPHS)
        self.assertNotIn('How I work', source)
        self.assertNotIn('I started in graphic design', source)


if __name__ == '__main__':
    unittest.main()
