import { contentTypeFor, resolveServedPath } from "@/vaultServer";

describe("vaultServer", () => {
  const ROOT = "/Users/someone/Vault";
  const TOKEN = "0123456789abcdef0123456789abcdef";

  describe("resolveServedPath()", () => {
    it("maps a token-prefixed request onto a path inside the vault", () => {
      expect(resolveServedPath(ROOT, TOKEN, `/${TOKEN}/reports/summary.html`)).toBe(
        `${ROOT}/reports/summary.html`
      );
    });

    it("ignores the query string a cache-busting asset URL carries", () => {
      expect(resolveServedPath(ROOT, TOKEN, `/${TOKEN}/app.css?v=8b21`)).toBe(
        `${ROOT}/app.css`
      );
    });

    it("decodes percent-encoded segments so paths with spaces resolve", () => {
      expect(resolveServedPath(ROOT, TOKEN, `/${TOKEN}/my%20notes/a%20file.html`)).toBe(
        `${ROOT}/my notes/a file.html`
      );
    });

    it("tolerates a vault root given with a trailing separator", () => {
      expect(resolveServedPath(`${ROOT}/`, TOKEN, `/${TOKEN}/a.html`)).toBe(`${ROOT}/a.html`);
    });

    it("refuses a request whose token does not match", () => {
      expect(resolveServedPath(ROOT, TOKEN, "/wrong-token/a.html")).toBeNull();
    });

    it("refuses a request with no token segment at all", () => {
      expect(resolveServedPath(ROOT, TOKEN, "/a.html")).toBeNull();
      expect(resolveServedPath(ROOT, TOKEN, `/${TOKEN}`)).toBeNull();
      expect(resolveServedPath(ROOT, TOKEN, "/")).toBeNull();
    });

    it("refuses parent-directory segments that would escape the vault", () => {
      expect(resolveServedPath(ROOT, TOKEN, `/${TOKEN}/../../etc/passwd`)).toBeNull();
      expect(resolveServedPath(ROOT, TOKEN, `/${TOKEN}/notes/../../../etc/passwd`)).toBeNull();
    });

    it("refuses percent-encoded traversal that survives the path split", () => {
      expect(resolveServedPath(ROOT, TOKEN, `/${TOKEN}/%2e%2e/%2e%2e/etc/passwd`)).toBeNull();
      expect(resolveServedPath(ROOT, TOKEN, `/${TOKEN}/notes%2f..%2f..%2fpasswd`)).toBeNull();
      expect(resolveServedPath(ROOT, TOKEN, `/${TOKEN}/notes%5c..%5cpasswd`)).toBeNull();
    });

    it("refuses dot-directories so plugin credentials stay unreadable", () => {
      expect(
        resolveServedPath(ROOT, TOKEN, `/${TOKEN}/.obsidian/plugins/copilot/data.json`)
      ).toBeNull();
      expect(resolveServedPath(ROOT, TOKEN, `/${TOKEN}/.git/config`)).toBeNull();
      expect(resolveServedPath(ROOT, TOKEN, `/${TOKEN}/notes/.env`)).toBeNull();
    });

    it("refuses a segment carrying a NUL byte", () => {
      expect(resolveServedPath(ROOT, TOKEN, `/${TOKEN}/a%00.html`)).toBeNull();
    });

    it("refuses malformed percent-encoding rather than throwing", () => {
      expect(resolveServedPath(ROOT, TOKEN, `/${TOKEN}/%E0%A4%A.html`)).toBeNull();
    });
  });

  describe("contentTypeFor()", () => {
    it("returns the media type a browser needs to execute or render the asset", () => {
      expect(contentTypeFor("/v/index.html")).toBe("text/html; charset=utf-8");
      expect(contentTypeFor("/v/app.css")).toBe("text/css; charset=utf-8");
      expect(contentTypeFor("/v/app.js")).toBe("text/javascript; charset=utf-8");
      expect(contentTypeFor("/v/logo.svg")).toBe("image/svg+xml");
      expect(contentTypeFor("/v/font.woff2")).toBe("font/woff2");
    });

    it("matches the extension case-insensitively", () => {
      expect(contentTypeFor("/v/PHOTO.JPG")).toBe("image/jpeg");
    });

    it("falls back to a non-executable type for unknown and extensionless files", () => {
      expect(contentTypeFor("/v/archive.xyz")).toBe("application/octet-stream");
      expect(contentTypeFor("/v/LICENSE")).toBe("application/octet-stream");
    });
  });
});
