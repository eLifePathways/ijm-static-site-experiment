/**
 * Converts a collection title to a URL slug.
 * "Volume 1(1) Autumn 2007" → "volume-11-autumn-2007"
 */
export function issueSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[()]/g, '')
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
