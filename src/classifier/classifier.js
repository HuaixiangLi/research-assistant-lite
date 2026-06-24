/* global ZoteroPaperOrganizer */

(function initClassifier(global) {
  "use strict";

  const g = /** @type {any} */ (global);
  g.ZoteroPaperOrganizer = g.ZoteroPaperOrganizer || {};
  const app = /** @type {any} */ (g.ZoteroPaperOrganizer);
  app.Classifier = app.Classifier || {};

  const FIELD_WEIGHTS = {
    title: 3,
    abstract: 2
  };

  /**
   * @param {unknown} value
   * @returns {string}
   */
  function normalize(value) {
    return String(value || "").toLocaleLowerCase();
  }

  /**
   * @param {string} haystack
   * @param {string} keyword
   * @param {boolean} wordBoundary
   * @returns {boolean}
   */
  function includesKeyword(haystack, keyword, wordBoundary) {
    const normalizedKeyword = normalize(keyword);

    if (!normalizedKeyword) {
      return false;
    }

    if (!wordBoundary) {
      return haystack.includes(normalizedKeyword);
    }

    const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
  }

  /**
   * Classify one paper by matching title and abstract against local rules.
   *
   * @param {string} title
   * @param {string} abstract
   * @param {Array<{ id: string, tag: string, name: string, keywords: string[], weight: number, fields: string[], wordBoundary: boolean }>} [rules]
   * @returns {Array<{ tag: string, score: number, ruleName: string, matchedKeywords: string[], sourceField: string, matches: Array<{ keyword: string, field: string, ruleName: string }> }>}
   */
  function classifyPaper(title, abstract, rules = app.Rules.getRules()) {
    const fields = {
      title: normalize(title),
      abstract: normalize(abstract)
    };
    const results = [];

    for (const rule of rules) {
      const matches = [];
      const matchedKeywordSet = new Set();
      let rawScore = 0;

      for (const keyword of rule.keywords) {
        for (const fieldName of rule.fields) {
          const fieldText = fields[fieldName] || "";

          if (includesKeyword(fieldText, keyword, Boolean(rule.wordBoundary))) {
            matches.push({
              keyword,
              field: fieldName,
              ruleName: rule.name
            });
            matchedKeywordSet.add(keyword);
            rawScore += FIELD_WEIGHTS[fieldName] || 1;
          }
        }
      }

      if (matches.length) {
        const matchedKeywords = [...matchedKeywordSet];
        const keywordCoverage = matchedKeywords.length / Math.max(rule.keywords.length, 1);
        const fieldStrength = Math.min(1, rawScore / 5);
        const weightedScore = (fieldStrength * 0.7 + keywordCoverage * 0.3)
          * (0.8 + Math.min(Math.max(rule.weight, 1), 5) * 0.1);

        results.push({
          tag: rule.tag,
          score: Number(Math.min(1, weightedScore).toFixed(2)),
          ruleName: rule.name,
          matchedKeywords,
          sourceField: matches[0].field,
          matches
        });
      }
    }

    return results.sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag));
  }

  /**
   * @param {Array<{ tag: string }>} results
   * @returns {string[]}
   */
  function classificationTags(results) {
    return results.map(result => result.tag);
  }

  app.Classifier.FIELD_WEIGHTS = FIELD_WEIGHTS;
  app.Classifier.normalize = normalize;
  app.Classifier.includesKeyword = includesKeyword;
  app.Classifier.classifyPaper = classifyPaper;
  app.Classifier.classificationTags = classificationTags;
})(/** @type {any} */ (globalThis));
