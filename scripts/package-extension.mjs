import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const extensionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../extension");
const manifest = JSON.parse(fs.readFileSync(path.join(extensionDir, "manifest.json"), "utf8"));
const version = manifest.version;
const out =
  process.argv[2] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), `../../website/store/pinedit-${version}.zip`);

fs.mkdirSync(path.dirname(out), { recursive: true });
execSync(
  `cd "${extensionDir}" && zip -r "${out}" . -x '*.DS_Store' -x 'page-guard.test.mjs'`,
  { stdio: "inherit" },
);
console.log(`Wrote ${out}`);
