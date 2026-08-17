import "obsidian";

declare module "obsidian" {
  interface App {
    /**
     * Hands a vault-relative path to the operating system's default handler.
     *
     * Obsidian ships this but does not declare it. It is what Obsidian itself
     * calls for file types no view has claimed, and this plugin reuses it to
     * keep "open in my real browser" available after it claims `.html`.
     */
    openWithDefaultApp(path: string): void;
  }
}
