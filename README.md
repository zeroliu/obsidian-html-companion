# HTML Companion

<img width="2134" height="1302" alt="Screenshot 2026-08-17 at 12 18 13 PM" src="https://github.com/user-attachments/assets/88750d5a-88cd-4f46-8ec7-1b37b4f52740" />

**Open `.html` files inside Obsidian, in a normal tab.**

Obsidian hides HTML files by default, and when you use "Show all file types" settings, clicking HTML files from the navbar kicks you out to external browsers instead of showing them in the built-in web view. This plugin makes HTML files appear in the file explorer and open right where you're working.

Handy if your vault collects HTML, reports, dashboards, charts, exported notes, mockups, or anything your AI assistant writes for you.

## Install

Not in the community plugin list yet, so install it manually. In a terminal:

```bash
git clone https://github.com/zeroliu/obsidian-html-companion.git
```

```bash
cd obsidian-html-companion && npm install && npm run build
```

```bash
./scripts/install.sh /path/to/your/vault
```

Then restart Obsidian and turn on **HTML Companion** in Settings → Community plugins.

Prefer to do it by hand? Copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/html-companion/`.

## What you get

- `.html` and `.htm` files show up in the file explorer with an `HTML` badge. No need to turn on "Detect all file extensions".
- Clicking one opens it in a tab. Splits, tab history, and renames work like any other file.
- Pages render fully: scripts, styles, images, fonts, and data fetching all work, including files kept in nearby folders.
- The tab updates itself when the file changes, so a page your assistant rewrites refreshes while you watch.
- Two buttons in the tab header: **Reload**, and **Open in default app** if you'd rather use your browser after all.
- On phones and tablets, single-file pages work; ones that pull in separate CSS or JS need the desktop app.

## Why this exists

Agents are unusually good at HTML, and Anthropic's Claude Code team makes the case for leaning into that in [The unreasonable effectiveness of HTML](https://claude.com/blog/using-claude-code-the-unreasonable-effectiveness-of-html): a plan, a report, or a review reads far better as a real page than as another wall of Markdown.

Ask [Obsidian Copilot](https://community.obsidian.md/plugins/copilot) for one and it lands in your vault. And then it disappears. The file is right there, but Obsidian won't list it or open it, so you end up digging through Finder and switching to a browser to read something your notes just made.

This plugin closes that loop. The page your assistant wrote opens in a tab next to the note it came from.

## Development

```bash
npm install
npm run dev     # watch build
npm test        # unit tests
npm run build   # typecheck + production bundle
```

## License

MIT
