#!/usr/bin/env python3
"""Inline every asset of the deck into one HTML file: slides/dist/talk.html.

Usage: python3 slides/build.py

The result needs no other file and no network, so it can travel on a USB
stick or by email. Fonts and images become data: URIs; CSS and scripts are
inlined. Edit slides/index.html and slides/assets/, then run this again.
"""

import base64
import mimetypes
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "index.html"
OUT = HERE / "dist" / "talk.html"

MIME = {".ttf": "font/ttf", ".woff2": "font/woff2", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml"}


def data_uri(path):
    mime = MIME.get(path.suffix) or mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def inline_css(path):
    css = path.read_text()
    return re.sub(
        r"url\('([^')]+)'\)",
        lambda m: f"url('{data_uri(path.parent / m.group(1))}')",
        css,
    )


def main():
    html = SRC.read_text()
    html = re.sub(
        r'<link rel="stylesheet" href="([^"]+)">',
        lambda m: "<style>\n" + inline_css(HERE / m.group(1)) + "\n</style>",
        html,
    )
    html = re.sub(
        r'<script src="([^"]+)"></script>',
        lambda m: "<script>\n" + (HERE / m.group(1)).read_text().replace("</script", "<\\/script") + "\n</script>",
        html,
    )
    html = re.sub(
        r'<img([^>]*?) src="(assets/[^"]+)"',
        lambda m: f'<img{m.group(1)} src="{data_uri(HERE / m.group(2))}"',
        html,
    )
    leftovers = re.findall(r'(?:src|href)="assets/[^"]+"', html)
    if leftovers:
        raise SystemExit(f"not inlined: {leftovers}")
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html)
    print(f"{OUT} {OUT.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
