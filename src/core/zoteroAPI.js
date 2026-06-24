/* global Zotero, ZoteroPaperOrganizer */

(function initZoteroAPI(global) {
  "use strict";

  const g = /** @type {any} */ (global);
  g.ZoteroPaperOrganizer = g.ZoteroPaperOrganizer || {};
  const app = /** @type {any} */ (g.ZoteroPaperOrganizer);
  app.Core = app.Core || {};

  const libraryCache = new Map();
  const CACHE_TTL_MS = 8000;

  /**
   * @returns {Set<string>}
   */
  function getManagedTags() {
    return new Set([
      ...app.Rules.getTags(),
      ...(app.Rules.getLegacyTags?.() || [])
    ]);
  }

  /**
   * Returns only this plugin's controlled classification tags. Zotero user tags
   * are preserved on the item, but they are not used as research categories in
   * the sidebar because personal reading-status tags make the taxonomy noisy.
   *
   * @param {Array<{ tag: string }>} classification
   * @returns {string[]}
   */
  function getClassificationOnlyTags(classification) {
    return [...new Set(app.Classifier.classificationTags(classification).filter(Boolean))];
  }

  /**
   * @param {number | undefined} libraryID
   */
  function invalidateLibraryCache(libraryID) {
    if (libraryID) {
      libraryCache.delete(libraryID);
      return;
    }

    libraryCache.clear();
  }

  /**
   * @param {any} item
   * @returns {boolean}
   */
  function isClassifiableItem(item) {
    if (!item || item.deleted) {
      return false;
    }

    if (typeof item.isRegularItem === "function") {
      return item.isRegularItem();
    }

    if (typeof item.isTopLevelItem === "function") {
      return item.isTopLevelItem() && !item.isAttachment?.() && !item.isNote?.();
    }

    return Boolean(item.getField);
  }

  /**
   * @param {any} item
   * @param {string} fieldName
   * @returns {string}
   */
  function getField(item, fieldName) {
    try {
      return String(item?.getField?.(fieldName) || item?.[fieldName] || "");
    }
    catch (error) {
      Zotero.logError(error);
      return "";
    }
  }

  /**
   * @param {any} item
   * @returns {{ title: string, abstract: string }}
   */
  function getItemText(item) {
    return {
      title: getField(item, "title"),
      abstract: getField(item, "abstractNote")
    };
  }

  /**
   * @param {any} item
   * @returns {Array<{ tag: string, type?: number }>}
   */
  function getTags(item) {
    try {
      return item.getTags?.() || [];
    }
    catch (error) {
      Zotero.logError(error);
      return [];
    }
  }

  /**
   * Replaces only this plugin's managed classification tags and preserves all
   * other user tags. This keeps Zotero collections and unrelated tags intact.
   *
   * @param {any} item
   * @param {string[]} nextTags
   * @returns {Promise<boolean>} true when the item was changed
   */
  async function setClassificationTags(item, nextTags) {
    if (!isClassifiableItem(item)) {
      return false;
    }

    const managedTags = getManagedTags();
    const uniqueNextTags = [...new Set(nextTags.filter(Boolean))];
    const existingTags = getTags(item);
    const preservedTags = existingTags.filter(tagData => !managedTags.has(tagData.tag));
    const nextTagObjects = uniqueNextTags.map(tag => ({ tag, type: 0 }));
    const mergedTags = [...preservedTags, ...nextTagObjects];

    const currentKey = JSON.stringify(existingTags.map(tagData => ({
      tag: tagData.tag,
      type: tagData.type || 0
    })).sort(sortTagData));
    const nextKey = JSON.stringify(mergedTags.map(tagData => ({
      tag: tagData.tag,
      type: tagData.type || 0
    })).sort(sortTagData));

    if (currentKey === nextKey) {
      return false;
    }

    item.setTags(mergedTags);
    await item.saveTx({ skipDateModifiedUpdate: true });
    invalidateLibraryCache(item.libraryID);
    return true;
  }

  /**
   * @param {{ tag: string, type?: number }} a
   * @param {{ tag: string, type?: number }} b
   * @returns {number}
   */
  function sortTagData(a, b) {
    if ((a.type || 0) !== (b.type || 0)) {
      return (a.type || 0) - (b.type || 0);
    }

    return a.tag.localeCompare(b.tag);
  }

  /**
   * @param {any} item
   * @returns {Promise<{ tags: string[], results: any[], changed: boolean }>}
   */
  async function classifyAndTagItem(item) {
    if (!isClassifiableItem(item)) {
      return { tags: [], results: [], changed: false };
    }

    const { title, abstract } = getItemText(item);
    const results = app.Classifier.classifyPaper(title, abstract);
    const tags = app.Classifier.classificationTags(results);
    const changed = await setClassificationTags(item, tags);
    app.Explain?.ExplanationEngine?.storeItemExplanations?.(item.id, results);
    return { tags, results, changed };
  }

  /**
   * @param {Window | undefined} win
   * @returns {number}
   */
  function getActiveLibraryID(win) {
    try {
      return win?.ZoteroPane?.getSelectedLibraryID?.() || Zotero.Libraries.userLibraryID;
    }
    catch (error) {
      Zotero.logError(error);
      return Zotero.Libraries.userLibraryID;
    }
  }

  /**
   * @param {number} libraryID
   * @returns {Promise<any[]>}
   */
  async function getTopLevelItems(libraryID) {
    const items = await Zotero.Items.getAll(libraryID, true, false);
    return items.filter(isClassifiableItem);
  }

  /**
   * @param {any} item
   * @returns {string}
   */
  function getYear(item) {
    const date = getField(item, "date");
    const match = date.match(/\b(18|19|20|21)\d{2}\b/);
    return match?.[0] || "";
  }

  /**
   * @param {any} item
   * @returns {{ id: number, title: string, abstract: string, year: string, dateAdded: string, doi: string, tags: string[], explanation: any[], classification: any[], duplicate?: any }}
   */
  function serializeItem(item) {
    const { title, abstract } = getItemText(item);
    const classification = app.Classifier.classifyPaper(title, abstract);
    const explanation = app.Explain.ExplanationEngine.storeItemExplanations(item.id, classification);

    return {
      id: item.id,
      title: title || "(Untitled)",
      abstract,
      year: getYear(item),
      dateAdded: item.dateAdded || "",
      doi: getField(item, "DOI"),
      tags: getClassificationOnlyTags(classification),
      explanation,
      classification
    };
  }

  function getDynamicTags(items) {
    const managedTags = app.Rules.getTags();
    const counts = new Map();

    for (const item of items) {
      for (const tag of item.tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }

    const tags = managedTags
      .filter(tag => (counts.get(tag) || 0) > 0)
      .sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0) || a.localeCompare(b));

    return tags.length ? tags : managedTags;
  }

  /**
   * @param {number} libraryID
   * @returns {Promise<Array<{ id: number, title: string, abstract: string, year: string, dateAdded: string, doi: string, tags: string[], explanation: any[], classification: any[], duplicate?: any }>>}
   */
  async function getLibrarySnapshot(libraryID) {
    const cached = libraryCache.get(libraryID);
    const now = Date.now();

    if (cached && now - cached.createdAt < CACHE_TTL_MS) {
      return cached.items;
    }

    const items = await getTopLevelItems(libraryID);
    const serialized = items.map(serializeItem);
    const duplicateIndex = app.Duplicates.DuplicateDetector.buildDuplicateIndex(serialized);
    const annotated = serialized.map(item => ({
      ...item,
      duplicate: app.Duplicates.DuplicateDetector.getDuplicateInfo(duplicateIndex, item.id)
    }));

    libraryCache.set(libraryID, {
      createdAt: now,
      items: annotated
    });
    return annotated;
  }

  /**
   * @param {{ win?: Window, query?: string, tags?: string[], limit?: number }} options
   * @returns {Promise<Array<{ id: number, title: string, abstract: string, year: string, dateAdded: string, doi: string, tags: string[], explanation: any[], classification: any[], duplicate?: any, searchScore?: number }>>}
   */
  async function findItems(options = {}) {
    const win = options.win;
    const libraryID = getActiveLibraryID(win);
    const items = await getLibrarySnapshot(libraryID);

    return app.Search.RankingEngine.rankItems(items, {
      query: options.query || "",
      tags: options.tags || [],
      limit: options.limit || 20
    });
  }

  /**
   * @param {{ win?: Window }} options
   * @returns {Promise<Array<{ id: number, title: string, abstract: string, year: string, dateAdded: string, doi: string, tags: string[], explanation: any[], classification: any[], duplicate?: any }>>}
   */
  async function getLibraryItems(options = {}) {
    const libraryID = getActiveLibraryID(options.win);
    return getLibrarySnapshot(libraryID);
  }

  /**
   * @param {{ win?: Window }} options
   * @returns {Promise<{ tagCounts: Array<{ tag: string, count: number }>, recent7Days: Array<{ date: string, count: number }>, recent7DayTotal: number, topDirection: { tag: string, count: number } | null }>}
   */
  async function getResearchOverview(options = {}) {
    const items = await getLibraryItems(options);
    const filterTags = getDynamicTags(items);
    const overview = app.Overview.ResearchOverview.buildOverview(items, filterTags);
    const duplicateIndex = app.Duplicates.DuplicateDetector.buildDuplicateIndex(items);
    return {
      ...overview,
      filterTags,
      duplicateCount: duplicateIndex.pairs.length,
      duplicates: duplicateIndex.pairs.slice(0, 10)
    };
  }

  /**
   * @param {Window} win
   * @param {number} itemID
   */
  async function selectItem(win, itemID) {
    try {
      app.Search.RankingEngine.markOpened(itemID);
      await win.ZoteroPane?.selectItem?.(itemID);
    }
    catch (error) {
      Zotero.logError(error);
    }
  }

  app.Core.ZoteroAPI = {
    isClassifiableItem,
    getItemText,
    getTags,
    setClassificationTags,
    classifyAndTagItem,
    getActiveLibraryID,
    getTopLevelItems,
    findItems,
    getLibraryItems,
    getResearchOverview,
    serializeItem,
    getDynamicTags,
    getClassificationOnlyTags,
    invalidateLibraryCache,
    selectItem
  };
})(/** @type {any} */ (globalThis));
