import { build } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";

await mkdir("dist", { recursive: true });

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  format: "esm",
  target: ["es2020"],
  sourcemap: true,
  minify: false
});

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.iife.js",
  bundle: true,
  format: "iife",
  globalName: "PreviewForm",
  target: ["es2020"],
  sourcemap: true,
  minify: true
});

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.cjs",
  bundle: true,
  format: "cjs",
  target: ["es2020"],
  sourcemap: true,
  minify: false
});

await build({
  entryPoints: ["src/jquery.ts"],
  outfile: "dist/jquery.js",
  bundle: true,
  format: "esm",
  target: ["es2020"],
  sourcemap: true,
  minify: false
});

await build({
  entryPoints: ["src/jquery.ts"],
  outfile: "dist/jquery.iife.js",
  bundle: true,
  format: "iife",
  globalName: "PreviewFormJQuery",
  target: ["es2020"],
  sourcemap: true,
  minify: true
});

await build({
  entryPoints: ["src/jquery.ts"],
  outfile: "dist/jquery.cjs",
  bundle: true,
  format: "cjs",
  target: ["es2020"],
  sourcemap: true,
  minify: false
});

await copyFile("src/styles.css", "dist/styles.css");
