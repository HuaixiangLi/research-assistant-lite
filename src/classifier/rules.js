/**
 * Fallback local keyword rules used before rules.json is loaded.
 *
 * The plugin intentionally keeps these rules simple: no network, no AI calls,
 * no embeddings, and no external services.
 */
(function initRules(global) {
  "use strict";

  const g = /** @type {any} */ (global);
  g.ZoteroPaperOrganizer = g.ZoteroPaperOrganizer || {};
  const app = /** @type {any} */ (g.ZoteroPaperOrganizer);
  app.Rules = app.Rules || {};
  app.Classifier = app.Classifier || {};

  app.Rules.DEFAULT_RULE_CONFIG = {
    "PDH": {
      keywords: [
        "propane dehydrogenation",
        "dehydrogenation of propane",
        "PDH",
        "propylene production"
      ],
      weight: 3
    },
    "CO2 hydrogenation": {
      keywords: [
        "CO2 hydrogenation",
        "carbon dioxide hydrogenation",
        "CO2 conversion",
        "CO2 activation",
        "CO2-based methanol",
        "methanol synthesis",
        "formate"
      ],
      weight: 3
    },
    "Ni catalyst": {
      keywords: ["Ni", "nickel", "Ni-based", "nickel-based"],
      weight: 2,
      wordBoundary: true
    },
    "Pt catalyst": {
      keywords: ["Pt", "platinum", "Pt-Sn", "PtSn"],
      weight: 2,
      wordBoundary: true
    },
    "In catalyst": {
      keywords: ["In2O3", "indium", "InOx", "In-based"],
      weight: 2
    },
    "Catalyst stability": {
      keywords: [
        "catalyst stability",
        "stability",
        "deactivation",
        "sintering",
        "coke formation",
        "coking",
        "regeneration"
      ],
      weight: 2
    },
    "Reaction mechanism": {
      keywords: [
        "reaction mechanism",
        "mechanism",
        "active site",
        "kinetic",
        "kinetics",
        "DFT",
        "in situ",
        "operando",
        "pathway"
      ],
      weight: 2
    },
    "Catalyst synthesis": {
      keywords: [
        "catalyst synthesis",
        "synthesis",
        "preparation method",
        "prepared by",
        "sol-gel",
        "impregnation",
        "hydrothermal",
        "atomic layer deposition"
      ],
      weight: 1
    },
    "Dry reforming": {
      keywords: [
        "dry reforming",
        "DRM",
        "methane reforming",
        "CO2 reforming of methane"
      ],
      weight: 2
    },
    "Oxidative dehydrogenation": {
      keywords: [
        "oxidative dehydrogenation",
        "ODH",
        "propane ODH",
        "ethane ODH"
      ],
      weight: 2
    },
    "2D materials": {
      keywords: [
        "two-dimensional",
        "2D",
        "MXene",
        "layered double hydroxide",
        "graphene",
        "boron nitride",
        "nanosheet"
      ],
      weight: 1
    },
    "Zeolite catalyst": {
      keywords: ["zeolite", "ZSM-5", "SAPO", "MFI", "Beta zeolite"],
      weight: 1
    },
    "review": {
      keywords: ["review", "recent progress", "advances and perspectives", "perspective"],
      weight: 1
    }
  };
  app.Rules.LEGACY_MANAGED_TAGS = ["stability"];

  /**
   * @param {string} tag
   * @returns {string}
   */
  function tagToID(tag) {
    return tag
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /**
   * @param {Record<string, { keywords?: string[], weight?: number, fields?: string[], wordBoundary?: boolean, name?: string }>} config
   * @returns {Array<{ id: string, tag: string, name: string, keywords: string[], weight: number, fields: string[], wordBoundary: boolean }>}
   */
  function normalizeRuleConfig(config) {
    return Object.entries(config || {})
      .map(([tag, rule]) => ({
        id: tagToID(tag),
        tag,
        name: rule.name || tag,
        keywords: Array.isArray(rule.keywords) ? rule.keywords.filter(Boolean) : [],
        weight: Number.isFinite(rule.weight) ? Number(rule.weight) : 1,
        fields: Array.isArray(rule.fields) && rule.fields.length ? rule.fields : ["title", "abstract"],
        wordBoundary: Boolean(rule.wordBoundary)
      }))
      .filter(rule => rule.tag && rule.keywords.length);
  }

  /**
   * @param {Record<string, { keywords?: string[], weight?: number, fields?: string[], wordBoundary?: boolean, name?: string }>} config
   * @returns {Array<{ id: string, tag: string, name: string, keywords: string[], weight: number, fields: string[], wordBoundary: boolean }>}
   */
  function applyRuleConfig(config) {
    app.Rules.activeRuleConfig = config;
    app.Classifier.CLASSIFICATION_RULES = normalizeRuleConfig(config);
    app.Classifier.CLASSIFICATION_TAGS = app.Classifier.CLASSIFICATION_RULES.map(rule => rule.tag);
    return app.Classifier.CLASSIFICATION_RULES;
  }

  app.Rules.normalizeRuleConfig = normalizeRuleConfig;
  app.Rules.applyRuleConfig = applyRuleConfig;
  app.Rules.getRules = () => app.Classifier.CLASSIFICATION_RULES || [];
  app.Rules.getTags = () => app.Classifier.CLASSIFICATION_TAGS || [];
  app.Rules.getLegacyTags = () => app.Rules.LEGACY_MANAGED_TAGS || [];

  applyRuleConfig(app.Rules.DEFAULT_RULE_CONFIG);
})(/** @type {any} */ (globalThis));
