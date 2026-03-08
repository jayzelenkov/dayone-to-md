# dayone-to-markdown

## Changes from the Original Repository

This repo extends the [original dayone-to-md](https://github.com/quantdev/dayone-to-md) with the following improvements:

### Bug Fixes

- **Modern export naming** — The original code only matched a file literally named `Journal.json`. DayOne now names exports after the journal (e.g., `Journal v3 - Cofounder.json`). Fixed to match any root-level `.json` in the zip.
- **Photo substitution order** — Photos were substituted after the title/body split, so entries whose first line was an image tag got the raw `dayone-moment://` URL used as the filename. Fixed by substituting before the split.
- **Entries with no text** — Photo- or audio-only entries had no `text` field, causing a crash on `.slice`. Fixed with an empty-string fallback.
- **Entries with no newline** — Single-line entries caused `slice(0, -1)` to silently drop the last character. Fixed by explicitly checking for the newline index.
- **Filename too long** — Very long first lines exceeded macOS's 255-byte filename limit. Fixed by capping the sanitized title at 100 characters, with an `untitled` fallback.
- **Entries starting with an image tag** — When the first line was a markdown image, the image tag became the filename. Fixed to scan for the first non-image line and use that as the title.

### New Features

- **Video link handling** — `dayone-moment:/video/ID` links are now replaced with a `*(video: ID.mp4)*` placeholder instead of being left as broken links.
- **Audio link handling** — `dayone-moment:/audio/ID` links are now replaced with `*(audio)*`.
- **`--photos-dir` flag** — Override the output directory for extracted photos (and the path embedded in markdown image links). Default: `99-assets/dayone`.

### Output Path Changes

- Photos output to `99-assets/dayone/` instead of `public/static/`
- Markdown image references updated to match (no leading `./`)

---

## The Problem

You love using the DayOne journaling app to record all your amazing thoughts! But you want to get those entries into a markdown format so you can publish them to your own blog or website.

## The Solution

The DayOne app currently allows an export of entries to a JSON format. This package will unzip the DayOne output and convert all the entries in `Journal.json` into individual markdown files. By default some metadata from the entry is added as frontmatter to the top of each `.md` file. The photos and links to other entries are also converted into a relative markdown link.

## Usage

1. Export your journal from DayOne via _File → Export → JSON_
2. Place the `.zip` file in a `dayone/` folder at the project root
3. Run:

```bash
node bin/index.js
```

Output: `.md` files → `src/entries/` · photos → `99-assets/dayone/`

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--photos-dir <path>` | `99-assets/dayone` | Override the directory where extracted photos are saved. The same path is used in markdown image links, so set it to wherever your static assets will be served from. |

**Example** — save photos into a custom directory:

```bash
node bin/index.js --photos-dir public/images
# or via npm script:
dayone-to-md --photos-dir public/images
```
