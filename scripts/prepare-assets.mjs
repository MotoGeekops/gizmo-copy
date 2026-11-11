import { mkdirSync, copyFileSync, cpSync } from "node:fs";
mkdirSync("public", { recursive: true });
copyFileSync(
  "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
  "public/pdf.worker.min.mjs",
);
copyFileSync("node_modules/katex/dist/katex.min.css", "public/katex.min.css");
cpSync("node_modules/katex/dist/fonts", "public/fonts", { recursive: true });
console.log("Prepared local PDF worker and math fonts.");
