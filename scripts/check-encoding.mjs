import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const TEXT_FILE = /\.(ts|tsx|mts|mjs|js|json|css|md)$/;

const MOJIBAKE_MARKERS = [
  "â€",
  "â†",
  "â‚",
  "Ã¡",
  "Ã ",
  "Ã¢",
  "Ã©",
  "Ã­",
  "Ã³",
  "Ãº",
  "Ã´",
  "Ã½",
  "áº",
  "á»",
  "Æ¡",
  "Æ°",
  "Ä‘",
  "Ä'",
];

const IGNORED_DIRECTORIES = new Set([
  ".agents",
  ".claude",
  ".codex",
  ".git",
  ".next",
  "node_modules",
  "coverage",
]);

function textFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (IGNORED_DIRECTORIES.has(entry.name)) return [];
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return textFiles(target);
    return TEXT_FILE.test(entry.name) ? [target] : [];
  });
}

const problems = [];

for (const file of textFiles(process.cwd())) {
  if (path.resolve(file) === path.resolve(import.meta.filename)) continue;
  let raw;
  try {
    raw = readFileSync(file);
  } catch {
    continue;
  }

  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) {
    problems.push(`${file}:1  byte order mark`);
  }

  const text = raw.toString("utf8");
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    for (const marker of MOJIBAKE_MARKERS) {
      if (line.includes(marker)) {
        problems.push(
          `${file}:${index + 1}  mojibake ${JSON.stringify(marker)}  ${line.trim().slice(0, 100)}`,
        );
        return;
      }
    }
  });
}

if (problems.length > 0) {
  process.stderr.write(
    `Encoding check failed (${problems.length}):\n${problems.map((p) => `  ${p}`).join("\n")}\n`,
  );
  process.exit(1);
}

process.stdout.write(`Encoding check passed.\n`);
