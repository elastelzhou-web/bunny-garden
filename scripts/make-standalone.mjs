import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
let html = await readFile(path.join(dist, "index.html"), "utf8");
const script = html.match(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/);
const style = html.match(
  /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/,
);
if (!script || !style)
  throw new Error("Build the app before making the standalone page.");
const js = await readFile(
  path.join(dist, "assets", path.basename(script[1])),
  "utf8",
);
const css = await readFile(
  path.join(dist, "assets", path.basename(style[1])),
  "utf8",
);
const favicon = await readFile(path.join(dist, "favicon.svg"), "utf8");
html = html.replace(
  script[0],
  () => `<script type="module">${js.replace(/<\/script/gi, "<\\/script")}</script>`,
);
html = html.replace(
  style[0],
  () => `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>`,
);
html = html.replace(
  /href="[^\"]*favicon\.svg"/,
  () => `href="data:image/svg+xml,${encodeURIComponent(favicon)}"`,
);
// Replacement callbacks preserve literal $&, $', $` and $$ in bundled code.
if (!html.includes(js.replace(/<\/script/gi, "<\\/script")) || !html.includes(css)) {
  throw new Error("The standalone page must preserve the complete built script and style.");
}
const output = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, "standalone.html");
await writeFile(output, html, "utf8");
console.log(`Standalone app: ${output}`);
