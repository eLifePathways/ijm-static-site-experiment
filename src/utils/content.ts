import { getCollection, type CollectionEntry } from 'astro:content';

// astro:content's getCollection() deep-clones and traverses every entry's
// data on EVERY call (to resolve image()-schema references) — expensive for
// the articles collection (~340 articles, deeply nested body trees). None of
// our schemas use the image() helper, so that work is pure overhead we pay
// again each time a route or component calls getCollection() directly.
// Memoizing per build process turns N calls into 1.
let articlesPromise: Promise<CollectionEntry<'articles'>[]> | null = null;
export function getAllArticles() {
  articlesPromise ??= getCollection('articles');
  return articlesPromise;
}

let issuesPromise: Promise<CollectionEntry<'issues'>[]> | null = null;
export function getAllIssues() {
  issuesPromise ??= getCollection('issues');
  return issuesPromise;
}

let subjectsPromise: Promise<CollectionEntry<'subjects'>[]> | null = null;
export function getAllSubjects() {
  subjectsPromise ??= getCollection('subjects');
  return subjectsPromise;
}
