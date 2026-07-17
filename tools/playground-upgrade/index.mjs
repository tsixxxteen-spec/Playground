#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const command = process.argv[2] ?? "status";
const patchId = process.argv[3];

const stateDir = path.join(root, ".playground");
const backupRoot = path.join(root, ".playground-backups");
const manifestPath = path.join(stateDir, "upgrade-state.json");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function write(file, contents) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function loadManifest() {
  if (!fs.existsSync(manifestPath)) {
    return { engineVersion: "1.0.0", projectVersion: "0.14.0", installedPatches: [] };
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function saveManifest(manifest) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function findMatchingBracket(source, openIndex, openChar = "[", closeChar = "]") {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = openIndex; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        i += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      i += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      i += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  throw new Error(`Unmatched ${openChar} in source file.`);
}

function ensureNamedImport(file, symbol, modulePath) {
  let source = read(file);
  const escaped = modulePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `import\\s*\\{([\\s\\S]*?)\\}\\s*from\\s*["']${escaped}["'];?`
  );
  const match = source.match(pattern);

  if (!match) {
    source = `import { ${symbol} } from "${modulePath}";\n` + source;
    write(file, source);
    return;
  }

  const names = match[1]
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (names.includes(symbol)) return;

  names.push(symbol);
  names.sort((a, b) => a.localeCompare(b));

  const replacement =
    "import {\n  " +
    names.join(",\n  ") +
    `,\n} from "${modulePath}";`;

  source = source.replace(match[0], replacement);
  write(file, source);
}

function ensureExportLine(file, line) {
  let source = read(file);
  if (source.includes(line)) return;
  source = source.trimEnd() + "\n" + line + "\n";
  write(file, source);
}

function insertRegistryEntry(file, registryName, entryId, entrySource) {
  let source = read(file);
  if (source.includes(`id: "${entryId}"`) || source.includes(`id:"${entryId}"`)) return;

  const declaration = new RegExp(`\\bconst\\s+${registryName}\\s*=\\s*\\[`);
  const match = declaration.exec(source);

  if (!match) {
    throw new Error(`Could not locate registry declaration: const ${registryName} = [`);
  }

  const openIndex = source.indexOf("[", match.index);
  const closeIndex = findMatchingBracket(source, openIndex);
  const before = source.slice(0, openIndex + 1);
  const inside = source.slice(openIndex + 1, closeIndex);
  const after = source.slice(closeIndex);

  const normalizedEntry = "\n" + entrySource.trim() + "\n";
  const separator = inside.trim().length ? "" : "";

  source = before + normalizedEntry + separator + inside + after;
  write(file, source);
}

function appendCssBlock(file, marker, css) {
  let source = read(file);
  const start = `/* ===== ${marker} ===== */`;
  const end = `/* ===== END ${marker} ===== */`;

  if (source.includes(start)) return;

  source =
    source.trimEnd() +
    "\n\n" +
    start +
    "\n" +
    css.trim() +
    "\n" +
    end +
    "\n";

  write(file, source);
}

function updatePackageScript(name, value) {
  const packagePath = path.join(root, "package.json");
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  pkg.scripts ??= {};
  pkg.scripts[name] = value;
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");
}

function snapshot(files, patchName) {
  const backupDir = path.join(backupRoot, `${patchName}-${timestamp()}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const metadata = { files: [] };

  for (const file of files) {
    const absolute = path.join(root, file);
    const destination = path.join(backupDir, file);
    const didExist = fs.existsSync(absolute);

    metadata.files.push({ file, didExist });

    if (didExist) {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(absolute, destination);
    }
  }

  fs.writeFileSync(
    path.join(backupDir, "backup.json"),
    JSON.stringify(metadata, null, 2) + "\n"
  );

  return backupDir;
}

function restore(backupDir) {
  const metadata = JSON.parse(
    fs.readFileSync(path.join(backupDir, "backup.json"), "utf8")
  );

  for (const item of metadata.files) {
    const target = path.join(root, item.file);
    const backup = path.join(backupDir, item.file);

    if (item.didExist) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(backup, target);
    } else if (fs.existsSync(target)) {
      fs.rmSync(target, { force: true });
    }
  }
}

function runBuild() {
  const result = spawnSync("npm", ["run", "build"], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error("npm run build failed.");
  }
}

async function loadPatch(id) {
  const patchFile = path.join(root, "tools/playground-upgrade/patches", `${id}.mjs`);
  if (!fs.existsSync(patchFile)) {
    throw new Error(`Unknown patch: ${id}`);
  }

  const module = await import(pathToFileURL(patchFile).href + `?v=${Date.now()}`);
  return module.default;
}

async function applyPatch(id) {
  const patch = await loadPatch(id);
  const manifest = loadManifest();

  if (manifest.installedPatches.includes(patch.id)) {
    console.log(`${patch.id} is already installed.`);
    return;
  }

  for (const dependency of patch.requires ?? []) {
    if (!manifest.installedPatches.includes(dependency)) {
      throw new Error(`${patch.id} requires ${dependency}.`);
    }
  }

  const backupDir = snapshot(
    [...new Set([...patch.files, ".playground/upgrade-state.json", "package.json"])],
    patch.id
  );

  console.log(`Applying ${patch.id}: ${patch.description}`);
  console.log(`Backup: ${backupDir}`);

  try {
    await patch.apply({
      root,
      read,
      write,
      exists,
      ensureNamedImport,
      ensureExportLine,
      insertRegistryEntry,
      appendCssBlock,
      updatePackageScript,
    });

    for (const check of patch.verify ?? []) {
      const source = read(check.file);
      if (!source.includes(check.contains)) {
        throw new Error(
          `Verification failed: ${check.file} does not contain ${check.contains}`
        );
      }
    }

    runBuild();

    manifest.engineVersion = "1.0.0";
    manifest.projectVersion = patch.projectVersion ?? manifest.projectVersion;
    manifest.installedPatches.push(patch.id);
    saveManifest(manifest);

    console.log(`\nSUCCESS: ${patch.id} installed.`);
  } catch (error) {
    console.error(`\nERROR: ${error.message}`);
    console.error("Restoring previous working files...");
    restore(backupDir);
    console.error("Restore complete.");
    console.error(`Backup retained at: ${backupDir}`);
    process.exitCode = 1;
  }
}

async function main() {
  if (command === "status") {
    console.log(JSON.stringify(loadManifest(), null, 2));
    return;
  }

  if (command === "apply") {
    if (!patchId) throw new Error("Usage: npm run playground:upgrade -- apply <patch-id>");
    await applyPatch(patchId);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
