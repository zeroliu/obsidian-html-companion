import { FileView, TFile, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_HTML = "html-companion-view";

/** Resolves the URL a tab should load for a vault file. */
export interface HtmlUrlResolver {
  resolveUrl(file: TFile): Promise<string>;
}

/**
 * Tab that renders a vault HTML file inside an iframe.
 *
 * The frame gets its own origin, so the document cannot reach Obsidian's DOM or
 * app object, and Node is unavailable inside it. This view owns only the frame's
 * lifecycle; where its URL comes from is the resolver's business.
 */
export class HtmlFileView extends FileView {
  constructor(
    leaf: WorkspaceLeaf,
    private readonly resolver: HtmlUrlResolver
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_HTML;
  }

  getDisplayText(): string {
    return this.file?.basename ?? "HTML";
  }

  getIcon(): string {
    return "code-2";
  }

  async onOpen(): Promise<void> {
    this.addAction("refresh-cw", "Reload", () => {
      if (this.file) void this.onLoadFile(this.file);
    });
    this.addAction("external-link", "Open in default app", () => {
      if (this.file) this.app.openWithDefaultApp(this.file.path);
    });
  }

  async onLoadFile(file: TFile): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("html-companion-content");

    let url: string;
    try {
      url = await this.resolver.resolveUrl(file);
    } catch (error) {
      this.renderError(error);
      return;
    }

    // The file may have been swapped out while the resolver was awaiting.
    if (this.file !== file) return;

    const frame = this.contentEl.createEl("iframe", { cls: "html-companion-frame" });
    frame.setAttribute("referrerpolicy", "no-referrer");
    frame.setAttribute("src", url);
  }

  async onUnloadFile(): Promise<void> {
    this.contentEl.empty();
  }

  private renderError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    const wrapper = this.contentEl.createDiv({ cls: "html-companion-error" });
    wrapper.createEl("p", { text: "Could not display this HTML file." });
    wrapper.createEl("p", { cls: "html-companion-error-detail", text: message });
  }
}
