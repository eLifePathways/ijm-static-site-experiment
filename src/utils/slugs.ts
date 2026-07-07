/**
 * Converts a collection title to a URL slug, matching the legacy PHP site's
 * cocur/slugify output exactly: "Volume 1(1) Autumn 2007" → "volume-1-1-autumn-2007"
 * (parentheses count as separators, not characters to delete — dropping them
 * outright previously merged volume/issue digits together, e.g. "10(1)" → "101").
 */
export function issueSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Maps internal article type IDs to their plural display names.
 * Mirrors ModelName.php in the PHP journal.
 */
export const ARTICLE_TYPE_LABELS: Record<string, string> = {
  correction: 'Corrections',
  editorial: 'Editorials',
  'research-article': 'Research articles',
  'research-communication': 'Commentary',
  'registered-report': 'Software reviews',
  'scientific-correspondence': 'Book reviews',
  'short-report': 'Research notes',
  'tools-resources': 'Data watch',
  feature: 'Feature articles',
};

export function articleTypeLabel(type: string): string {
  return ARTICLE_TYPE_LABELS[type] ?? type;
}

/**
 * Singular form, as used for a single article's type badge (e.g. teaser
 * cards) — confirmed against the live PHP app ("Editorial", "Research note").
 */
export const ARTICLE_TYPE_LABELS_SINGULAR: Record<string, string> = {
  correction: 'Correction',
  editorial: 'Editorial',
  'research-article': 'Research article',
  'research-communication': 'Commentary',
  'registered-report': 'Software review',
  'scientific-correspondence': 'Book review',
  'short-report': 'Research note',
  'tools-resources': 'Data watch',
  feature: 'Feature article',
};

export function articleTypeLabelSingular(type: string): string {
  return ARTICLE_TYPE_LABELS_SINGULAR[type] ?? type;
}
