/**
 * Audit which shadcn/ui primitive files in src/components/ui/ are
 * actually imported by application code (anything outside ui/).
 *
 * Usage: node scripts/audit-ui-usage.mjs
 *
 * Prints two lists:
 *   - USED: ui files imported by at least one non-ui file
 *   - UNUSED: ui files that no non-ui file imports (candidates for deletion)
 *
 * Then prints the @radix-ui/react-* packages that the unused files
 * depend on, so we can also prune those from package.json.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const UI_DIR = join(ROOT, "src", "components", "ui");
const SRC_DIR = join(ROOT, "src");

function listUiFiles() {
  return readdirSync(UI_DIR)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => f.replace(/\.tsx$/, ""));
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "ui") continue; // skip self
      out.push(...walk(full));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

function scanAppImports() {
  const files = walk(SRC_DIR);
  const imports = new Set();
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    // Match: from "@/components/ui/<name>" or from "@/components/ui/<name>/sub"
    const re = /from\s+['"]@\/components\/ui\/([a-zA-Z0-9_-]+)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      imports.add(m[1]);
    }
  }
  return imports;
}

const all = listUiFiles();
const used = scanAppImports();
const unused = all.filter((f) => !used.has(f));

console.log(`USED (${used.size}):`);
for (const u of [...used].sort()) console.log(`  ${u}`);
console.log();
console.log(`UNUSED (${unused.length}):`);
for (const u of unused.sort()) console.log(`  ${u}`);

// For each unused file, scan its imports to find @radix-ui/react-* deps
// that only it would have brought in.
console.log();
console.log("--- Unused-file @radix-ui/react-* deps ---");
const radixDeps = new Set();
for (const f of unused) {
  const text = readFileSync(join(UI_DIR, `${f}.tsx`), "utf8");
  const re = /from\s+['"](@radix-ui\/react-[a-z-]+)['"]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    radixDeps.add(m[1]);
  }
}
console.log(`Unused primitives depend on:`, [...radixDeps].sort().join(", "));

// Now find which @radix-ui/react-* packages are still needed by USED primitives.
const usedRadixDeps = new Set();
for (const f of used) {
  const path = join(UI_DIR, `${f}.tsx`);
  let text;
  try { text = readFileSync(path, "utf8"); } catch { continue; }
  const re = /from\s+['"](@radix-ui\/react-[a-z-]+)['"]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    usedRadixDeps.add(m[1]);
  }
}
const removableRadix = [...radixDeps].filter((d) => !usedRadixDeps.has(d));
console.log(`Removable @radix-ui deps:`, removableRadix.sort().join(", "));
