import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(root, "src");
const failures = [];
const publicPages = new Set([
  "src/app/page.tsx",
  "src/app/categories/page.tsx",
  "src/app/products/page.tsx",
  "src/app/products/[id]/page.tsx",
  "src/app/merchants/page.tsx",
  "src/app/merchants/[id]/page.tsx",
  "src/app/promotions/page.tsx",
  "src/app/contact/page.tsx",
]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory()
      ? walk(target)
      : /\.(?:ts|tsx)$/.test(entry.name)
        ? [target]
        : [];
  });
}

for (const file of walk(sourceRoot)) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  for (const match of source.matchAll(
    /from\s+["'](@\/features\/([^/"']+)(\/[^"']+)?)['"]/g,
  )) {
    if (match[3]) failures.push(`${relative}: deep feature import ${match[1]}`);
  }
  if (source.includes('from "@/components/ui'))
    failures.push(`${relative}: legacy UI import`);
  if (source.includes('from "@/lib/api'))
    failures.push(`${relative}: legacy API import`);
  if (
    publicPages.has(relative.replaceAll(path.sep, "/")) &&
    /^"use client"/m.test(source)
  ) {
    failures.push(`${relative}: route entry must remain a Server Component`);
  }
}

const legacyTypes = fs
  .readFileSync(path.join(sourceRoot, "types", "index.ts"), "utf8")
  .trim();
if (legacyTypes !== 'export * from "../shared/types";')
  failures.push("src/types/index.ts must only be a compatibility barrel");

for (const entry of fs.readdirSync(path.join(sourceRoot, "features"), {
  withFileTypes: true,
})) {
  if (
    entry.isDirectory() &&
    !fs.existsSync(path.join(sourceRoot, "features", entry.name, "index.ts"))
  ) {
    failures.push(`src/features/${entry.name}: missing public index.ts`);
  }
}

if (failures.length) {
  console.error(`Architecture check failed:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("Architecture boundaries passed.");
