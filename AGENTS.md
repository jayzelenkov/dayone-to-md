# AGENTS.md — dayone-to-md

## What This Project Does

CLI tool that converts a DayOne journal export (`.zip`) into individual Markdown files.

- **Input:** a `.zip` exported from DayOne via _File → Export → JSON_
- **Output:** `.md` files in `src/entries/`, images in `99-assets/dayone/` (overridable with `--photos-dir`)
- **Run:** `node bin/index.js` from project root — no build step needed

## Key Files

| File | Purpose |
|------|---------|
| `bin/index.js` | Entry point — just `require('../src')` |
| `src/index.js` | All conversion logic |
| `src/utils.js` | `ensureDirectoriesExist` helper |

## How It Works

1. Looks for `.zip` files in the `dayone/` folder at project root
2. Extracts any root-level `.json` file (matches modern DayOne export naming like `Journal v3 - Cofounder.json`)
3. Converts each entry to Markdown with YAML frontmatter
4. Extracts photos to `--photos-dir` (default `99-assets/dayone/`)
5. Writes `.md` files to `src/entries/YYYY-MM-DD - Title.md`

## CLI Options

| Flag | Default | Description |
|------|---------|-------------|
| `--photos-dir <path>` | `99-assets/dayone` | Override photo output directory and image link prefix |

## Important Conventions

- `src/entries/` and `99-assets/` are `.gitignore`d — they are generated output
- The `dayone/` folder (holding export zips) is also `.gitignore`d
- Photo paths in markdown links use `photosDir` verbatim (not the resolved absolute path), so it matches the static asset path your site expects
- `entryToMarkdown(entry, photosDir)` must receive `photosDir` — don't hardcode the asset path inside that function

## Known Quirks

- Video files are **not extracted** — referenced as `*(video: ID.mp4)*` placeholder
- Audio-only entries (no text) become `untitled.md` with `*(audio)*` as body
- Titles may contain `#` heading syntax when the DayOne entry starts with a heading
- Entries with no text field, no newline, or very long first lines are all handled gracefully
