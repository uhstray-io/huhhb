#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "markdown>=3.7",
#   "pymdown-extensions>=10.11",
#   "pygments>=2.18",
#   "weasyprint>=63",
#   "pyyaml>=6.0",
# ]
# ///
"""
md2pdf.py — convert any Markdown file into a beautiful, print-ready PDF.

Run with uv (recommended — installs deps into an ephemeral env, nothing global):

    uv run md2pdf.py INPUT.md
    uv run md2pdf.py INPUT.md -o out.pdf --title "Q3 Report" --author "Uhstray"

Handles standard Markdown plus GFM tables, task lists, footnotes, definition
lists, strikethrough, fenced code with Pygments syntax highlighting, and
```mermaid diagrams (rendered via mermaid-cli / `npx @mermaid-js/mermaid-cli`).

Styling comes from style.css next to this script (CSS Paged Media: styled cover
page, running header/footer, page numbers). Override with --css.

System note: WeasyPrint needs the Pango/cairo native libs. On macOS:
    brew install pango           (also pulls cairo, gdk-pixbuf, harfbuzz, glib)
On Debian/Ubuntu:
    apt-get install libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0
Mermaid rendering needs Node's npx on PATH (diagrams are skipped with a warning
if it's missing, and the raw mermaid code is kept as a code block instead).
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import html
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path

import markdown
import yaml
from pygments.formatters import HtmlFormatter

MERMAID_BLOCK = re.compile(
    r"^[ \t]*```[ \t]*mermaid[ \t]*\r?\n(.*?)^[ \t]*```[ \t]*$",
    re.DOTALL | re.MULTILINE,
)
FRONT_MATTER = re.compile(r"^---\s*\r?\n(.*?)\r?\n---\s*\r?\n", re.DOTALL)

MD_EXTENSIONS = [
    "extra",              # tables, fenced_code, footnotes, def_list, abbr, attr_list, md_in_html
    "sane_lists",
    "admonition",
    "toc",
    "pymdownx.highlight",
    "pymdownx.superfences",
    "pymdownx.betterem",
    "pymdownx.tasklist",
    "pymdownx.tilde",     # ~~strikethrough~~ and subscript
    "pymdownx.caret",     # ^^insert^^ and superscript
    "pymdownx.smartsymbols",
    "pymdownx.magiclink",
]
MD_EXTENSION_CONFIGS = {
    "pymdownx.highlight": {"use_pygments": True, "pygments_style": "default", "guess_lang": False},
    "pymdownx.tasklist": {"custom_checkbox": True},
    "toc": {"permalink": False, "toc_depth": "2-3"},
}


def extract_front_matter(text: str) -> tuple[dict, str]:
    """Pull a leading --- YAML block (title/subtitle/author/date/footer) if present."""
    m = FRONT_MATTER.match(text)
    if not m:
        return {}, text
    try:
        data = yaml.safe_load(m.group(1)) or {}
        if not isinstance(data, dict):
            return {}, text
    except yaml.YAMLError:
        return {}, text
    return data, text[m.end():]


def render_mermaid(text: str, workdir: Path, fmt: str = "png", scale: int = 3) -> str:
    """Replace each ```mermaid block with a rendered figure. Needs npx on PATH."""
    if not MERMAID_BLOCK.search(text):
        return text
    npx = shutil.which("npx")
    if not npx:
        print("warning: npx not found — mermaid diagrams left as code blocks "
              "(install Node.js to render them)", file=sys.stderr)
        return text

    def replace(match: re.Match) -> str:
        code = match.group(1)
        digest = hashlib.sha1(code.encode()).hexdigest()[:12]
        src = workdir / f"mermaid-{digest}.mmd"
        out = workdir / f"mermaid-{digest}.{fmt}"
        src.write_text(code, encoding="utf-8")
        cmd = [npx, "-y", "@mermaid-js/mermaid-cli", "-i", str(src), "-o", str(out),
               "-b", "transparent"]
        if fmt == "png":
            cmd += ["-s", str(scale)]
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=180)
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
            detail = getattr(exc, "stderr", "") or str(exc)
            print(f"warning: mermaid render failed ({detail.strip()[:200]}) — "
                  "keeping code block", file=sys.stderr)
            return match.group(0)
        data = out.read_bytes()
        mime = "image/png" if fmt == "png" else "image/svg+xml"
        b64 = base64.b64encode(data).decode()
        return f'\n<figure class="mermaid"><img src="data:{mime};base64,{b64}" alt="diagram"></figure>\n'

    return MERMAID_BLOCK.sub(replace, text)


def build_cover(meta: dict) -> str:
    title = html.escape(str(meta.get("title", "")))
    subtitle = html.escape(str(meta.get("subtitle", "")))
    author = html.escape(str(meta.get("author", "")))
    doc_date = html.escape(str(meta.get("date", date.today().isoformat())))
    eyebrow = html.escape(str(meta.get("eyebrow", meta.get("category", "Document"))))
    rows = []
    if author:
        rows.append(f"<div><strong>Author</strong> · {author}</div>")
    rows.append(f"<div><strong>Date</strong> · {doc_date}</div>")
    sub = f'<div class="subtitle">{subtitle}</div>' if subtitle else ""
    return (
        '<section class="cover">'
        f'<div class="eyebrow">{eyebrow}</div>'
        f"<h1>{title}</h1>{sub}"
        f'<div class="meta">{"".join(rows)}</div>'
        "</section>"
    )


def build_html(body: str, css: str, meta: dict, toc: str,
               cover: bool, want_toc: bool) -> str:
    title = html.escape(str(meta.get("title", "")))
    footer = html.escape(str(meta.get("footer", meta.get("author", ""))))
    pyg_css = HtmlFormatter(style=meta.get("pygments_style", "default")).get_style_defs(".highlight")
    parts = [
        "<!DOCTYPE html><html><head><meta charset='utf-8'>",
        f"<style>{css}\n{pyg_css}</style></head><body>",
        f'<div class="doc-meta" data-title="{title}" data-footer="{footer}"></div>',
    ]
    if cover and meta.get("title"):
        parts.append(build_cover(meta))
    if want_toc and toc.strip():
        parts.append(f'<nav class="toc"><h2>Contents</h2>{toc}</nav>')
    parts.append(body)
    parts.append("</body></html>")
    return "".join(parts)


def main() -> int:
    ap = argparse.ArgumentParser(description="Convert Markdown to a beautiful PDF.")
    ap.add_argument("input", type=Path, help="input .md file")
    ap.add_argument("-o", "--output", type=Path, help="output .pdf (default: input with .pdf)")
    ap.add_argument("--css", type=Path, help="custom stylesheet (default: style.css beside this script)")
    ap.add_argument("--title", help="cover title (overrides front matter)")
    ap.add_argument("--subtitle", help="cover subtitle")
    ap.add_argument("--author", help="author name")
    ap.add_argument("--footer", help="footer text (default: author)")
    ap.add_argument("--pygments-style", default="default", help="Pygments theme name")
    ap.add_argument("--mermaid-format", choices=["png", "svg"], default="png",
                    help="how to rasterize mermaid diagrams (png is most reliable)")
    ap.add_argument("--no-cover", action="store_true", help="skip the cover page")
    ap.add_argument("--no-toc", action="store_true", help="skip the table of contents")
    ap.add_argument("--no-mermaid", action="store_true", help="leave mermaid as code blocks")
    args = ap.parse_args()

    if not args.input.is_file():
        print(f"error: no such file: {args.input}", file=sys.stderr)
        return 2

    raw = args.input.read_text(encoding="utf-8")
    meta, raw = extract_front_matter(raw)
    for key in ("title", "subtitle", "author", "footer"):
        val = getattr(args, key)
        if val:
            meta[key] = val
    meta.setdefault("title", args.input.stem.replace("-", " ").replace("_", " ").title())
    meta["pygments_style"] = args.pygments_style

    css_path = args.css or (Path(__file__).resolve().parent / "style.css")
    if not css_path.is_file():
        print(f"error: stylesheet not found: {css_path}", file=sys.stderr)
        return 2
    css = css_path.read_text(encoding="utf-8")

    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        if not args.no_mermaid:
            raw = render_mermaid(raw, workdir, fmt=args.mermaid_format)

        md = markdown.Markdown(extensions=MD_EXTENSIONS, extension_configs=MD_EXTENSION_CONFIGS)
        body = md.convert(raw)
        toc = getattr(md, "toc", "")

        doc = build_html(body, css, meta, toc,
                         cover=not args.no_cover, want_toc=not args.no_toc)

        # Import here so --help works without the native Pango/cairo libs present.
        from weasyprint import HTML

        out = args.output or args.input.with_suffix(".pdf")
        HTML(string=doc, base_url=str(args.input.resolve().parent)).write_pdf(str(out))
        print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
