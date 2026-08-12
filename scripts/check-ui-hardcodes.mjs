import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const vietnamese = /[À-ỹĐđ]/u;
const allowed = [
  /replace\(\/đ\/g|replace\(\/Đ\/g/u,
  /thành phố|Thành Phố|tỉnh|Tỉnh|Quận|Huyện|Thị Xã|Phường|Xã|Thị Trấn/u,
  /chính hãng/u,
  /79 Đường Láng|Hà Nội|Nguyễn Văn Shipper/u,
];

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(target)));
    else if (entry.name.endsWith(".tsx")) files.push(target);
  }
  return files;
}

const violations = [];
for (const file of await walk(sourceRoot)) {
  const lines = (await readFile(file, "utf8")).split(/\r?\n/u);
  lines.forEach((line, index) => {
    if (
      vietnamese.test(line) &&
      !allowed.some((pattern) => pattern.test(line))
    ) {
      violations.push(
        `${path.relative(root, file)}:${index + 1}: ${line.trim()}`,
      );
    }
  });
}

if (violations.length > 0) {
  console.error("UI hardcode check failed:\n" + violations.join("\n"));
  process.exit(1);
}

console.log("UI hardcode check passed.");
