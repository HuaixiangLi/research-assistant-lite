(function initRankingEngine(global) {
  "use strict";

  const g = /** @type {any} */ (global);
  g.ZoteroPaperOrganizer = g.ZoteroPaperOrganizer || {};
  const app = /** @type {any} */ (g.ZoteroPaperOrganizer);
  app.Search = app.Search || {};

  const RECENT_OPENED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const openedAtByItemID = new Map();

  /**
   * @param {unknown} value
   * @returns {string}
   */
  function normalize(value) {
    return app.Classifier.normalize(value);
  }

  /**
   * @param {string} query
   * @returns {string[]}
   */
  function tokenize(query) {
    return normalize(query)
      .split(/\s+/)
      .map(term => term.trim())
      .filter(Boolean);
  }

  /**
   * @param {string} text
   * @param {string[]} terms
   * @returns {number}
   */
  function countTermMatches(text, terms) {
    const normalizedText = normalize(text);
    return terms.filter(term => normalizedText.includes(term)).length;
  }

  /**
   * @param {{ id: number }} item
   * @param {number} now
   * @returns {number}
   */
  function recentOpenedBoost(item, now) {
    const openedAt = openedAtByItemID.get(item.id);

    if (!openedAt) {
      return 0;
    }

    return now - openedAt <= RECENT_OPENED_WINDOW_MS ? 1 : 0;
  }

  /**
   * @param {{ id: number, title: string, abstract: string, tags: string[] }} item
   * @param {{ query?: string, tags?: string[], now?: number }} options
   * @returns {number}
   */
  function scoreItem(item, options = {}) {
    const terms = tokenize(options.query || "");
    const requiredTags = options.tags || [];
    const now = options.now || Date.now();
    const tagText = item.tags.join(" ");

    const titleScore = countTermMatches(item.title, terms) * 3;
    const abstractScore = countTermMatches(item.abstract, terms) * 2;
    const queryTagScore = countTermMatches(tagText, terms) * 4;
    const selectedTagScore = requiredTags.filter(tag => item.tags.includes(tag)).length * 4;

    return titleScore
      + abstractScore
      + queryTagScore
      + selectedTagScore
      + recentOpenedBoost(item, now);
  }

  /**
   * @param {Array<{ id: number, title: string, abstract: string, dateAdded: string, tags: string[] }>} items
   * @param {{ query?: string, tags?: string[], limit?: number, now?: number }} options
   * @returns {Array<any>}
   */
  function rankItems(items, options = {}) {
    const requiredTags = options.tags || [];
    const hasQuery = Boolean((options.query || "").trim());
    const limit = options.limit || 20;

    return items
      .filter(item => requiredTags.every(tag => item.tags.includes(tag)))
      .map(item => ({
        ...item,
        searchScore: scoreItem(item, options)
      }))
      .filter(item => !hasQuery || item.searchScore > 0)
      .sort((a, b) => (
        b.searchScore - a.searchScore
        || b.tags.length - a.tags.length
        || String(b.dateAdded || "").localeCompare(String(a.dateAdded || ""))
        || a.title.localeCompare(b.title)
      ))
      .slice(0, limit);
  }

  /**
   * @param {number} itemID
   */
  function markOpened(itemID) {
    openedAtByItemID.set(itemID, Date.now());
  }

  app.Search.RankingEngine = {
    rankItems,
    scoreItem,
    markOpened,
    tokenize,
    recentOpenedBoost
  };
})(/** @type {any} */ (globalThis));
