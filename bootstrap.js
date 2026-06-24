/* global Zotero, Components, APP_SHUTDOWN */
/* eslint-disable no-unused-vars */

var ZoteroPaperOrganizerBootstrap = {
  rootURI: "",
  cacheKey: "",
  loaded: false
};

var ZoteroPaperOrganizerScripts = [
  "src/classifier/rules.js",
  "src/rules/ruleLoader.js",
  "src/classifier/classifier.js",
  "src/explain/explanationEngine.js",
  "src/search/rankingEngine.js",
  "src/overview/researchOverview.js",
  "src/duplicates/duplicateDetector.js",
  "src/core/zoteroAPI.js",
  "src/hooks/onItemAdded.js",
  "src/core/batchProcessor.js",
  "src/ui/sidebar.jsx"
];

/**
 * @param {{ id: string, version: string, rootURI?: string, resourceURI?: { spec: string } }} data
 */
function getRootURI(data) {
  return data.rootURI || data.resourceURI?.spec || "";
}

function getSubScriptLoader() {
  if (globalThis.Services?.scriptloader) {
    return globalThis.Services.scriptloader;
  }

  return Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
    .getService(Components.interfaces.mozIJSSubScriptLoader);
}

function pluginScriptsAlreadyLoaded() {
  return Boolean(globalThis.ZoteroPaperOrganizer?.UI?.Sidebar);
}

/**
 * @param {string} rootURI
 */
function loadPluginScripts(rootURI) {
  const cacheKey = Date.now().toString(36);
  ZoteroPaperOrganizerBootstrap.cacheKey = cacheKey;

  if (pluginScriptsAlreadyLoaded()) {
    ZoteroPaperOrganizerBootstrap.loaded = true;
    return;
  }

  const scriptLoader = getSubScriptLoader();

  for (const script of ZoteroPaperOrganizerScripts) {
    scriptLoader.loadSubScript(`${rootURI}${script}`, globalThis);
  }

  ZoteroPaperOrganizerBootstrap.loaded = true;
}

/**
 * @param {{ id: string, version: string, rootURI?: string, resourceURI?: { spec: string } }} data
 * @param {number} reason
 */
async function startup(data, reason) {
  const rootURI = getRootURI(data);
  ZoteroPaperOrganizerBootstrap.rootURI = rootURI;
  loadPluginScripts(rootURI);

  await globalThis.ZoteroPaperOrganizer?.Rules?.loadRules?.(rootURI);
  globalThis.ZoteroPaperOrganizer?.Hooks?.registerItemAddedObserver();

  for (const win of Zotero.getMainWindows()) {
    try {
      globalThis.ZoteroPaperOrganizer?.UI?.Sidebar?.installMenu?.(win);
      globalThis.ZoteroPaperOrganizer?.UI?.Sidebar?.mount(win);
      win.ZoteroPaperOrganizerSidebarRefresh?.();
    }
    catch (error) {
      Zotero.logError(error);
    }
  }

  const mainWindow = Zotero.getMainWindows()[0];
  if (mainWindow) {
    mainWindow.setTimeout(() => {
      void globalThis.ZoteroPaperOrganizer?.Core?.BatchProcessor?.autoClassifyMissingTags?.({
        win: mainWindow
      })?.then(() => mainWindow.ZoteroPaperOrganizerSidebarRefresh?.());
    }, 1200);
  }

  Zotero.debug("Research Assistant Lite started");
}

/**
 * @param {{ id: string, version: string, rootURI?: string, resourceURI?: { spec: string } }} data
 * @param {number} reason
 */
function shutdown(data, reason) {
  if (typeof APP_SHUTDOWN !== "undefined" && reason === APP_SHUTDOWN) {
    return;
  }

  try {
    globalThis.ZoteroPaperOrganizer?.Hooks?.unregisterItemAddedObserver();

    for (const win of Zotero.getMainWindows()) {
      globalThis.ZoteroPaperOrganizer?.UI?.Sidebar?.unmount(win);
    }
  }
  finally {
    delete globalThis.ZoteroPaperOrganizer;
    ZoteroPaperOrganizerBootstrap.loaded = false;
    Zotero.debug("Research Assistant Lite stopped");
  }
}

/**
 * @param {{ window: Window }} data
 */
function onMainWindowLoad(data) {
  globalThis.ZoteroPaperOrganizer?.UI?.Sidebar?.installMenu?.(data.window);
  globalThis.ZoteroPaperOrganizer?.UI?.Sidebar?.mount(data.window);
}

/**
 * @param {{ window: Window }} data
 */
function onMainWindowUnload(data) {
  globalThis.ZoteroPaperOrganizer?.UI?.Sidebar?.unmount(data.window);
}

function install() {}

function uninstall() {}
