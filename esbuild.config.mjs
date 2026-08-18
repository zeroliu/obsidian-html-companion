import esbuild from "esbuild";
import process from "node:process";
import { builtinModules } from "node:module";

const production = process.argv[2] === "production";

// Obsidian's runtime supplies the Node builtins, and the plugin reaches them
// under both spellings, so both have to stay out of the bundle.
const nodeBuiltins = [...builtinModules, ...builtinModules.map((name) => `node:${name}`)];

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", ...nodeBuiltins],
  format: "cjs",
  target: "es2018",
  // Obsidian evaluates main.js as CommonJS in the renderer, where a surviving
  // `import()` would be resolved by Chromium against the app's base URL and
  // never reach Node. Declaring the syntax unsupported lowers the plugin's
  // lazy Node imports to `require()`, which the loader does honour.
  supported: { "dynamic-import": false },
  logLevel: "info",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  minify: production,
  outfile: "main.js",
});

if (production) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
