import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const RULES = [
  {
    label: "React source",
    maxLines: 400,
    matches: (filePath) => filePath.startsWith("src/") && /\.(js|jsx)$/.test(filePath),
  },
  {
    label: "Stylesheets",
    maxLines: 500,
    matches: (filePath) => filePath.startsWith("src/") && filePath.endsWith(".css"),
  },
  {
    label: "Automation and data scripts",
    maxLines: 500,
    matches: (filePath) => filePath.startsWith("scripts/") && filePath.endsWith(".mjs"),
  },
];

const ROOTS = ["src", "scripts"];
const IGNORE_DIRS = new Set(["dist", "node_modules", ".git"]);

async function walkDirectory(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      const childDir = path.posix.join(relativeDir, entry.name);
      files.push(...(await walkDirectory(childDir)));
      continue;
    }

    if (!entry.isFile()) continue;
    files.push(path.posix.join(relativeDir, entry.name));
  }

  return files;
}

function getRule(filePath) {
  return RULES.find((rule) => rule.matches(filePath)) || null;
}

function countLines(source) {
  if (!source) return 0;
  return source.split(/\r\n|\n|\r/).length;
}

async function getViolations() {
  const files = [];

  for (const root of ROOTS) {
    const absoluteRoot = path.join(repoRoot, root);
    try {
      const rootStats = await stat(absoluteRoot);
      if (!rootStats.isDirectory()) continue;
      files.push(...(await walkDirectory(root)));
    } catch {
      // Ignore missing roots.
    }
  }

  const violations = [];

  for (const filePath of files) {
    const rule = getRule(filePath);
    if (!rule) continue;

    const absolutePath = path.join(repoRoot, filePath);
    const source = await readFile(absolutePath, "utf8");
    const lineCount = countLines(source);

    if (lineCount > rule.maxLines) {
      violations.push({
        filePath,
        label: rule.label,
        lineCount,
        maxLines: rule.maxLines,
      });
    }
  }

  return violations.sort((left, right) => right.lineCount - left.lineCount);
}

const violations = await getViolations();

if (!violations.length) {
  console.log("File size check passed.");
  process.exit(0);
}

console.error("File size check failed:");
for (const violation of violations) {
  console.error(
    ` - ${violation.filePath}: ${violation.lineCount} lines (${violation.label} limit ${violation.maxLines})`,
  );
}
console.error("Split files by responsibility before adding more code.");
process.exit(1);
