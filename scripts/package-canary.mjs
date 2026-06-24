import { mkdirSync, rmSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const outDir = join(root, "dist");
const stageDir = join(outDir, "canary-stage");
const outFile = join(outDir, "zotero-compatibility-canary.xpi");
const versionedOutFile = join(outDir, "zotero-compatibility-canary-0.0.2.xpi");

mkdirSync(outDir, { recursive: true });
rmSync(stageDir, { recursive: true, force: true });
rmSync(outFile, { force: true });
rmSync(versionedOutFile, { force: true });
mkdirSync(stageDir, { recursive: true });

for (const entry of ["manifest.json", "bootstrap.js"]) {
  cpSync(join(root, "canary", entry), join(stageDir, entry));
}

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
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $stagePath 'manifest.json'), 'manifest.json', [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null;
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $stagePath 'bootstrap.js'), 'bootstrap.js', [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null;
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
cpSync(outFile, versionedOutFile);
console.log(`Created ${outFile}`);
console.log(`Created ${versionedOutFile}`);
