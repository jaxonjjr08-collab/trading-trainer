#!/usr/bin/env node
/**
 * v2.2 — Splice HTF data into lib/scenarios-real.ts using htf-output.json.
 * For each scenario:
 *   1. Insert the HTF const block right before its source candle const.
 *   2. Add higherTimeframe / higherTimeframeCandles / higherTimeframeDecisionIndex
 *      fields inside the matching buildRealScenario call.
 *
 * Idempotent: skips scenarios that already have HTF data wired.
 */

import * as fs from "fs";
import * as path from "path";

type Entry = {
  id: string;
  constName: string;
  htfConstBody: string;
  htfDecisionIndex: number;
  htfTimeframeLabel: string;
};

const file = path.join(__dirname, "..", "lib", "scenarios-real.ts");
const original = fs.readFileSync(file, "utf8");
let text = original;

const entries: Entry[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "htf-output.json"), "utf8")
);

let constsInserted = 0;
let wiringInserted = 0;
let skipped = 0;

for (const e of entries) {
  // Step 1: insert const block before the source const if not already present.
  const htfConstMarker = `const ${e.constName}_HTF: Candle[]`;
  if (!text.includes(htfConstMarker)) {
    const sourceConstStart = text.indexOf(`const ${e.constName}: Candle[]`);
    if (sourceConstStart === -1) {
      process.stderr.write(`skip ${e.id}: source const ${e.constName} not found\n`);
      continue;
    }
    // Walk back to the start of the comment block above the const (the // header line).
    // The const is preceded by 1-2 comment lines like:
    //   // SYMBOL · granularity Xs · N candles
    //   // YYYY-MM-DD → YYYY-MM-DD
    // For v1.9 scenarios these comments may be absent; insert right before the const line.
    let insertAt = sourceConstStart;
    // Move back over leading comment lines (up to 2).
    let probe = sourceConstStart - 1;
    while (probe > 0 && text[probe] === "\n") probe--;
    let commentLines = 0;
    while (probe > 0 && commentLines < 2) {
      // Walk back to start of line.
      let lineStart = probe;
      while (lineStart > 0 && text[lineStart - 1] !== "\n") lineStart--;
      const line = text.slice(lineStart, probe + 1);
      if (line.startsWith("//")) {
        insertAt = lineStart;
        commentLines++;
        probe = lineStart - 1;
        while (probe > 0 && text[probe] === "\n") probe--;
      } else {
        break;
      }
    }
    text = text.slice(0, insertAt) + e.htfConstBody + "\n\n" + text.slice(insertAt);
    constsInserted++;
  } else {
    skipped++;
  }

  // Step 2: wire the three HTF fields into the buildRealScenario({ id: "...", ... }) call.
  // We find the call by its id and append the fields right before the closing }), of the call.
  const idMarker = `id: "${e.id}",`;
  const idIdx = text.indexOf(idMarker);
  if (idIdx === -1) {
    process.stderr.write(`skip wiring ${e.id}: id not found\n`);
    continue;
  }
  // Find the buildRealScenario({ start before this id.
  const callStart = text.lastIndexOf("buildRealScenario({", idIdx);
  if (callStart === -1) {
    process.stderr.write(`skip wiring ${e.id}: buildRealScenario({ not found\n`);
    continue;
  }
  // Find the matching closing }), by counting braces from callStart + "buildRealScenario(".length
  const openIdx = callStart + "buildRealScenario(".length;  // points at '{'
  let depth = 0;
  let closeIdx = -1;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        closeIdx = i;
        break;
      }
    }
  }
  if (closeIdx === -1) {
    process.stderr.write(`skip wiring ${e.id}: matching close not found\n`);
    continue;
  }
  const callBlock = text.slice(callStart, closeIdx + 1);
  if (callBlock.includes("higherTimeframeCandles")) {
    skipped++;
    continue;
  }
  // Insert just before the closing brace (which is at closeIdx). Find the last newline
  // before the closing brace so we preserve indentation.
  let insertionPoint = closeIdx;
  // Walk back from closeIdx to find the newline that ends the last field.
  let nl = closeIdx - 1;
  while (nl > callStart && text[nl] !== "\n") nl--;
  insertionPoint = nl + 1;
  const wiringLines =
    `    higherTimeframe: "${e.htfTimeframeLabel}",\n` +
    `    higherTimeframeCandles: ${e.constName}_HTF,\n` +
    `    higherTimeframeDecisionIndex: ${e.htfDecisionIndex},\n`;
  text = text.slice(0, insertionPoint) + wiringLines + text.slice(insertionPoint);
  wiringInserted++;
}

if (text !== original) {
  fs.writeFileSync(file, text);
  process.stderr.write(`Done. consts inserted: ${constsInserted}, wirings inserted: ${wiringInserted}, skipped: ${skipped}\n`);
} else {
  process.stderr.write(`No changes. (skipped: ${skipped})\n`);
}
