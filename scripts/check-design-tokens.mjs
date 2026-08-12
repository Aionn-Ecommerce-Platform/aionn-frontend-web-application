import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";

const arbitraryColor =
  /(?:bg|text|border|from|to|ring|fill|stroke)-\[#[\da-f]{3,8}\]/i;
const failures = [];

for await (const file of glob("src/**/*.{ts,tsx}")) {
  const lines = (await readFile(file, "utf8")).split(/\r?\n/);
  lines.forEach((line, index) => {
    if (arbitraryColor.test(line)) failures.push(`${file}:${index + 1}`);
  });
}

if (failures.length) {
  console.error(`Hardcoded Tailwind colors:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Design token check passed.");
