import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const frontendRoot = path.resolve(import.meta.dirname, "..");
const backendRoot = path.resolve(
  process.env.AIONN_BACKEND_PATH ??
    path.join(frontendRoot, "..", "aionn-modulith-backend"),
);

if (!fs.existsSync(backendRoot)) {
  console.warn(`[api-contract] Backend not found at ${backendRoot}; skipping.`);
  process.exit(0);
}

function filesUnder(root, predicate) {
  const result = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (["build", "bin", ".git", "node_modules", ".next"].includes(entry.name))
      continue;
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...filesUnder(target, predicate));
    else if (predicate(target)) result.push(target);
  }
  return result;
}

function annotationPath(args = "") {
  const match = args.match(/["']([^"']*)["']/);
  return match?.[1] ?? "";
}

function normalizePath(value) {
  const withoutApiPrefix = value.replace(/^\/api\/v1/, "");
  const normalized = withoutApiPrefix
    .replace(/\$\{[^}]+\}/g, "{}")
    .replace(/\{[^}]+\}/g, "{}")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
  return normalized || "/";
}

function backendEndpoints() {
  const endpoints = new Set();
  const controllers = filesUnder(backendRoot, (file) =>
    file.endsWith("Controller.java"),
  );
  for (const file of controllers) {
    const source = fs.readFileSync(file, "utf8");
    const classAt = source.indexOf(" class ");
    if (classAt < 0) continue;
    const header = source.slice(0, classAt);
    const baseMatches = [
      ...header.matchAll(/@RequestMapping\s*(?:\(([^)]*)\))?/g),
    ];
    const base = annotationPath(baseMatches.at(-1)?.[1]);
    const mapping = /@(Get|Post|Put|Patch|Delete)Mapping\s*(?:\(([^)]*)\))?/g;
    for (const match of source.slice(classAt).matchAll(mapping)) {
      const verb = match[1].toUpperCase();
      endpoints.add(
        `${verb} ${normalizePath(`${base}/${annotationPath(match[2])}`)}`,
      );
    }
  }
  return endpoints;
}

function skipTypeArguments(source, start) {
  let cursor = start;
  while (/\s/.test(source[cursor] ?? "")) cursor += 1;
  if (source[cursor] !== "<") return cursor;
  let depth = 0;
  for (; cursor < source.length; cursor += 1) {
    if (source[cursor] === "<") depth += 1;
    if (source[cursor] === ">" && --depth === 0) return cursor + 1;
  }
  return cursor;
}

function frontendCalls() {
  const calls = [];
  const files = filesUnder(path.join(frontendRoot, "src"), (file) =>
    /\.[cm]?[jt]sx?$/.test(file),
  );
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const apiCall = /\bapi\.(get|post|put|patch|delete|page)\b/g;
    for (const match of source.matchAll(apiCall)) {
      let cursor = skipTypeArguments(source, match.index + match[0].length);
      while (/\s/.test(source[cursor] ?? "")) cursor += 1;
      if (source[cursor] !== "(") continue;
      cursor += 1;
      while (/\s/.test(source[cursor] ?? "")) cursor += 1;
      const quote = source[cursor];
      if (!['"', "'", "`"].includes(quote)) continue;
      const end = source.indexOf(quote, cursor + 1);
      if (end < 0) continue;
      const endpointPath = source.slice(cursor + 1, end);
      if (!endpointPath.startsWith("/")) continue;
      const line = source.slice(0, match.index).split("\n").length;
      calls.push({
        key: `${match[1] === "page" ? "GET" : match[1].toUpperCase()} ${normalizePath(endpointPath)}`,
        file: path.relative(frontendRoot, file).replaceAll("\\", "/"),
        line,
      });
    }

    if (!file.includes(`${path.sep}lib${path.sep}services${path.sep}`))
      continue;
    const directCall = /\b(requestEnvelope|request)\b/g;
    for (const match of source.matchAll(directCall)) {
      let cursor = skipTypeArguments(source, match.index + match[0].length);
      while (/\s/.test(source[cursor] ?? "")) cursor += 1;
      if (source[cursor] !== "(") continue;
      cursor += 1;
      while (/\s/.test(source[cursor] ?? "")) cursor += 1;
      const quote = source[cursor];
      if (!['"', "'", "`"].includes(quote)) continue;
      const end = source.indexOf(quote, cursor + 1);
      if (end < 0) continue;
      const endpointPath = source.slice(cursor + 1, end);
      if (!endpointPath.startsWith("/")) continue;
      const optionsSnippet = source.slice(end + 1, end + 500);
      const explicitMethod = optionsSnippet.match(
        /\bmethod\s*:\s*["'](GET|POST|PUT|PATCH|DELETE)["']/,
      )?.[1];
      const line = source.slice(0, match.index).split("\n").length;
      calls.push({
        key: `${explicitMethod ?? "GET"} ${normalizePath(endpointPath)}`,
        file: path.relative(frontendRoot, file).replaceAll("\\", "/"),
        line,
      });
    }
  }
  return calls;
}

const allowedMissing = new Map([]);

const backend = backendEndpoints();
const calls = frontendCalls();
const missing = calls.filter(
  (call) => !backend.has(call.key) && !allowedMissing.has(call.key),
);

console.log(
  `[api-contract] ${backend.size} backend endpoints; ${calls.length} frontend calls.`,
);
if (missing.length === 0) {
  console.log(
    "[api-contract] All statically declared frontend API calls match a backend route.",
  );
  process.exit(0);
}

console.error(`[api-contract] ${missing.length} unmatched frontend call(s):`);
for (const call of missing)
  console.error(`  ${call.key}  ${call.file}:${call.line}`);
process.exit(1);
