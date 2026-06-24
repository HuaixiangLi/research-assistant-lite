import { copyFileSync, mkdirSync, readFileSync, rmSync, cpSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const outDir = join(root, "dist");
const stageDir = join(outDir, "xpi-stage");
const outFile = join(outDir, "research-assistant-lite.xpi");
const versionedOutFile = join(outDir, "research-assistant-lite-0.3.6.xpi");
const included = ["manifest.json", "install.rdf", "bootstrap.js", "src", "locale", "README.md"];
const bundledScripts = [
  "src/classifier/rules.js",
  "src/rules/ruleLoader.js",
  "src/classifier/classifier.js",
  "src/explain/explanationEngine.js",
  "src/search/rankingEngine.js",
  "src/overview/researchOverview.js",
  "src/duplicates/duplicateDetector.js",
  "src/core/zoteroAPI.js",
  "src/hooks/onItemAdded.js",
  "src/core/batchProcessor.js",
  "src/ui/sidebar.jsx"
];

mkdirSync(outDir, { recursive: true });
rmSync(stageDir, { recursive: true, force: true });
rmSync(outFile, { force: true });
rmSync(versionedOutFile, { force: true });
rmSync(join(outDir, "research-assistant-lite-0.3.5.xpi"), { force: true });
rmSync(join(outDir, "research-assistant-lite-0.3.4.xpi"), { force: true });
rmSync(join(outDir, "research-assistant-lite-0.3.3.xpi"), { force: true });
rmSync(join(outDir, "research-assistant-lite-0.3.2.xpi"), { force: true });
rmSync(join(outDir, "research-assistant-lite-0.3.1.xpi"), { force: true });
rmSync(join(outDir, "research-assistant-lite-0.3.0.xpi"), { force: true });
rmSync(join(outDir, "research-assistant-lite-0.2.9.xpi"), { force: true });
rmSync(join(outDir, "research-assistant-lite-0.2.8.xpi"), { force: true });
rmSync(join(outDir, "research-assistant-lite-0.2.7.xpi"), { force: true });
rmSync(join(outDir, "research-assistant-lite-0.2.6.xpi"), { force: true });
rmSync(join(outDir, "research-assistant-lite-0.2.5.xpi"), { force: true });
rmSync(join(outDir, "research-assistant-lite-0.2.4.xpi"), { force: true });
rmSync(join(outDir, "research-assistant-lite-0.2.3.xpi"), { force: true });
rmSync(join(outDir, "zotero-paper-organizer.xpi"), { force: true });
mkdirSync(stageDir, { recursive: true });

for (const entry of included) {
  cpSync(join(root, entry), join(stageDir, entry), { recursive: true });
}

const bundledBootstrap = [
  readFileSync(join(root, "bootstrap.js"), "utf8"),
  "",
  "ZoteroPaperOrganizerBootstrap.bundled = true;",
  "",
  "/* Bundled source modules for Zotero versions that cannot loadSubScript() from jar:file XPI paths. */",
  ...bundledScripts.map(script => [
    `/* BEGIN ${script} */`,
    readFileSync(join(root, script), "utf8"),
    `/* END ${script} */`
  ].join("\n"))
].join("\n\n");

writeFileSync(join(stageDir, "bootstrap.js"), bundledBootstrap);

const psOutFile = outFile.replace(/'/g, "''");
const psStageDir = stageDir.replace(/'/g, "''");

execFileSync("powershell.exe", [
  "-NoProfile",
  "-Command",
  `
    & {
    param([string] $zipPath, [string] $stagePath)
    $ErrorActionPreference = 'Stop';
    Add-Type -AssemblyName System.IO.Compression;
    Add-Type -AssemblyName System.IO.Compression.FileSystem;
    if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force; }
    $zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create);
    try {
      function Add-Entry([string] $source, [string] $entryName) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
          $zip,
          $source,
          $entryName.Replace('\\\\', '/'),
          [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null;
      }

      Add-Entry (Join-Path $stagePath 'manifest.json') 'manifest.json';
      Add-Entry (Join-Path $stagePath 'install.rdf') 'install.rdf';
      Add-Entry (Join-Path $stagePath 'bootstrap.js') 'bootstrap.js';
      Get-ChildItem -LiteralPath (Join-Path $stagePath 'src') -Recurse -File |
        Sort-Object FullName |
        ForEach-Object {
          $relative = $_.FullName.Substring($stagePath.Length + 1).Replace('\\\\', '/');
          Add-Entry $_.FullName $relative;
        };
      Get-ChildItem -LiteralPath (Join-Path $stagePath 'locale') -Recurse -File |
        Sort-Object FullName |
        ForEach-Object {
          $relative = $_.FullName.Substring($stagePath.Length + 1).Replace('\\\\', '/');
          Add-Entry $_.FullName $relative;
        };
      Add-Entry (Join-Path $stagePath 'README.md') 'README.md';
    }
    finally {
      $zip.Dispose();
    }
    } '${psOutFile}' '${psStageDir}'
  `
], {
  cwd: stageDir,
  stdio: "inherit"
});

rmSync(stageDir, { recursive: true, force: true });
copyFileSync(outFile, versionedOutFile);

console.log(`Created ${outFile}`);
console.log(`Created ${versionedOutFile}`);
