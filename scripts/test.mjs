import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = {
  globalThis: {},
  console,
  XMLHttpRequest: class {}
};
context.globalThis = context;

vm.createContext(context);

for (const file of [
  "src/classifier/rules.js",
  "src/rules/ruleLoader.js",
  "src/classifier/classifier.js",
  "src/explain/explanationEngine.js",
  "src/search/rankingEngine.js",
  "src/overview/researchOverview.js",
  "src/duplicates/duplicateDetector.js"
]) {
  vm.runInContext(readFileSync(file, "utf8"), context, { filename: file });
}

const rules = JSON.parse(readFileSync("src/rules/rules.json", "utf8"));
context.ZoteroPaperOrganizer.Rules.applyRuleConfig(rules);

const { classifyPaper, classificationTags } = context.ZoteroPaperOrganizer.Classifier;
const { buildExplanations, formatExplanation } = context.ZoteroPaperOrganizer.Explain.ExplanationEngine;
const { rankItems, scoreItem } = context.ZoteroPaperOrganizer.Search.RankingEngine;
const { buildOverview } = context.ZoteroPaperOrganizer.Overview.ResearchOverview;
const { detectDuplicates, titleSimilarity, normalizeDOI } = context.ZoteroPaperOrganizer.Duplicates.DuplicateDetector;

/**
 * Convert arrays created inside the VM context into this realm before using
 * Node's strict deep equality checks.
 *
 * @template T
 * @param {T[]} value
 * @returns {T[]}
 */
function localArray(value) {
  return Array.from(value);
}

assert.deepEqual(
  localArray(classifyPaper(
    "Review of Ni catalyst stability for propane dehydrogenation and CO2 conversion",
    "The catalyst stability remains a key issue in PDH."
  )).map(result => result.tag).sort(),
  ["CO2 hydrogenation", "Catalyst stability", "Ni catalyst", "PDH", "review"].sort()
);

assert.deepEqual(
  localArray(classificationTags(classifyPaper("A study of alumina supports", "No matching keywords."))),
  []
);

assert.deepEqual(
  localArray(classificationTags(classifyPaper("Nickel catalysts for carbon dioxide hydrogenation", ""))),
  ["CO2 hydrogenation", "Ni catalyst"]
);

const ranked = /** @type {Array<{ tag: string, score: number }>} */ (
  localArray(classifyPaper("PDH over nickel catalysts", "propane dehydrogenation stability"))
);
assert.equal(ranked[0].tag, "PDH");
assert.equal(typeof ranked[0].score, "number");
assert.ok(ranked[0].score > 0);

const explanations = buildExplanations(classifyPaper(
  "Propane dehydrogenation over Ni catalysts",
  "Catalyst stability is discussed."
));
const pdhExplanation = explanations.find(explanation => explanation.tag === "PDH");
assert.equal(pdhExplanation.ruleName, "PDH");
assert.deepEqual(localArray(pdhExplanation.matchedKeywords), ["propane dehydrogenation"]);
assert.equal(pdhExplanation.sourceField, "title");
assert.match(formatExplanation(pdhExplanation), /Matched rule: PDH/);

const searchResults = rankItems([
  {
    id: 1,
    title: "PDH on nickel catalysts",
    abstract: "Short abstract",
    dateAdded: "2026-01-01",
    tags: ["PDH", "Ni catalyst"]
  },
  {
    id: 2,
    title: "General catalysis",
    abstract: "This abstract discusses PDH in detail.",
    dateAdded: "2026-06-01",
    tags: []
  },
  {
    id: 3,
    title: "Older tagged paper",
    abstract: "No keyword",
    dateAdded: "2025-01-01",
    tags: ["PDH"]
  }
], { query: "PDH", limit: 3, now: 1 });

assert.equal(searchResults[0].id, 1);
assert.ok(scoreItem(searchResults[0], { query: "PDH", now: 1 }) > scoreItem(searchResults[1], { query: "PDH", now: 1 }));

const overview = buildOverview([
  { tags: ["PDH"], dateAdded: "2026-06-24 10:00:00" },
  { tags: ["PDH", "Ni catalyst"], dateAdded: "2026-06-23 10:00:00" },
  { tags: ["CO2 hydrogenation"], dateAdded: "2026-01-01 10:00:00" }
], ["PDH", "CO2 hydrogenation", "Ni catalyst"], new Date("2026-06-24T12:00:00Z"));

assert.deepEqual(JSON.parse(JSON.stringify(overview.tagCounts)), [
  { tag: "PDH", count: 2 },
  { tag: "CO2 hydrogenation", count: 1 },
  { tag: "Ni catalyst", count: 1 }
]);
assert.equal(overview.recent7DayTotal, 2);
assert.equal(overview.topDirection.tag, "PDH");

assert.equal(normalizeDOI("https://doi.org/10.1000/ABC"), "10.1000/abc");
assert.ok(titleSimilarity("Propane dehydrogenation over nickel catalyst", "Propane dehydrogenation over nickel catalysts") > 0.9);
const duplicates = detectDuplicates([
  { id: 1, title: "A study on PDH", doi: "10.1000/test" },
  { id: 2, title: "Completely different title", doi: "https://doi.org/10.1000/test" },
  { id: 3, title: "Propane dehydrogenation over nickel catalyst", doi: "" },
  { id: 4, title: "Propane dehydrogenation over nickel catalysts", doi: "" }
]);
assert.equal(duplicates.length, 2);

console.log("Research Assistant Lite tests passed");
