# HTML Viewer

Show `.html` files in Obsidian's file explorer, and open them in a tab instead of your browser.

Obsidian hides HTML files by default. Turn on "Detect all file extensions" and they appear — but clicking one still throws you out to Safari or Chrome. This plugin fixes both halves: HTML files show up on their own, and clicking one renders it right where you're working.

Useful if you generate HTML into your vault — reports, dashboards, charts, exported notes, design mockups — and you're tired of leaving Obsidian to look at them.

## Install

Not in the community plugin list yet. Install it manually:

```bash
git clone https://github.com/zeroliu/obsidian-html-viewer.git
cd obsidian-html-viewer
npm install && npm run build
./scripts/install.sh /path/to/your/vault
```

Then enable **HTML Viewer** in Settings → Community plugins. Restart Obsidian (or use [Hot Reload](https://github.com/pjeby/hot-reload)) so it picks up the new plugin folder.

To install by hand instead, copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/html-viewer/`.

## What you get

- `.html` and `.htm` files appear in the file explorer with an `HTML` badge — **you do not need "Detect all file extensions" on**.
- Clicking one opens it in an Obsidian tab. Splits, tab history, and renames all work like any other file.
- Scripts, styles, images, fonts, and `fetch()` all work, including assets in neighbouring folders.
- Two buttons in the tab header: **Reload**, and **Open in default app** if you still want the real browser.

No settings. Nothing to configure.

## How it works

Two mechanisms, and the second is the non-obvious one.

**Making the files visible and clickable.** Obsidian decides both from one rule:

```js
isSupportedFile(f) {
  return !!vault.getConfig("showUnsupportedFiles")
      || viewRegistry.isExtensionRegistered(f.extension);
}
```

Registering `html` satisfies the second clause, so the files appear without the global setting — which matters, because that setting also surfaces every stray `.css`, `.js`, and `.json` in your vault. Registration also gives the click somewhere to go; without it, Obsidian falls back to `openWithDefaultApp()`, which is the trip to Safari.

**Rendering the file.** The obvious approach is an iframe pointed at `vault.getResourcePath(file)`, which yields an `app://` URL. That renders the page — but every relative asset fails with `ERR_BLOCKED_BY_CLIENT`, because Obsidian filters its own protocol:

```js
webRequest.onBeforeRequest({urls: ["app://*/*"]}, (details, cb) => {
  let cancel = true;
  if (details.frame.origin + "/" === "app://obsidian.md/") cancel = false;
  cb({cancel});
})
```

Any `app://` request from a frame that isn't Obsidian's own shell gets cancelled. A framed document has its own origin, so it cannot load its own stylesheet.

So the plugin serves the file over `http://127.0.0.1` instead, from a small server rooted at your vault. That origin isn't filtered, and relative paths resolve the way the document's author intended.

On mobile, where there are no Node builtins to run a server, it falls back to the `app://` URL. Self-contained files still render there; files with separate CSS or JS won't.

## Is the server safe?

It's a real HTTP server, so the honest answer is what it does and doesn't allow. It starts lazily — nothing is listening until you open your first HTML file — and stops when the plugin unloads.

- **Bound to `127.0.0.1` only.** Not reachable from your network. Verified against the machine's LAN address: connection refused.
- **Ephemeral port**, chosen by the OS at startup.
- **Every URL carries a random 128-bit token.** A web page that guesses the port still gets `403`, so a site you happen to be visiting cannot scan for the server and read your vault.
- **Dot-directories are refused.** `.obsidian` holds plugin credentials, so `.obsidian`, `.git`, and any other dotfile return `403`.
- **Traversal is impossible by construction.** Path segments are rejected before they reach the filesystem, including percent-encoded `..` and encoded separators.

Within those limits, the server can read any ordinary file in the vault, because a document is allowed to reference assets in sibling folders.

The rendered document is also isolated from Obsidian: the frame gets its own origin, so it can't reach Obsidian's DOM or `app` object, and Node is unavailable inside it (`require` is `undefined`). It's still your own HTML running with full script access, so treat vault HTML the way you'd treat any file you'd open in a browser.

## Known limitations

- **Root-relative URLs don't resolve.** A document referencing `/assets/app.css` won't find it, because the leading `/` drops the security token. Relative paths (`assets/app.css`, `../shared/app.css`) work fine.
- **Only one plugin can own `.html`.** If another already has it, this one notices, tells you, and stays out of the way.
- **Mobile is limited to self-contained files**, as above.

## Development

```bash
npm install
npm run dev     # watch build
npm test        # unit tests
npm run build   # typecheck + production bundle
```

## License

MIT
