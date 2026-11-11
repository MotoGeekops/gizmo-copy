import { spawnSync } from "node:child_process";
import { mkdirSync, copyFileSync, statSync } from "node:fs";
const r = spawnSync(
  "cargo",
  ["build", "--release", "--target", "wasm32-unknown-unknown"],
  { stdio: "inherit" },
);
if (r.status !== 0) process.exit(r.status || 1);
mkdirSync("lib/wasm", { recursive: true });
mkdirSync("public/engine", { recursive: true });
const src = "target/wasm32-unknown-unknown/release/recallforge_study_core.wasm";
copyFileSync(src, "lib/wasm/study_core.wasm");
copyFileSync(src, "public/engine/study_core.wasm");
console.log(`Rust study engine: ${statSync(src).size} bytes`);
