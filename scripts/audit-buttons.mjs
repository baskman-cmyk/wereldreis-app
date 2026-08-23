import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const files = fs.readdirSync("src/components").filter((file) => file.endsWith(".tsx"));
const problems = [];
let buttonCount = 0;

for (const file of files) {
  const fullPath = path.join("src/components", file);
  const sourceText = fs.readFileSync(fullPath, "utf8");
  const source = ts.createSourceFile(fullPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const inspect = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (node.tagName.getText(source) === "button") {
        buttonCount += 1;
        const attributes = new Map(node.attributes.properties.filter(ts.isJsxAttribute).map((attribute) => [attribute.name.getText(source), attribute.initializer?.getText(source) || ""]));
        const type = attributes.get("type") || "";
        if (!attributes.has("onClick") && !attributes.has("onPointerDown") && !type.includes("submit")) {
          const location = source.getLineAndCharacterOfPosition(node.getStart(source));
          problems.push(`${fullPath}:${location.line + 1}`);
        }
      }
    }
    ts.forEachChild(node, inspect);
  };
  inspect(source);
}

if (problems.length) throw new Error(`Knoppen zonder actie gevonden:\n${problems.join("\n")}`);
console.log(`Knoppenscan geslaagd: ${buttonCount} knoppen hebben een klikactie of verzenden een formulier.`);
