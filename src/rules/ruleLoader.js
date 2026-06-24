/* global Zotero */

(function initRuleLoader(global) {
  "use strict";

  const g = /** @type {any} */ (global);
  g.ZoteroPaperOrganizer = g.ZoteroPaperOrganizer || {};
  const app = /** @type {any} */ (g.ZoteroPaperOrganizer);
  app.Rules = app.Rules || {};

  /**
   * @param {string} url
   * @returns {Promise<string>}
   */
  function readText(url) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("GET", url, true);
      request.overrideMimeType("application/json");
      request.onload = () => {
        if (request.status === 0 || (request.status >= 200 && request.status < 300)) {
          resolve(request.responseText);
        }
        else {
          reject(new Error(`Failed to load rules.json: ${request.status}`));
        }
      };
      request.onerror = () => reject(new Error("Failed to load rules.json"));
      request.send();
    });
  }

  /**
   * Load the external rule config. If loading fails, fallback rules from
   * src/classifier/rules.js remain active.
   *
   * @param {string} rootURI
   * @returns {Promise<Array<{ id: string, tag: string, name: string, keywords: string[], weight: number, fields: string[], wordBoundary: boolean }>>}
   */
  async function loadRules(rootURI) {
    if (g.ZoteroPaperOrganizerBootstrap?.bundled) {
      Zotero.debug("Research Assistant Lite using bundled fallback rules");
      return app.Rules.getRules();
    }

    try {
      const text = await readText(`${rootURI}src/rules/rules.json`);
      const config = JSON.parse(text);
      const rules = app.Rules.applyRuleConfig(config);
      Zotero.debug(`Research Assistant Lite loaded ${rules.length} rule(s) from rules.json`);
      return rules;
    }
    catch (error) {
      Zotero.logError(error);
      return app.Rules.getRules();
    }
  }

  app.Rules.loadRules = loadRules;
})(/** @type {any} */ (globalThis));
