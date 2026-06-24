/* global Zotero, ZoteroPaperOrganizer */

(function initBatchProcessor(global) {
  "use strict";

  const g = /** @type {any} */ (global);
  g.ZoteroPaperOrganizer = g.ZoteroPaperOrganizer || {};
  const app = /** @type {any} */ (g.ZoteroPaperOrganizer);
  app.Core = app.Core || {};

  /**
   * @param {{ win?: Window, onProgress?: (processed: number, total: number) => void }} options
   * @returns {Promise<{ total: number, processed: number, changed: number }>}
   */
  async function reclassifyLibrary(options = {}) {
    const win = options.win;
    const libraryID = app.Core.ZoteroAPI.getActiveLibraryID(win);
    const items = await app.Core.ZoteroAPI.getTopLevelItems(libraryID);
    let processed = 0;
    let changed = 0;

    for (const item of items) {
      const result = await app.Core.ZoteroAPI.classifyAndTagItem(item);
      processed += 1;

      if (result.changed) {
        changed += 1;
      }

      options.onProgress?.(processed, items.length);

      if (processed % 25 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    Zotero.debug(`Zotero Paper Organizer reclassified ${processed} item(s), changed ${changed}`);
    return {
      total: items.length,
      processed,
      changed
    };
  }

  /**
   * Automatically tags papers that match rules but do not yet have any managed
   * classification tag. Runs in small chunks so Zotero stays responsive.
   *
   * @param {{ win?: Window, onProgress?: (processed: number, total: number) => void }} options
   * @returns {Promise<{ total: number, processed: number, changed: number }>}
   */
  async function autoClassifyMissingTags(options = {}) {
    const libraryID = app.Core.ZoteroAPI.getActiveLibraryID(options.win);
    const items = await app.Core.ZoteroAPI.getTopLevelItems(libraryID);
    const managedTags = new Set(app.Rules.getTags());
    let processed = 0;
    let changed = 0;

    for (const item of items) {
      const existingTags = app.Core.ZoteroAPI.getTags(item).map(tagData => tagData.tag);
      const hasManagedTag = existingTags.some(tag => managedTags.has(tag));

      if (!hasManagedTag) {
        const result = await app.Core.ZoteroAPI.classifyAndTagItem(item);
        if (result.changed) {
          changed += 1;
        }
      }

      processed += 1;
      options.onProgress?.(processed, items.length);

      if (processed % 20 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    app.Core.ZoteroAPI.invalidateLibraryCache(libraryID);
    Zotero.debug(`Research Assistant Lite auto-classified ${processed} item(s), changed ${changed}`);
    return {
      total: items.length,
      processed,
      changed
    };
  }

  app.Core.BatchProcessor = {
    reclassifyLibrary,
    autoClassifyMissingTags
  };
})(/** @type {any} */ (globalThis));
