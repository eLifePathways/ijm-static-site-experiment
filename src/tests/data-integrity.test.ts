/**
 * Validates the raw JSON data files in api/data/ without going through Astro's
 * content layer. Catches broken references and schema violations early.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const DATA_ROOT = resolve('../api/data');
const ARTICLES_DIR = join(DATA_ROOT, 'articles');
const COLLECTIONS_DIR = join(DATA_ROOT, 'collections');
const SUBJECTS_DIR = join(DATA_ROOT, 'subjects');

function readJson(filePath: string) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function allArticles() {
  return readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ file: f, data: readJson(join(ARTICLES_DIR, f)) }));
}

function allCollections() {
  return readdirSync(COLLECTIONS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ file: f, data: readJson(join(COLLECTIONS_DIR, f)) }));
}

function allSubjects() {
  return readdirSync(SUBJECTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ file: f, data: readJson(join(SUBJECTS_DIR, f)) }));
}

const REQUIRED_ARTICLE_FIELDS = [
  'id', 'type', 'doi', 'title', 'published', 'volume', 'issue',
  'fpage', 'lpage', 'pdf', 'body',
];

const VALID_ARTICLE_TYPES = new Set([
  'editorial', 'research-article', 'short-report', 'scientific-correspondence',
  'tools-resources', 'registered-report', 'feature',
]);

describe('Article data integrity', () => {
  const articles = allArticles();

  it('loads at least 300 articles', () => {
    expect(articles.length).toBeGreaterThanOrEqual(300);
  });

  it('all articles have required fields', () => {
    for (const { file, data } of articles) {
      for (const field of REQUIRED_ARTICLE_FIELDS) {
        expect(data, `${file} is missing field "${field}"`).toHaveProperty(field);
      }
    }
  });

  it('all article IDs are unique', () => {
    const ids = articles.map(({ data }) => data.id as string);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all article types are from the known set', () => {
    for (const { file, data } of articles) {
      expect(
        VALID_ARTICLE_TYPES.has(data.type),
        `${file} has unknown type "${data.type}"`,
      ).toBe(true);
    }
  });

  it('all article IDs match their filename (without .json)', () => {
    for (const { file, data } of articles) {
      expect(data.id, `${file}: id field does not match filename`).toBe(
        file.replace('.json', ''),
      );
    }
  });

  it('all pdf fields use a consistent path format', () => {
    for (const { file, data } of articles) {
      expect(
        typeof data.pdf === 'string' && data.pdf.includes(data.id),
        `${file}: pdf field "${data.pdf}" does not reference the article id`,
      ).toBe(true);
    }
  });
});

describe('Collection data integrity', () => {
  const collections = allCollections();
  const articleIds = new Set(allArticles().map(({ data }) => data.id as string));

  it('loads at least 40 collections', () => {
    expect(collections.length).toBeGreaterThanOrEqual(40);
  });

  it('all collections have id, title, published, content', () => {
    for (const { file, data } of collections) {
      expect(data, `${file}`).toHaveProperty('id');
      expect(data, `${file}`).toHaveProperty('title');
      expect(data, `${file}`).toHaveProperty('published');
      expect(Array.isArray(data.content), `${file}: content must be an array`).toBe(true);
    }
  });

  it('all collection article references point to existing articles', () => {
    for (const { file, data } of collections) {
      for (const ref of data.content as string[]) {
        expect(
          articleIds.has(ref),
          `${file}: references unknown article id "${ref}"`,
        ).toBe(true);
      }
    }
  });
});

describe('Subject data integrity', () => {
  const subjects = allSubjects();

  it('loads exactly 20 subjects', () => {
    expect(subjects.length).toBe(20);
  });

  it('all subjects have id and name', () => {
    for (const { file, data } of subjects) {
      expect(data, `${file}`).toHaveProperty('id');
      expect(data, `${file}`).toHaveProperty('name');
    }
  });

  it('all subject IDs match their filename', () => {
    for (const { file, data } of subjects) {
      expect(data.id, `${file}: id does not match filename`).toBe(
        file.replace('.json', ''),
      );
    }
  });
});
