import { describe, it, expect } from 'vitest';
import { issueSlug, articleTypeLabel, ARTICLE_TYPE_LABELS } from '@/utils/slugs';

describe('issueSlug', () => {
  it('converts a volume title to a URL-safe slug', () => {
    expect(issueSlug('Volume 1(1) Autumn 2007')).toBe('volume-11-autumn-2007');
    expect(issueSlug('Volume 19(1) Spring 2026')).toBe('volume-191-spring-2026');
    expect(issueSlug('Volume 10(3) Winter 2016')).toBe('volume-103-winter-2016');
  });

  it('produces no leading or trailing hyphens', () => {
    const slug = issueSlug('Volume 1(1) Autumn 2007');
    expect(slug).not.toMatch(/^-|-$/);
  });

  it('produces only lowercase alphanumerics and hyphens', () => {
    const slug = issueSlug('Volume 1(1) Autumn 2007');
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('articleTypeLabel', () => {
  it('returns the correct plural display name for known types', () => {
    expect(articleTypeLabel('scientific-correspondence')).toBe('Book reviews');
    expect(articleTypeLabel('short-report')).toBe('Research notes');
    expect(articleTypeLabel('tools-resources')).toBe('Data watch');
    expect(articleTypeLabel('registered-report')).toBe('Software reviews');
    expect(articleTypeLabel('research-article')).toBe('Research articles');
    expect(articleTypeLabel('editorial')).toBe('Editorials');
    expect(articleTypeLabel('feature')).toBe('Feature articles');
  });

  it('falls back to the raw type string for unknown types', () => {
    expect(articleTypeLabel('unknown-type')).toBe('unknown-type');
  });
});

describe('ARTICLE_TYPE_LABELS', () => {
  it('covers all article types present in the data', () => {
    const dataTypes = [
      'editorial',
      'feature',
      'registered-report',
      'research-article',
      'scientific-correspondence',
      'short-report',
      'tools-resources',
    ];
    for (const type of dataTypes) {
      expect(ARTICLE_TYPE_LABELS).toHaveProperty(type);
    }
  });
});
