require("dotenv").config();
const connectDB = require("../config/db");
const Biomarker = require("../models/biomarker");

const normKey = (v = "") =>
  String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

// Reproduce buildBiomarkerLookup
const buildLookup = (biomarkers) => {
  const map = new Map();
  for (const bm of biomarkers) {
    const names = [bm.name, ...(bm.aliases || [])].filter(Boolean);
    for (const n of names) {
      const key = normKey(n);
      if (key && !map.has(key)) map.set(key, bm.name);
    }
  }
  return map;
};

const knownNames = new Set();

// Reproduce splitMergedLineWithNames behavior for the exact merged line
const testMergedLine =
  "LDL Cholesterol 145 mg/dL Less than 100 HDL Cholesterol 42 mg/dL Greater than 40 Total Cholesterol 220 mg/dL Less than 200 Triglycerides 180 mg/dL Less than 150";

connectDB().then(async () => {
  const bms = await Biomarker.find({ isActive: true }).select("name aliases").lean();
  for (const bm of bms) {
    knownNames.add(bm.name.toLowerCase().trim());
    for (const alias of bm.aliases || []) {
      if (alias) knownNames.add(alias.toLowerCase().trim());
    }
  }

  const lookup = buildLookup(bms);

  // Filter to split anchor names
  const sortedNames = Array.from(knownNames)
    .filter((n) => n.length >= 4 || /^[a-z]{2,4}$/.test(n))
    .sort((a, b) => b.length - a.length);

  console.log("Testing merged line:", JSON.stringify(testMergedLine));
  
  // Find all split positions
  const splitPositions = new Set();
  for (const name of sortedNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRe = new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, "gi");
    let m;
    while ((m = nameRe.exec(testMergedLine)) !== null) {
      const pos = m.index;
      if (pos === 0) continue;
      if (testMergedLine[pos - 1] !== " ") continue;
      const before = testMergedLine.slice(0, pos).trimEnd();
      if (/\d/.test(before.slice(-1)) || /[a-zA-Z/%µμ]/.test(before.slice(-1))) {
        console.log(`  Split at pos=${pos}: name=${JSON.stringify(name)} match=${JSON.stringify(m[0])}`);
        splitPositions.add(pos);
      }
    }
  }

  const positions = [0, ...Array.from(splitPositions).sort((a, b) => a - b), testMergedLine.length];
  const parts = [];
  for (let i = 0; i < positions.length - 1; i++) {
    const part = testMergedLine.slice(positions[i], positions[i + 1]).trim();
    if (part) parts.push(part);
  }
  console.log("\nSplit parts:");
  for (const p of parts) {
    const key = normKey(p.split(" ").slice(0, 3).join(" "));
    console.log(" ", JSON.stringify(p), "-> first3words key:", JSON.stringify(key), "-> lookup:", lookup.get(key) || "NOT FOUND");
  }
  process.exit(0);
}).catch((e) => { console.error(e.message); process.exit(1); });
