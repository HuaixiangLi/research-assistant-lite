(function initExplanationEngine(global) {
  "use strict";

  const g = /** @type {any} */ (global);
  g.ZoteroPaperOrganizer = g.ZoteroPaperOrganizer || {};
  const app = /** @type {any} */ (g.ZoteroPaperOrganizer);
  app.Explain = app.Explain || {};

  const explanationByItemID = new Map();

  /**
   * @param {Array<{ tag: string, score: number, ruleName: string, matchedKeywords: string[], sourceField: string, matches: Array<{ keyword: string, field: string, ruleName: string }> }>} results
   * @returns {Array<{ tag: string, score: number, ruleName: string, matchedKeywords: string[], sourceField: "title" | "abstract", matches: Array<{ keyword: string, field: "title" | "abstract", ruleName: string }> }>}
   */
  function buildExplanations(results) {
    return results.map(result => ({
      tag: result.tag,
      score: result.score,
      ruleName: result.ruleName,
      matchedKeywords: [...new Set(result.matchedKeywords || [])],
      sourceField: result.sourceField === "abstract" ? "abstract" : "title",
      matches: (result.matches || []).map(match => ({
        keyword: match.keyword,
        field: match.field === "abstract" ? "abstract" : "title",
        ruleName: match.ruleName || result.ruleName
      }))
    }));
  }

  /**
   * @param {number} itemID
   * @param {Array<{ tag: string, score: number, ruleName: string, matchedKeywords: string[], sourceField: string, matches: Array<{ keyword: string, field: string, ruleName: string }> }>} results
   * @returns {Array<{ tag: string, score: number, ruleName: string, matchedKeywords: string[], sourceField: "title" | "abstract", matches: Array<{ keyword: string, field: "title" | "abstract", ruleName: string }> }>}
   */
  function storeItemExplanations(itemID, results) {
    const explanations = buildExplanations(results);
    explanationByItemID.set(itemID, explanations);
    return explanations;
  }

  /**
   * @param {number} itemID
   * @returns {Array<{ tag: string, score: number, ruleName: string, matchedKeywords: string[], sourceField: "title" | "abstract", matches: Array<{ keyword: string, field: "title" | "abstract", ruleName: string }> }>}
   */
  function getItemExplanations(itemID) {
    return explanationByItemID.get(itemID) || [];
  }

  /**
   * @param {number} itemID
   * @param {string} tag
   * @returns {{ tag: string, score: number, ruleName: string, matchedKeywords: string[], sourceField: "title" | "abstract", matches: Array<{ keyword: string, field: "title" | "abstract", ruleName: string }> } | null}
   */
  function getTagExplanation(itemID, tag) {
    return getItemExplanations(itemID).find(explanation => explanation.tag === tag) || null;
  }

  /**
   * @param {{ tag: string, score: number, ruleName: string, matchedKeywords: string[], sourceField: "title" | "abstract" } | null} explanation
   * @returns {string}
   */
  function formatExplanation(explanation) {
    if (!explanation) {
      return "No matching rule explanation available.";
    }

    return [
      `Matched rule: ${explanation.ruleName}`,
      `Matched keyword: "${explanation.matchedKeywords.join('", "')}"`,
      `Field: ${explanation.sourceField}`,
      `Score: ${explanation.score.toFixed(2)}`
    ].join("\n");
  }

  app.Explain.ExplanationEngine = {
    buildExplanations,
    storeItemExplanations,
    getItemExplanations,
    getTagExplanation,
    formatExplanation
  };
})(/** @type {any} */ (globalThis));
