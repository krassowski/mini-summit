#!/usr/bin/env python3
"""Build the inline SVG sprite used by slides/index.html.

Usage: python3 tools/make_sprite.py

Reads Lucide icons from slides/assets/icons/lucide/ (fetched with gh, ISC
licence) and selected JupyterLab icons from ~/jupyterlab (BSD-3-Clause), and
writes slides/assets/icons/sprite.svg. It also replaces the block between
<!-- sprite:start --> and <!-- sprite:end --> in slides/index.html, so the
deck keeps working from file:// without a build step.

Use an icon in the deck with:
  <svg class="i"><use href="#i-flask-conical"/></svg>   (Lucide, stroke)
  <svg class="jp"><use href="#jp-notebook"/></svg>      (JupyterLab, fill)
"""

import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
LUCIDE = ROOT / "slides/assets/icons/lucide"
JLAB = pathlib.Path.home() / "jupyterlab/packages/ui-components/style/icons"
OUT = ROOT / "slides/assets/icons/sprite.svg"
INDEX = ROOT / "slides/index.html"

# name in the deck -> path below JLAB
JLAB_ICONS = {
    "jupyter": "jupyter/jupyter-favicon.svg",
    "jupyter-full": "jupyter/jupyter.svg",
    "folder": "filetype/folder.svg",
    "file": "filetype/file.svg",
    "notebook": "filetype/notebook.svg",
    "python": "filetype/python.svg",
    "markdown": "filetype/markdown.svg",
    "json": "filetype/json.svg",
    "spreadsheet": "filetype/spreadsheet.svg",
    "console": "filetype/console.svg",
    "settings": "filetype/settings.svg",
    "launcher": "filetype/launcher.svg",
    "keyboard": "filetype/keyboard.svg",
    "text-editor": "filetype/text-editor.svg",
    "running": "sidebar/running.svg",
    "toc": "sidebar/toc.svg",
    "extension": "sidebar/extension.svg",
    "property-inspector": "sidebar/build.svg",
    "tab": "sidebar/tab.svg",
    "bug": "toolbar/bug.svg",
    "bug-dot": "toolbar/bug-dot.svg",
    "add": "toolbar/add.svg",
    "new-folder": "toolbar/new-folder.svg",
    "file-upload": "toolbar/file-upload.svg",
    "refresh": "toolbar/refresh.svg",
    "filter-list": "toolbar/filter-list.svg",
    "filter": "search/filter.svg",
    "save": "toolbar/save.svg",
    "cut": "toolbar/cut.svg",
    "copy": "toolbar/copy.svg",
    "paste": "toolbar/paste.svg",
    "run": "toolbar/run.svg",
    "stop": "toolbar/stop.svg",
    "fast-forward": "toolbar/fast-forward.svg",
    "duplicate": "toolbar/duplicate.svg",
    "move-up": "toolbar/move-up.svg",
    "move-down": "toolbar/move-down.svg",
    "add-above": "toolbar/add-above.svg",
    "add-below": "toolbar/add-below.svg",
    "delete": "toolbar/delete.svg",
    "undo": "toolbar/undo.svg",
    "redo": "toolbar/redo.svg",
    "numbering": "toolbar/numbering.svg",
    "collapse-all": "toolbar/collapse-all.svg",
    "ellipses": "toolbar/ellipses.svg",
    "close": "toolbar/close.svg",
    "circle-empty": "toolbar/circle-empty.svg",
    "circle": "toolbar/circle.svg",
    "search": "toolbar/search.svg",
    "launch": "toolbar/launch.svg",
    "kernel": "statusbar/kernel.svg",
    "bell": "statusbar/bell.svg",
    "terminal": "statusbar/terminal.svg",
    "caret-down": "arrow/caret-down.svg",
    "caret-right": "arrow/caret-right.svg",
    "caret-up": "arrow/caret-up.svg",
    "step-into": "debugger/step-into.svg",
    "step-over": "debugger/step-over.svg",
    "step-out": "debugger/step-out.svg",
    "pause": "debugger/pause.svg",
    "variable": "debugger/variable.svg",
    "open-kernel-source": "debugger/open-kernel-source.svg",
}

GREYS = ("#616161", "#616161ff", "#757575", "#424242")


def parse(svg_text):
    m = re.search(r"<svg\b([^>]*)>(.*)</svg>", svg_text, re.S)
    attrs, inner = m.group(1), m.group(2)
    vb = re.search(r'viewBox="([^"]+)"', attrs)
    if vb:
        viewbox = vb.group(1)
    else:
        w = re.search(r'width="([\d.]+)"', attrs).group(1)
        h = re.search(r'height="([\d.]+)"', attrs).group(1)
        viewbox = f"0 0 {w} {h}"
    inner = re.sub(r"<!--.*?-->", "", inner, flags=re.S)
    inner = re.sub(r"\s+", " ", inner).strip()
    return viewbox, inner


def jlab_symbol(name, rel):
    viewbox, inner = parse((JLAB / rel).read_text())
    # Grey interface icons follow the text colour; brand colours stay.
    for grey in GREYS:
        inner = inner.replace(f'fill="{grey}"', 'fill="currentColor"')
    inner = re.sub(r'\sclass="[^"]*"', "", inner)
    return f'<symbol id="jp-{name}" viewBox="{viewbox}">{inner}</symbol>'


def lucide_symbol(path):
    viewbox, inner = parse(path.read_text())
    return f'<symbol id="i-{path.stem}" viewBox="{viewbox}">{inner}</symbol>'


def main():
    symbols = [lucide_symbol(p) for p in sorted(LUCIDE.glob("*.svg"))]
    symbols += [jlab_symbol(n, r) for n, r in JLAB_ICONS.items()]
    sprite = (
        '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">\n'
        + "\n".join(symbols)
        + "\n</svg>"
    )
    OUT.write_text(sprite + "\n")
    html = INDEX.read_text()
    new, n = re.subn(
        r"(<!-- sprite:start -->).*?(<!-- sprite:end -->)",
        lambda m: m.group(1) + "\n" + sprite + "\n" + m.group(2),
        html,
        flags=re.S,
    )
    if n != 1:
        raise SystemExit("sprite markers not found in slides/index.html")
    INDEX.write_text(new)
    print(f"{len(symbols)} symbols, {len(sprite) // 1024} KB")


if __name__ == "__main__":
    main()
