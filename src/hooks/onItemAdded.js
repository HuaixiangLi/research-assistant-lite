/* global Zotero, ZoteroPaperOrganizer */

(function initItemHooks(global) {
  "use strict";

  const g = /** @type {any} */ (global);
  g.ZoteroPaperOrganizer = g.ZoteroPaperOrganizer || {};
  const app = /** @type {any} */ (g.ZoteroPaperOrganizer);
  app.Hooks = app.Hooks || {};

  let observerID = null;
  const pendingRetries = new Map();

  /**
   * Classifies a newly added Zotero item and applies tag categories.
   *
   * @param {any} item
   * @returns {Promise<{ tags: string[], changed: boolean }>}
   */
  async function onItemAdded(item) {
    return app.Core.ZoteroAPI.classifyAndTagItem(item);
  }

  /**
   * Zotero imports can fire the add event before translators finish writing
   * title/abstract metadata. A short retry catches those items without changing
   * the rule engine or requiring users to run the batch button manually.
   *
   * @param {number} itemID
   */
  async function classifyItemByID(itemID) {
    const item = await Zotero.Items.getAsync(itemID);
    await onItemAdded(item);
  }

  /**
   * @param {number} itemID
   */
  function scheduleMetadataRetry(itemID) {
    const existingTimer = pendingRetries.get(itemID);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      pendingRetries.delete(itemID);
      try {
        await classifyItemByID(itemID);
      }
      catch (error) {
        Zotero.logError(error);
      }
    }, 3500);
    pendingRetries.set(itemID, timer);
  }

  function registerItemAddedObserver() {
    if (observerID) {
      return;
    }

    observerID = Zotero.Notifier.registerObserver({
      /**
       * @param {string} event
       * @param {string} type
       * @param {number[]} ids
       */
      notify: async function notify(event, type, ids) {
        if (event !== "add" || type !== "item") {
          return;
        }

        for (const id of ids) {
          await classifyItemByID(id);
          scheduleMetadataRetry(id);
        }
      }
    }, ["item"], "zotero-paper-organizer-items");
  }

  function unregisterItemAddedObserver() {
    if (!observerID) {
      return;
    }

    Zotero.Notifier.unregisterObserver(observerID);
    observerID = null;
    for (const timer of pendingRetries.values()) {
      clearTimeout(timer);
    }
    pendingRetries.clear();
  }

  app.Hooks.onItemAdded = onItemAdded;
  app.Hooks.registerItemAddedObserver = registerItemAddedObserver;
  app.Hooks.unregisterItemAddedObserver = unregisterItemAddedObserver;
})(/** @type {any} */ (globalThis));
