(function initResearchOverview(global) {
  "use strict";

  const g = /** @type {any} */ (global);
  g.ZoteroPaperOrganizer = g.ZoteroPaperOrganizer || {};
  const app = /** @type {any} */ (g.ZoteroPaperOrganizer);
  app.Overview = app.Overview || {};

  /**
   * @param {Date} date
   * @returns {string}
   */
  function toDateKey(date) {
    return date.toISOString().slice(0, 10);
  }

  /**
   * @param {string} value
   * @returns {Date | null}
   */
  function parseDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  /**
   * @param {Array<{ tags: string[], dateAdded: string }>} items
   * @param {string[]} tags
   * @param {Date} [now]
   * @returns {{ tagCounts: Array<{ tag: string, count: number }>, recent7Days: Array<{ date: string, count: number }>, recent7DayTotal: number, topDirection: { tag: string, count: number } | null }}
   */
  function buildOverview(items, tags, now = new Date()) {
    const tagCounts = tags.map(tag => ({
      tag,
      count: items.filter(item => item.tags.includes(tag)).length
    }));

    const dayCounts = new Map();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + offset);
      dayCounts.set(toDateKey(date), 0);
    }

    for (const item of items) {
      const date = parseDate(item.dateAdded);

      if (!date) {
        continue;
      }

      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);

      if (dateOnly >= start && dateOnly <= now) {
        const key = toDateKey(dateOnly);
        dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
      }
    }

    const recent7Days = [...dayCounts.entries()].map(([date, count]) => ({ date, count }));
    const recent7DayTotal = recent7Days.reduce((sum, day) => sum + day.count, 0);
    const topDirection = tagCounts
      .filter(entry => entry.count > 0)
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))[0] || null;

    return {
      tagCounts,
      recent7Days,
      recent7DayTotal,
      topDirection
    };
  }

  app.Overview.ResearchOverview = {
    buildOverview,
    toDateKey,
    parseDate
  };
})(/** @type {any} */ (globalThis));
