/* global Zotero, ZoteroPaperOrganizer */

(function initSidebar(global) {
  "use strict";

  const g = /** @type {any} */ (global);
  g.ZoteroPaperOrganizer = g.ZoteroPaperOrganizer || {};
  const app = /** @type {any} */ (g.ZoteroPaperOrganizer);
  app.UI = app.UI || {};

  const PANEL_ID = "zotero-paper-organizer-sidebar";
  const STYLE_ID = "zotero-paper-organizer-sidebar-style";
  const DOCK_ID = "zotero-paper-organizer-right-dock";
  const MENU_ID = "zotero-paper-organizer-menu-item";
  const PLUGIN_ID = "research-assistant-lite@example.com";
  const ITEM_PANE_ID = "research-assistant-lite-pane";
  const ITEM_PANE_FTL = "research-assistant-lite.ftl";
  const HEADER_ICON = "chrome://zotero/skin/16/universal/tag.svg";
  const SIDENAV_ICON = "chrome://zotero/skin/20/universal/magic-wand.svg";
  const RELOCATE_RETRIES = 12;
  let registeredSectionID = "";
  const panelRefreshers = new Set();

  const RIGHT_PANE_SELECTORS = [
    "#zotero-item-pane-content",
    "#zotero-item-pane",
    "#zotero-context-pane",
    "#item-pane",
    "#item-pane-content",
    "[id*='zotero-item-pane']",
    "[id*='context-pane']",
    "[class*='item-pane']",
    "[class*='context-pane']"
  ];

  /**
   * @param {Document} doc
   * @param {string} tagName
   * @param {string} className
   * @returns {HTMLElement}
   */
  function html(doc, tagName, className = "") {
    const element = doc.createElementNS("http://www.w3.org/1999/xhtml", tagName);
    if (className) {
      element.className = className;
    }
    return /** @type {HTMLElement} */ (element);
  }

  /**
   * @param {Window} win
   */
  function injectStyles(win) {
    const doc = win.document;

    if (doc.getElementById(STYLE_ID)) {
      return;
    }

    const style = html(doc, "style");
    style.id = STYLE_ID;
    style.textContent = `
      #${DOCK_ID} {
        box-sizing: border-box;
        color: var(--fill-primary, inherit);
        font: menu;
      }

      #${DOCK_ID}.is-hidden {
        display: none;
      }

      #${DOCK_ID}.zpo-integrated {
        background: var(--material-background, #fff);
        border-top: 1px solid var(--material-border, rgba(0, 0, 0, 0.12));
        margin: 0;
        min-width: 0;
        width: 100%;
      }

      #${DOCK_ID}.zpo-floating {
        background: var(--material-background, #fff);
        border: 1px solid var(--material-border, rgba(0, 0, 0, 0.16));
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
        max-height: calc(100vh - 140px);
        overflow: hidden;
        position: fixed;
        right: 16px;
        top: 92px;
        width: 360px;
        z-index: 2147483000;
      }

      #${PANEL_ID} {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: inherit;
        min-width: 0;
        overflow: auto;
        padding: 10px 12px 12px;
        width: 100%;
      }

      #${PANEL_ID}.zpo-pane-section {
        max-height: none;
        overflow: visible;
        padding: 6px 0 10px;
      }

      #${PANEL_ID}.zpo-pane-section .zpo-list {
        max-height: 220px;
      }

      #${PANEL_ID} .zpo-header,
      #${PANEL_ID} .zpo-header-actions,
      #${PANEL_ID} .zpo-row {
        align-items: center;
        display: flex;
        gap: 6px;
      }

      #${PANEL_ID} .zpo-header {
        justify-content: space-between;
      }

      #${PANEL_ID} .zpo-title {
        font-size: 13px;
        font-weight: 600;
        line-height: 1.3;
      }

      #${PANEL_ID} .zpo-section-title {
        color: var(--fill-primary, inherit);
        font-size: 12px;
        font-weight: 600;
        line-height: 1.35;
        margin-bottom: 5px;
      }

      #${PANEL_ID} .zpo-button,
      #${PANEL_ID} .zpo-icon-button {
        appearance: none;
        border-radius: 6px;
        box-sizing: border-box;
        cursor: pointer;
        font: menu;
      }

      #${PANEL_ID} .zpo-button {
        background: #2563eb;
        border: 1px solid #2563eb;
        color: #fff;
        min-height: 26px;
        padding: 4px 8px;
      }

      #${PANEL_ID} .zpo-button:disabled {
        cursor: default;
        opacity: 0.65;
      }

      #${PANEL_ID} .zpo-icon-button {
        align-items: center;
        background: transparent;
        border: 1px solid transparent;
        color: var(--fill-secondary, #5f6368);
        display: inline-flex;
        height: 26px;
        justify-content: center;
        line-height: 1;
        min-width: 26px;
        padding: 0;
      }

      #${PANEL_ID} .zpo-icon-button:hover {
        background: var(--material-mix-quinary, #eef2f7);
        border-color: var(--material-border, rgba(0, 0, 0, 0.12));
      }

      #${PANEL_ID} .zpo-search {
        border: 1px solid var(--material-border, rgba(0, 0, 0, 0.22));
        border-radius: 6px;
        box-sizing: border-box;
        font: menu;
        min-height: 28px;
        padding: 4px 7px;
        width: 100%;
      }

      #${PANEL_ID} .zpo-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }

      #${PANEL_ID} .zpo-tag {
        align-items: center;
        background: var(--material-mix-quinary, #f5f7fa);
        border: 1px solid var(--material-border, rgba(0, 0, 0, 0.09));
        border-radius: 5px;
        cursor: pointer;
        display: flex;
        font-size: 11px;
        gap: 4px;
        line-height: 1.2;
        min-height: 22px;
        max-width: 100%;
        overflow: hidden;
        padding: 3px 6px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #${PANEL_ID} .zpo-tag input {
        display: none;
      }

      #${PANEL_ID} .zpo-tag.is-selected {
        background: #dbeafe;
        border-color: #60a5fa;
        color: #0f3d91;
      }

      #${PANEL_ID} .zpo-status,
      #${PANEL_ID} .zpo-muted {
        color: var(--fill-secondary, #5f6368);
        font-size: 11px;
        line-height: 1.35;
      }

      #${PANEL_ID} .zpo-overview,
      #${PANEL_ID} .zpo-explanation {
        background: var(--material-mix-quinary, #f8fafc);
        border: 1px solid var(--material-border, rgba(0, 0, 0, 0.08));
        border-radius: 6px;
        padding: 7px;
      }

      #${PANEL_ID} .zpo-stat {
        align-items: center;
        display: flex;
        font-size: 11px;
        justify-content: space-between;
        line-height: 1.45;
      }

      #${PANEL_ID} .zpo-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 1px;
        max-height: 320px;
        overflow: auto;
      }

      #${PANEL_ID} .zpo-item {
        background: transparent;
        border: 1px solid transparent;
        border-radius: 6px;
        box-sizing: border-box;
        color: inherit;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 3px;
        font: menu;
        line-height: 1.35;
        overflow: visible;
        padding: 7px 7px;
        position: static;
        text-align: left;
        white-space: normal !important;
        width: 100%;
      }

      #${PANEL_ID} .zpo-item:focus {
        outline: 2px solid rgba(37, 99, 235, 0.35);
        outline-offset: 1px;
      }

      #${PANEL_ID} .zpo-item:hover,
      #${PANEL_ID} .zpo-item.is-selected {
        background: #eef5ff;
        border-color: rgba(37, 99, 235, 0.28);
      }

      #${PANEL_ID} .zpo-item-title {
        -webkit-box-orient: vertical;
        display: -webkit-box;
        font-size: 12px;
        -webkit-line-clamp: 3;
        line-clamp: 3;
        line-height: 1.35;
        overflow: hidden;
        overflow-wrap: anywhere;
        white-space: normal;
      }

      #${PANEL_ID} .zpo-explanation-block .zpo-item-title {
        font-size: 12px;
        line-height: 1.35;
        overflow: visible;
        white-space: normal;
      }

      #${PANEL_ID} .zpo-item-meta,
      #${PANEL_ID} .zpo-explanation-line {
        color: var(--fill-secondary, #5f6368);
        display: block;
        font-size: 11px;
        line-height: 1.35;
        margin-top: 2px;
        overflow-wrap: anywhere;
        white-space: normal;
      }

      #${PANEL_ID} .zpo-item-meta {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        overflow: hidden;
      }

      #${PANEL_ID} .zpo-explanation-block {
        border-left: 2px solid var(--accent-blue30, #9ec9ff);
        margin-top: 5px;
        padding-left: 7px;
      }
    `;
    doc.documentElement.appendChild(style);
  }

  /**
   * @param {Window} win
   */
  function installLocalization(win) {
    try {
      /** @type {any} */ (win).MozXULElement?.insertFTLIfNeeded?.(ITEM_PANE_FTL);
    }
    catch (error) {
      Zotero.logError(error);
    }
  }

  function refreshAllPanels() {
    for (const refresh of [...panelRefreshers]) {
      try {
        refresh(false);
      }
      catch (error) {
        Zotero.logError(error);
      }
    }
  }

  /**
   * @param {Element} element
   * @param {Window} win
   * @returns {boolean}
   */
  function looksLikeRightPane(element, win) {
    if (element.id === DOCK_ID || element.id === PANEL_ID) {
      return false;
    }

    const rect = element.getBoundingClientRect?.();
    if (!rect || rect.width < 180 || rect.height < 120) {
      return false;
    }

    return rect.right > win.innerWidth * 0.55;
  }

  /**
   * @param {Window} win
   * @returns {Element | null}
   */
  function findRightPane(win) {
    const doc = win.document;

    for (const selector of RIGHT_PANE_SELECTORS) {
      const matches = [...doc.querySelectorAll(selector)];
      const candidate = matches.find(element => looksLikeRightPane(element, win));
      if (candidate) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * @param {Window} win
   * @param {Element} dock
   */
  function placeDock(win, dock) {
    const rightPane = findRightPane(win);

    if (rightPane) {
      dock.classList.remove("zpo-floating");
      dock.classList.add("zpo-integrated");
      if (dock.parentElement !== rightPane) {
        rightPane.appendChild(dock);
      }
      return;
    }

    dock.classList.remove("zpo-integrated");
    dock.classList.add("zpo-floating");
    if (dock.parentElement !== win.document.documentElement) {
      win.document.documentElement.appendChild(dock);
    }
  }

  /**
   * @param {Window} win
   * @returns {Element | null}
   */
  function findSidebarContainer(win) {
    const doc = win.document;
    let dock = /** @type {Element | null} */ (doc.getElementById(DOCK_ID));

    if (!dock) {
      const zoteroDoc = /** @type {Document & { createXULElement?: (name: string) => Element }} */ (doc);
      dock = zoteroDoc.createXULElement
        ? zoteroDoc.createXULElement("vbox")
        : html(doc, "section");
      dock.id = DOCK_ID;
      dock.setAttribute("orient", "vertical");
    }

    placeDock(win, dock);
    return dock;
  }

  /**
   * @param {Window} win
   */
  function togglePanel(win) {
    const doc = win.document;

    installLocalization(win);
    injectStyles(win);

    if (registerItemPaneSection()) {
      refreshAllPanels();
      return;
    }

    let dock = doc.getElementById(DOCK_ID);

    if (!dock) {
      mount(win);
      dock = doc.getElementById(DOCK_ID);
    }

    if (!dock) {
      return;
    }

    placeDock(win, dock);
    dock.classList.toggle("is-hidden");
  }

  /**
   * @param {Window} win
   */
  function installMenu(win) {
    const doc = win.document;

    if (doc.getElementById(MENU_ID)) {
      return;
    }

    const menuPopup = doc.getElementById("menu_ToolsPopup")
      || doc.getElementById("taskPopup")
      || doc.querySelector("menupopup");

    const zoteroDoc = /** @type {Document & { createXULElement?: (name: string) => Element }} */ (doc);

    if (!menuPopup || !zoteroDoc.createXULElement) {
      return;
    }

    const menuItem = zoteroDoc.createXULElement("menuitem");
    menuItem.id = MENU_ID;
    menuItem.setAttribute("label", "Research Assistant Lite");
    menuItem.addEventListener("command", () => togglePanel(win));
    menuPopup.appendChild(menuItem);
  }

  /**
   * @param {HTMLElement} root
   * @returns {string[]}
   */
  function getSelectedTags(root) {
    return [...root.querySelectorAll("input[data-zpo-tag]:checked")]
      .map(input => /** @type {HTMLInputElement} */ (input).dataset.zpoTag || "")
      .filter(Boolean);
  }

  /**
   * @param {HTMLElement} container
   * @param {Array<{ tag: string, count: number }>} tagCounts
   * @param {string[]} selectedTags
   */
  function renderTagFilters(container, tagCounts, selectedTags) {
    const doc = container.ownerDocument;
    container.replaceChildren();

    for (const entry of tagCounts.filter(tag => tag.count > 0).slice(0, 28)) {
      const label = html(doc, "label", "zpo-tag");
      if (selectedTags.includes(entry.tag)) {
        label.classList.add("is-selected");
      }

      const checkbox = /** @type {HTMLInputElement} */ (html(doc, "input"));
      checkbox.setAttribute("type", "checkbox");
      checkbox.dataset.zpoTag = entry.tag;
      checkbox.checked = selectedTags.includes(entry.tag);
      label.title = `${entry.tag}: ${entry.count}`;
      label.append(checkbox, doc.createTextNode(`${entry.tag} ${entry.count}`));
      container.appendChild(label);
    }
  }

  /**
   * @param {HTMLElement} container
   * @param {{ tagCounts: Array<{ tag: string, count: number }>, recent7Days: Array<{ date: string, count: number }>, recent7DayTotal: number, topDirection: { tag: string, count: number } | null, duplicateCount?: number }} overview
   */
  function renderOverview(container, overview) {
    const doc = container.ownerDocument;
    container.replaceChildren();

    const title = html(doc, "div", "zpo-section-title");
    title.textContent = "Research Overview";
    container.appendChild(title);

    for (const entry of overview.tagCounts.slice(0, 6)) {
      const row = html(doc, "div", "zpo-stat");
      row.append(doc.createTextNode(entry.tag), doc.createTextNode(String(entry.count)));
      container.appendChild(row);
    }

    const recent = html(doc, "div", "zpo-muted");
    recent.textContent = `Last 7 days: ${overview.recent7DayTotal} added`;
    container.appendChild(recent);

    const top = html(doc, "div", "zpo-muted");
    top.textContent = overview.topDirection
      ? `Top direction: ${overview.topDirection.tag}`
      : "Top direction: none";
    container.appendChild(top);

    const duplicates = html(doc, "div", "zpo-muted");
    duplicates.textContent = `Potential duplicates: ${overview.duplicateCount || 0}`;
    container.appendChild(duplicates);
  }

  /**
   * @param {HTMLElement} container
   * @param {any | null} item
   */
  function renderExplanation(container, item) {
    const doc = container.ownerDocument;
    container.replaceChildren();

    const title = html(doc, "div", "zpo-section-title");
    title.textContent = "Tag Explanation";
    container.appendChild(title);

    if (!item) {
      const empty = html(doc, "div", "zpo-muted");
      empty.textContent = "Select a ranked result to inspect tags.";
      container.appendChild(empty);
      return;
    }

    const paperTitle = html(doc, "div", "zpo-muted");
    paperTitle.textContent = item.title;
    container.appendChild(paperTitle);

    if (item.duplicate) {
      const duplicate = html(doc, "div", "zpo-muted");
      duplicate.textContent = `Potential duplicate: ${item.duplicate.reasons.join(", ")}`;
      container.appendChild(duplicate);
    }

    if (!item.explanation.length) {
      const empty = html(doc, "div", "zpo-muted");
      empty.textContent = "No Research Assistant category matched this item. Use Re-classify after editing rules.";
      container.appendChild(empty);
      return;
    }

    for (const explanation of item.explanation.slice(0, 3)) {
      const block = html(doc, "div", "zpo-explanation-block");
      const heading = html(doc, "div", "zpo-item-title");
      heading.textContent = `Why tagged as "${explanation.tag}"?`;

      const rule = html(doc, "span", "zpo-explanation-line");
      rule.textContent = `Matched rule: ${explanation.ruleName}`;

      const keyword = html(doc, "span", "zpo-explanation-line");
      keyword.textContent = `Matched keyword: "${explanation.matchedKeywords.join('", "')}"`;

      const field = html(doc, "span", "zpo-explanation-line");
      field.textContent = `Field: ${explanation.sourceField} | Score: ${explanation.score.toFixed(2)}`;

      block.append(heading, rule, keyword, field);
      container.appendChild(block);
    }
  }

  /**
   * @param {KeyboardEvent} event
   * @param {() => void} action
   */
  function activateOnKeyboard(event, action) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    action();
  }

  /**
   * @param {Window} win
   * @param {HTMLElement} root
   * @param {HTMLElement} list
   * @param {HTMLElement} status
   * @param {HTMLElement} overviewPanel
   * @param {HTMLElement} explanationPanel
   * @param {HTMLElement} tagPanel
   * @param {boolean} selectFirst
   */
  async function refreshList(win, root, list, status, overviewPanel, explanationPanel, tagPanel, selectFirst = false) {
    const search = /** @type {HTMLInputElement | null} */ (root.querySelector(".zpo-search"));
    const query = search?.value || "";
    const tags = getSelectedTags(root);
    const selectedID = Number(root.dataset.zpoSelectedId || 0);

    status.textContent = "Loading...";

    try {
      const [items, overview] = await Promise.all([
        app.Core.ZoteroAPI.findItems({
          win,
          query,
          tags,
          limit: 20
        }),
        app.Core.ZoteroAPI.getResearchOverview({ win })
      ]);

      renderTagFilters(tagPanel, overview.tagCounts, tags);
      renderOverview(overviewPanel, overview);
      list.replaceChildren();

      const selectedItem = items.find(item => item.id === selectedID)
        || items.find(item => item.explanation.length)
        || items[0]
        || null;
      root.dataset.zpoSelectedId = selectedItem ? String(selectedItem.id) : "";
      renderExplanation(explanationPanel, selectedItem);

      if (selectFirst && selectedItem) {
        void app.Core.ZoteroAPI.selectItem(win, selectedItem.id);
      }

      if (!items.length) {
        const empty = html(win.document, "div", "zpo-status");
        empty.textContent = "No matching papers";
        list.appendChild(empty);
      }
      else {
        for (const item of items) {
          const row = html(win.document, "div", "zpo-item");
          row.setAttribute("role", "button");
          row.setAttribute("tabindex", "0");
          if (selectedItem?.id === item.id) {
            row.classList.add("is-selected");
          }
          const selectRow = () => {
            root.dataset.zpoSelectedId = String(item.id);
            renderExplanation(explanationPanel, item);
            void app.Core.ZoteroAPI.selectItem(win, item.id);
            win.ZoteroPaperOrganizerSidebarRefresh?.();
          };
          row.addEventListener("click", selectRow);
          row.addEventListener("keydown", event => activateOnKeyboard(event, selectRow));

          const title = html(win.document, "span", "zpo-item-title");
          title.textContent = item.title;

          const meta = html(win.document, "span", "zpo-item-meta");
          const tagText = item.tags.slice(0, 3).join(", ");
          const scoreText = item.searchScore ? `Score ${item.searchScore}` : "";
          const duplicateText = item.duplicate ? "Potential duplicate" : "";
          meta.textContent = [item.year, tagText, scoreText, duplicateText].filter(Boolean).join(" | ");

          row.append(title, meta);
          list.appendChild(row);
        }
      }

      const activeFilter = tags.length ? ` | ${tags.length} tag filter${tags.length === 1 ? "" : "s"}` : "";
      status.textContent = `${items.length} ranked paper${items.length === 1 ? "" : "s"}${activeFilter}`;
    }
    catch (error) {
      Zotero.logError(error);
      status.textContent = "Search failed";
    }
  }

  /**
   * @param {Window} win
   * @param {Element} container
   * @param {{ sectionMode?: boolean, enableRelocate?: boolean }} options
   * @returns {() => void}
   */
  function createPanel(win, container, options = {}) {
    const doc = win.document;
    container.querySelector(`#${PANEL_ID}`)?.remove();
    const root = html(doc, "section");
    root.id = PANEL_ID;
    if (options.sectionMode) {
      root.classList.add("zpo-pane-section");
    }

    const header = html(doc, "div", "zpo-header");
    const title = html(doc, "div", "zpo-title");
    title.textContent = "Research Assistant Lite";

    const headerActions = html(doc, "div", "zpo-header-actions");
    const reclassifyButton = html(doc, "button", "zpo-button");
    reclassifyButton.setAttribute("type", "button");
    reclassifyButton.textContent = "Re-classify";
    reclassifyButton.title = "Re-classify library";

    const closeButton = html(doc, "button", "zpo-icon-button");
    closeButton.setAttribute("type", "button");
    closeButton.setAttribute("aria-label", "Close Research Assistant Lite");
    closeButton.title = "Close";
    closeButton.textContent = "x";

    headerActions.append(reclassifyButton);
    if (!options.sectionMode) {
      headerActions.append(closeButton);
    }
    header.append(title, headerActions);

    const overviewPanel = html(doc, "div", "zpo-overview");
    const search = html(doc, "input", "zpo-search");
    search.setAttribute("type", "search");
    search.setAttribute("placeholder", "Search title, abstract, tag");

    const tags = html(doc, "div", "zpo-tags");

    const explanationPanel = html(doc, "div", "zpo-explanation");
    const status = html(doc, "div", "zpo-status");
    const list = html(doc, "div", "zpo-list");

    root.append(header, overviewPanel, search, tags, explanationPanel, status, list);
    container.appendChild(root);

    let refreshTimer = 0;
    let relocateTimer = 0;

    /**
     * @param {boolean} [selectFirst]
     */
    const scheduleRefresh = (selectFirst = false) => {
      win.clearTimeout(refreshTimer);
      refreshTimer = win.setTimeout(() => {
        void refreshList(win, root, list, status, overviewPanel, explanationPanel, tags, selectFirst);
      }, 250);
    };
    panelRefreshers.add(scheduleRefresh);

    /**
     * @param {number} retriesLeft
     */
    const scheduleRelocate = (retriesLeft = RELOCATE_RETRIES) => {
      win.clearTimeout(relocateTimer);
      relocateTimer = win.setTimeout(() => {
        const dock = doc.getElementById(DOCK_ID);
        if (!dock) {
          return;
        }

        const wasIntegrated = dock.classList.contains("zpo-integrated");
        placeDock(win, dock);
        if (!wasIntegrated && dock.classList.contains("zpo-integrated")) {
          scheduleRefresh();
        }
        if (!dock.classList.contains("zpo-integrated") && retriesLeft > 0) {
          scheduleRelocate(retriesLeft - 1);
        }
      }, 700);
    };

    search.addEventListener("input", () => scheduleRefresh(false));
    tags.addEventListener("change", event => {
      const target = /** @type {HTMLElement} */ (event.target);
      const label = target.closest?.(".zpo-tag");
      label?.classList.toggle("is-selected", Boolean(/** @type {HTMLInputElement} */ (target).checked));
      scheduleRefresh(true);
    });

    closeButton.addEventListener("click", () => {
      doc.getElementById(DOCK_ID)?.classList.add("is-hidden");
    });

    reclassifyButton.addEventListener("click", async () => {
      reclassifyButton.setAttribute("disabled", "true");
      status.textContent = "Re-classifying...";

      try {
        const result = await app.Core.BatchProcessor.reclassifyLibrary({
          win,
          onProgress: (processed, total) => {
            if (processed % 25 === 0 || processed === total) {
              status.textContent = `Re-classifying ${processed}/${total}`;
            }
          }
        });
        status.textContent = `Updated ${result.changed} of ${result.processed} papers`;
        await refreshList(win, root, list, status, overviewPanel, explanationPanel, tags, true);
      }
      catch (error) {
        Zotero.logError(error);
        status.textContent = "Re-classify failed";
      }
      finally {
        reclassifyButton.removeAttribute("disabled");
      }
    });

    const observerID = Zotero.Notifier.registerObserver({
      /**
       * @param {string} event
       * @param {string} type
       */
      notify: function notify(event, type) {
        if (type === "item" || type === "item-tag") {
          scheduleRefresh(false);
        }
      }
    }, ["item", "item-tag"], `zotero-paper-organizer-sidebar-${Date.now()}-${Math.random()}`);

    win.ZoteroPaperOrganizerSidebarRefresh = refreshAllPanels;
    const cleanup = () => {
      win.clearTimeout(refreshTimer);
      win.clearTimeout(relocateTimer);
      panelRefreshers.delete(scheduleRefresh);
      Zotero.Notifier.unregisterObserver(observerID);
      root.remove();
    };

    scheduleRefresh();
    if (options.enableRelocate) {
      scheduleRelocate();
    }

    return cleanup;
  }

  /**
   * @param {HTMLElement} body
   */
  function cleanupSectionBody(body) {
    const bodyWithCleanup = /** @type {HTMLElement & { ZoteroPaperOrganizerPanelCleanup?: () => void }} */ (body);
    bodyWithCleanup.ZoteroPaperOrganizerPanelCleanup?.();
    delete bodyWithCleanup.ZoteroPaperOrganizerPanelCleanup;
  }

  function registerItemPaneSection() {
    if (registeredSectionID) {
      return true;
    }

    if (!Zotero.ItemPaneManager?.registerSection) {
      return false;
    }

    try {
      const paneID = Zotero.ItemPaneManager.registerSection({
        paneID: ITEM_PANE_ID,
        pluginID: PLUGIN_ID,
        header: {
          l10nID: "research-assistant-lite-pane-header",
          icon: HEADER_ICON
        },
        sidenav: {
          l10nID: "research-assistant-lite-pane-sidenav",
          icon: SIDENAV_ICON,
          orderable: true
        },
        onInit: ({ doc }) => {
          const win = doc.defaultView;
          if (win) {
            installLocalization(win);
            injectStyles(win);
          }
        },
        onDestroy: ({ body }) => {
          cleanupSectionBody(body);
        },
        onItemChange: ({ item, body, setEnabled, setSectionSummary }) => {
          const enabled = Boolean(item && app.Core.ZoteroAPI.isClassifiableItem(item));
          setEnabled(enabled);
          setSectionSummary(enabled ? "Ranked search, tags, overview" : "");
          const sectionRoot = body.querySelector(`#${PANEL_ID}`);
          if (sectionRoot) {
            /** @type {HTMLElement} */ (sectionRoot).dataset.zpoSelectedId = item?.id ? String(item.id) : "";
          }
          return enabled;
        },
        onRender: ({ doc, body }) => {
          const win = doc.defaultView;
          if (!win) {
            return;
          }

          installLocalization(win);
          injectStyles(win);
          cleanupSectionBody(body);
          const bodyWithCleanup = /** @type {HTMLElement & { ZoteroPaperOrganizerPanelCleanup?: () => void }} */ (body);
          bodyWithCleanup.ZoteroPaperOrganizerPanelCleanup = createPanel(win, body, {
            sectionMode: true,
            enableRelocate: false
          });
        },
        onAsyncRender: async () => {
          refreshAllPanels();
        }
      });

      if (!paneID) {
        return false;
      }

      registeredSectionID = paneID;
      Zotero.debug(`Research Assistant Lite registered item pane section ${paneID}`);
      return true;
    }
    catch (error) {
      Zotero.logError(error);
      registeredSectionID = "";
      return false;
    }
  }

  function unregisterItemPaneSection() {
    if (!registeredSectionID) {
      return;
    }

    try {
      Zotero.ItemPaneManager?.unregisterSection?.(registeredSectionID);
    }
    catch (error) {
      Zotero.logError(error);
    }
    finally {
      registeredSectionID = "";
    }
  }

  /**
   * @param {Window} win
   */
  function mount(win) {
    const doc = win.document;

    injectStyles(win);
    installLocalization(win);
    installMenu(win);

    if (registerItemPaneSection()) {
      win.ZoteroPaperOrganizerSidebarRefresh = refreshAllPanels;
      win.ZoteroPaperOrganizerSidebarCleanup = () => {
        unregisterItemPaneSection();
        doc.getElementById(MENU_ID)?.remove();
        doc.getElementById(STYLE_ID)?.remove();
        delete win.ZoteroPaperOrganizerSidebarRefresh;
        delete win.ZoteroPaperOrganizerSidebarCleanup;
      };
      return;
    }

    if (doc.getElementById(PANEL_ID)) {
      return;
    }

    const container = findSidebarContainer(win);
    if (!container) {
      Zotero.debug("Research Assistant Lite could not find a sidebar container");
      return;
    }

    const cleanupPanel = createPanel(win, container, {
      sectionMode: false,
      enableRelocate: true
    });

    win.ZoteroPaperOrganizerSidebarCleanup = () => {
      cleanupPanel();
      doc.getElementById(DOCK_ID)?.remove();
      doc.getElementById(MENU_ID)?.remove();
      doc.getElementById(STYLE_ID)?.remove();
      delete win.ZoteroPaperOrganizerSidebarRefresh;
      delete win.ZoteroPaperOrganizerSidebarCleanup;
    };
  }

  /**
   * @param {Window} win
   */
  function unmount(win) {
    win.ZoteroPaperOrganizerSidebarCleanup?.();
  }

  app.UI.Sidebar = {
    mount,
    unmount,
    togglePanel,
    installMenu
  };
})(/** @type {any} */ (globalThis));
