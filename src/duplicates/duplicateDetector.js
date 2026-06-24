(function initDuplicateDetector(global) {
  "use strict";

  const g = /** @type {any} */ (global);
  g.ZoteroPaperOrganizer = g.ZoteroPaperOrganizer || {};
  const app = /** @type {any} */ (g.ZoteroPaperOrganizer);
  app.Duplicates = app.Duplicates || {};

  /**
   * @param {unknown} value
   * @returns {string}
   */
  function normalizeTitle(value) {
    return String(value || "")
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * @param {unknown} value
   * @returns {string}
   */
  function normalizeDOI(value) {
    return String(value || "")
      .toLocaleLowerCase()
      .replace(/^https?:\/\/(dx\.)?doi\.org\//, "")
      .replace(/^doi:\s*/, "")
      .trim();
  }

  /**
   * @param {string} a
   * @param {string} b
   * @returns {number}
   */
  function levenshteinDistance(a, b) {
    const previous = new Array(b.length + 1);
    const current = new Array(b.length + 1);

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = j;
    }

    for (let i = 1; i <= a.length; i += 1) {
      current[0] = i;

      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        current[j] = Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] + cost
        );
      }

      for (let j = 0; j <= b.length; j += 1) {
        previous[j] = current[j];
      }
    }

    return previous[b.length];
  }

  /**
   * @param {string} a
   * @param {string} b
   * @returns {number}
   */
  function titleSimilarity(a, b) {
    const left = normalizeTitle(a);
    const right = normalizeTitle(b);

    if (!left || !right) {
      return 0;
    }

    if (left === right) {
      return 1;
    }

    const longest = Math.max(left.length, right.length);
    return longest ? 1 - levenshteinDistance(left, right) / longest : 0;
  }

  /**
   * @param {Array<{ id: number, title: string, doi?: string }>} items
   * @returns {Array<{ itemIDs: number[], reason: string, score: number, title: string }>}
   */
  function detectDuplicates(items) {
    const pairs = [];
    const byDOI = new Map();
    const byTitleBucket = new Map();

    for (const item of items) {
      const doi = normalizeDOI(item.doi);
      if (doi) {
        const existing = byDOI.get(doi);
        if (existing) {
          pairs.push({
            itemIDs: [existing.id, item.id],
            reason: "DOI match",
            score: 1,
            title: existing.title
          });
        }
        else {
          byDOI.set(doi, item);
        }
      }

      const normalizedTitle = normalizeTitle(item.title);
      if (normalizedTitle) {
        const bucketKey = normalizedTitle.slice(0, 24);
        const bucket = byTitleBucket.get(bucketKey) || [];
        for (const existing of bucket) {
          const similarity = titleSimilarity(existing.title, item.title);
          if (similarity <= 0.9) {
            continue;
          }

          pairs.push({
            itemIDs: [existing.id, item.id],
            reason: `Title similarity ${Math.round(similarity * 100)}%`,
            score: Number(similarity.toFixed(2)),
            title: existing.title
          });
        }

        bucket.push(item);
        byTitleBucket.set(bucketKey, bucket);
      }
    }

    return pairs;
  }

  /**
   * @param {Array<{ id: number, title: string, doi?: string }>} items
   * @returns {{ pairs: Array<{ itemIDs: number[], reason: string, score: number, title: string }>, byItemID: Map<number, { reasons: string[], pairCount: number }> }}
   */
  function buildDuplicateIndex(items) {
    const pairs = detectDuplicates(items);
    const byItemID = new Map();

    for (const pair of pairs) {
      for (const itemID of pair.itemIDs) {
        const current = byItemID.get(itemID) || { reasons: [], pairCount: 0 };
        current.reasons.push(pair.reason);
        current.pairCount += 1;
        byItemID.set(itemID, current);
      }
    }

    return { pairs, byItemID };
  }

  /**
   * @param {{ pairs: Array<{ itemIDs: number[], reason: string, score: number, title: string }>, byItemID: Map<number, { reasons: string[], pairCount: number }> }} index
   * @param {number} itemID
   * @returns {{ reasons: string[], pairCount: number } | null}
   */
  function getDuplicateInfo(index, itemID) {
    return index.byItemID.get(itemID) || null;
  }

  app.Duplicates.DuplicateDetector = {
    normalizeTitle,
    normalizeDOI,
    titleSimilarity,
    detectDuplicates,
    buildDuplicateIndex,
    getDuplicateInfo
  };
})(/** @type {any} */ (globalThis));
