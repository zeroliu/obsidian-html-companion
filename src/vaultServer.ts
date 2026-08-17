/**
 * Node builtins are named only in type position here. Obsidian mobile has no
 * Node, so the modules themselves are pulled in by `await import()` inside
 * `start()`, which never runs on a platform that lacks them.
 */
type NodeHttp = typeof import("node:http");
type NodeFs = typeof import("node:fs");

/**
 * Loopback HTTP server that exposes vault files to the HTML viewer's iframe.
 *
 * It exists because Obsidian cancels every `app://` request whose initiating
 * frame is not Obsidian's own shell, which means a framed vault document cannot
 * load its own sibling stylesheets, scripts, or images. Serving the same files
 * over `http://127.0.0.1` gives the frame an origin whose subresource requests
 * Obsidian does not filter.
 *
 * Its boundary stops at handing out bytes: it never decides which file a tab
 * should show, and it holds no reference to the workspace.
 */
export class VaultServer {
  private server: ReturnType<NodeHttp["createServer"]> | null = null;
  private port = 0;
  private readonly token: string;

  /**
   * @param vaultRoot Absolute filesystem path of the vault, used as the only
   *   directory the server will ever read from.
   */
  constructor(private readonly vaultRoot: string) {
    this.token = randomToken();
  }

  /**
   * Bind to an ephemeral loopback port, or resolve immediately if already bound.
   * Rejects when Node's `http` module is unavailable (mobile) or the bind fails.
   */
  async start(): Promise<void> {
    if (this.server) return;

    // Imported lazily: Obsidian mobile has no Node builtins, and a static import
    // would throw while the plugin is still loading. `fs` is resolved here too,
    // then handed to each request, because serving a file cannot await.
    const [http, fs] = await Promise.all([import("node:http"), import("node:fs")]);

    const server = http.createServer((req, res) => this.handle(fs, req, res));
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        server.removeListener("error", reject);
        resolve();
      });
    });

    const address = server.address();
    if (address === null || typeof address === "string") {
      server.close();
      throw new Error("Local server bound to an unexpected address");
    }

    this.server = server;
    this.port = address.port;
  }

  stop(): void {
    this.server?.close();
    this.server = null;
    this.port = 0;
  }

  /**
   * URL an iframe should load to render the given vault-relative path.
   *
   * @param vaultPath Vault-relative path, e.g. `reports/summary.html`.
   */
  urlFor(vaultPath: string): string {
    const encoded = vaultPath.split("/").map(encodeURIComponent).join("/");
    return `http://127.0.0.1:${this.port}/${this.token}/${encoded}`;
  }

  private handle(
    fs: NodeFs,
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse
  ): void {
    const filePath = resolveServedPath(this.vaultRoot, this.token, req.url ?? "");
    if (filePath === null) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Forbidden");
      return;
    }

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": contentTypeFor(filePath),
        "Content-Length": String(stat.size),
        "Cache-Control": "no-store",
      });
      fs.createReadStream(filePath)
        .on("error", () => res.destroy())
        .pipe(res);
    });
  }
}

/**
 * Map a request URL onto an absolute path inside the vault, or `null` to refuse.
 *
 * Refusal is the default: a segment reaches the filesystem only if it survives
 * every check, so traversal is impossible by construction rather than by a
 * comparison against the resolved result.
 *
 * @param vaultRoot Absolute filesystem path of the vault.
 * @param token Secret first path segment that a caller must already know, so a
 *   web page that guesses the port still cannot read the vault.
 * @param requestUrl Raw `req.url`, query string included.
 */
export function resolveServedPath(
  vaultRoot: string,
  token: string,
  requestUrl: string
): string | null {
  const withoutQuery = requestUrl.split(/[?#]/)[0];
  const rawSegments = withoutQuery.split("/").filter((segment) => segment.length > 0);
  if (rawSegments.length < 2) return null;
  if (rawSegments[0] !== token) return null;

  const segments: string[] = [];
  for (const raw of rawSegments.slice(1)) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return null;
    }
    // A leading dot covers `.`, `..`, and config directories such as
    // `.obsidian`, whose data.json holds plugin credentials.
    if (decoded.length === 0 || decoded.startsWith(".")) return null;
    // A decoded separator would smuggle traversal past the split above.
    if (/[/\\\0]/.test(decoded)) return null;
    segments.push(decoded);
  }

  return `${vaultRoot.replace(/[/\\]+$/, "")}/${segments.join("/")}`;
}

const CONTENT_TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  map: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  pdf: "application/pdf",
};

/** Content-Type for a path, defaulting to a type browsers will not execute. */
export function contentTypeFor(filePath: string): string {
  const extension = filePath.slice(filePath.lastIndexOf(".") + 1).toLowerCase();
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
