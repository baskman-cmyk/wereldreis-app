import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const required = [
  "index.html",
  "package.json",
  "public/manifest.webmanifest",
  "public/sw.js",
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "src/main.tsx",
  "src/App.tsx",
  "src/components/BudgetView.tsx",
  "src/components/ExcelImportModal.tsx",
  "src/components/MoreView.tsx",
  "scripts/test-excel-import.ts",
];

await Promise.all(required.map((file) => access(file)));

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const manifest = JSON.parse(await readFile("public/manifest.webmanifest", "utf8"));
const html = await readFile("index.html", "utf8");
const sw = await readFile("public/sw.js", "utf8");
const releaseNotes = await readFile("RELEASE_NOTES.md", "utf8");

if (packageJson.name !== "wereldreis-dashboard") throw new Error("De pakketnaam is onjuist.");
if (!/^\d+\.\d+\.\d+$/.test(packageJson.version)) throw new Error("Het versienummer is niet semantisch.");
if (manifest.name !== "Wereldreis Dashboard" || manifest.display !== "standalone") {
  throw new Error("De web-appmanifestconfiguratie is onvolledig.");
}
if (!html.includes("Wereldreis Dashboard") || !html.includes("manifest.webmanifest")) {
  throw new Error("index.html bevat niet de juiste releasegegevens.");
}
if (!sw.includes(`wereldreis-app-v${packageJson.version}`)) {
  throw new Error("De serviceworker-cacheversie loopt niet gelijk met package.json.");
}
if (!releaseNotes.startsWith(`# Release ${packageJson.version}`)) {
  throw new Error("De release notes lopen niet gelijk met package.json.");
}
if (!packageJson.scripts?.check?.includes("test:imports")) {
  throw new Error("De volledige releasecontrole voert de importregressies niet uit.");
}
if (!sw.includes("SKIP_WAITING")) throw new Error("De serviceworker ondersteunt geen gecontroleerde app-update.");

const pngDimensions = async (file) => {
  const bytes = await readFile(file);
  if (bytes.toString("ascii", 1, 4) !== "PNG") throw new Error(`${file} is geen geldig PNG-bestand.`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};
const icon192 = await pngDimensions("public/icons/icon-192.png");
const icon512 = await pngDimensions("public/icons/icon-512.png");
if (icon192.width !== 192 || icon192.height !== 192 || icon512.width !== 512 || icon512.height !== 512) {
  throw new Error("De PWA-pictogrammen hebben onjuiste afmetingen.");
}

const collectFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    files.push(...(entry.isDirectory() ? await collectFiles(full) : [full]));
  }
  return files;
};
const sourceFiles = await collectFiles("src");
const sourceText = (await Promise.all(sourceFiles.filter((file) => /\.(ts|tsx|css)$/.test(file)).map((file) => readFile(file, "utf8")))).join("\n");
for (const forbidden of ["My Google AI Studio App", "Gemini 3.6 Flash", "Mark, Laura, Lucas en Emma"]) {
  if (sourceText.includes(forbidden) || html.includes(forbidden)) throw new Error(`Oude placeholder aangetroffen: ${forbidden}`);
}
if (sourceText.includes("GEMINI_API_KEY")) throw new Error("De server-API-sleutel wordt in de browsercode genoemd.");

console.log(`Releasecontrole geslaagd voor Wereldreis Dashboard v${packageJson.version}.`);
