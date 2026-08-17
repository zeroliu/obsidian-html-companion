import { FileSystemAdapter, Notice, Platform, Plugin, TFile } from "obsidian";
import { HtmlFileView, HtmlUrlResolver, VIEW_TYPE_HTML } from "@/HtmlFileView";
import { VaultServer } from "@/vaultServer";

const HTML_EXTENSIONS = ["html", "htm"];

/**
 * Registers `.html` / `.htm` with Obsidian so those files appear in the file
 * explorer and open in a tab, and owns the loopback server their frames read
 * from.
 */
export default class HtmlViewerPlugin extends Plugin implements HtmlUrlResolver {
  private server: VaultServer | null = null;

  async onload(): Promise<void> {
    this.registerView(VIEW_TYPE_HTML, (leaf) => new HtmlFileView(leaf, this));

    try {
      this.registerExtensions(HTML_EXTENSIONS, VIEW_TYPE_HTML);
    } catch {
      // Obsidian throws when an extension is already registered. Another plugin
      // owning .html is a coexistence problem, not a reason to fail loading.
      new Notice(
        "HTML Viewer: another plugin already handles .html files, so HTML files will keep opening in your browser."
      );
    }
  }

  onunload(): void {
    this.server?.stop();
    this.server = null;
  }

  /**
   * Prefer the loopback server, which is the only transport whose frames can
   * load a document's own relative stylesheets, scripts, and images. Fall back
   * to Obsidian's `app://` resource path when no server is possible — on mobile,
   * or when the port cannot be bound — where self-contained documents still
   * render but relative assets do not resolve.
   */
  async resolveUrl(file: TFile): Promise<string> {
    const server = await this.ensureServer();
    return server ? server.urlFor(file.path) : this.app.vault.getResourcePath(file);
  }

  private async ensureServer(): Promise<VaultServer | null> {
    if (this.server) return this.server;

    const adapter = this.app.vault.adapter;
    // emulateMobile leaves isDesktopApp true, so both checks are needed before
    // reaching for Node builtins.
    if (!Platform.isDesktopApp || Platform.isMobile) return null;
    if (!(adapter instanceof FileSystemAdapter)) return null;

    const server = new VaultServer(adapter.getBasePath());
    try {
      await server.start();
    } catch {
      new Notice(
        "HTML Viewer: could not start the local server, so files that use separate CSS or JS may render incompletely."
      );
      return null;
    }

    this.server = server;
    this.register(() => server.stop());
    return server;
  }
}
