---
name: markdown-to-pdf
description: Use when converting a Markdown file into a beautiful, print-ready PDF — reports, docs, specs, or exports with a styled cover page, running headers/footers, page numbers, tables, syntax-highlighted code, and mermaid diagrams.
---

# Markdown → Beautiful PDF

Convert any Markdown file into a polished PDF: a gradient cover page, running
headers/footers with page numbers, a table of contents, GFM tables, task lists,
footnotes, Pygments-highlighted code, and rendered `mermaid` diagrams.

The skill ships a converter and a stylesheet — you drive them, you don't
reimplement them:

- `${CLAUDE_PLUGIN_ROOT}/skills/markdown-to-pdf/md2pdf.py` — the converter
- `${CLAUDE_PLUGIN_ROOT}/skills/markdown-to-pdf/style.css` — the print theme

## Stack (why these)

`md2pdf.py` declares its Python deps inline (PEP 723), so **`uv run` installs
them into a throwaway env — nothing lands in the user's global Python**:

- **WeasyPrint** — HTML+CSS → PDF. Chosen for its CSS Paged Media support
  (`@page`, running headers via `string-set`, `counter(page)`/`counter(pages)`,
  named pages) — the only reliable way to get styled headers/footers and a cover.
- **Python-Markdown + pymdown-extensions** — MkDocs-Material-grade Markdown
  (tables, task lists, footnotes, def lists, strikethrough, admonitions, TOC).
- **Pygments** — code syntax highlighting.
- **mermaid-cli (`mmdc`)** via `npx` — renders ` ```mermaid ` blocks to images.

## One-time setup

```bash
# WeasyPrint needs the native Pango libs (not bundled in the wheel):
brew install pango                         # macOS  (pulls cairo/harfbuzz/glib)
# sudo apt install libpango-1.0-0 libpangoft2-1.0-0   # Debian/Ubuntu

# uv runs the script + installs Python deps on demand:  https://docs.astral.sh/uv/
# Node's npx (for mermaid) — only needed if the doc has mermaid diagrams.
```

On macOS, if WeasyPrint can't find Pango, prefix the command with
`DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib`.

## Usage

```bash
DIR=${CLAUDE_PLUGIN_ROOT}/skills/markdown-to-pdf
uv run "$DIR/md2pdf.py" report.md                       # -> report.pdf
uv run "$DIR/md2pdf.py" report.md -o out.pdf \
    --title "Q3 Report" --subtitle "Revenue review" \
    --author "Uhstray" --footer "Confidential"
```

`uv run "$DIR/md2pdf.py" --help` lists every flag. Useful ones:
`--no-cover`, `--no-toc`, `--no-mermaid`, `--css PATH`,
`--pygments-style NAME` (e.g. `github-dark`, `monokai`),
`--mermaid-format png|svg` (png is the most reliable).

## Cover metadata via front matter

A leading YAML block sets the cover and headers (CLI flags override it):

```markdown
---
title: The Quarterly Report
subtitle: Revenue and outlook
author: Uhstray Engineering
eyebrow: Confidential
date: 2026-07-16
footer: Confidential draft
---

# First heading …
```

Missing `title` → derived from the filename. No front matter and `--no-cover`
→ straight into content.

## What renders

| Construct | Notes |
| --- | --- |
| Headings, bold/italic, links, HR | Accent headings; H1/H2 feed the header |
| Bullet / ordered / nested / task lists | Custom checkboxes |
| Blockquotes | Tinted, colored left border |
| GFM tables | Accent header row, zebra striping, header repeats across pages |
| Fenced code | Pygments highlighting, kept off page breaks |
| ` ```mermaid ` diagrams | Rendered via `mmdc`, embedded as images |
| Footnotes, definition lists, strikethrough | Via pymdown-extensions |

## Customizing the look

Edit tokens in `style.css` (`--accent`, `--font-body`, `--font-head`, …) or pass
your own with `--css mytheme.css`. It's standard CSS Paged Media — the cover is
`@page cover` (full-bleed gradient, chrome suppressed); the running header/footer
live in `@page` margin boxes fed by `string-set`.

## Gotchas

- **Blank first page / missing cover** → a block-level element before the
  `@page cover` element steals page 1; keep the string-set carrier
  `position: absolute` (see `.doc-meta` in `style.css`).
- **Mermaid not rendering** → `npx` missing (install Node) or a diagram syntax
  error; the raw code block is kept and a warning printed. `mmdc`'s first run
  downloads headless Chromium (slow once).
- **Diagram looks wrong in SVG mode** → use `--mermaid-format png` (default);
  WeasyPrint's SVG renderer is a subset.
- **Color emoji show as boxes** → WeasyPrint has limited color-emoji support;
  use a monochrome emoji font or avoid them.
- **Missing fonts** → set the `--font-*` tokens to families installed on the host.
