/**
 * buildBibTeX/buildRIS back [id].bib.ts / [id].ris.ts. They're pure
 * functions of article data, extracted out of the route files specifically
 * so they're testable without astro:content (which only resolves inside
 * Astro's own Vite pipeline, even though the routes' GET handlers never
 * call it directly) — same real-fixture approach as data-integrity.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { buildBibTeX, buildRIS, type CitableArticle } from '@/utils/articleContent';

function loadArticle(id: string): CitableArticle {
  const path = resolve('../api/data/articles', `${id}.json`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

describe('buildBibTeX', () => {
  const article = loadArticle('00338');

  it('produces a well-formed BibTeX entry for a real article', () => {
    const body = buildBibTeX(article);

    expect(body).toContain(`@article {${article.doi},`);
    expect(body).toContain('author = {Afeku, Alfred and O’Donoghue, Cathal and Kilcline, Kevin},');
    expect(body).toContain('volume = 19,');
    expect(body).toContain('number = 1,');
    expect(body).toContain('year = 2026,');
    expect(body).toContain('month = {jun},');
    expect(body).toContain(`doi = {${article.doi}},`);
    expect(body).toContain(`citation = {IJM 2026;19(1):${article.elocationId}},`);
    expect(body.trim().endsWith('}')).toBe(true);
  });

  it('escapes LaTeX special characters and converts inline formatting in title/abstract/keywords', () => {
    const fixture: CitableArticle = {
      ...article,
      title: 'The <i>Homo economicus</i> assumption & 100% rationality',
      abstract: { content: [{ text: 'A $5 discount, <b>strong claim</b>.' }] },
      keywords: ['supply & demand'],
    };
    const body = buildBibTeX(fixture);
    expect(body).toContain('title = {The \\textit{Homo economicus} assumption \\& 100\\% rationality},');
    expect(body).toContain('abstract = {A \\$5 discount, \\textbf{strong claim}.},');
    expect(body).toContain('keywords = {supply \\& demand},');
  });

  it('omits optional fields when absent', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { issue, ...withoutIssue } = article;
    const body = buildBibTeX(withoutIssue as CitableArticle);
    expect(body).not.toContain('number =');
  });
});

describe('buildRIS', () => {
  const article = loadArticle('00338');

  it('produces a well-formed RIS entry for a real article', () => {
    const body = buildRIS(article);

    expect(body).toContain('TY  - JOUR');
    expect(body).toContain('TI  - Economic and Environmental Impact Analysis');
    expect(body).toContain('AU  - Afeku, Alfred');
    expect(body).toContain('AU  - O’Donoghue, Cathal');
    expect(body).toContain('AU  - Kilcline, Kevin');
    expect(body).toContain('VL  - 19');
    expect(body).toContain('IS  - 1');
    expect(body).toContain('PY  - 2026');
    expect(body).toContain('DA  - 2026/06/09');
    expect(body).toContain(`DO  - ${article.doi}`);
    expect(body.endsWith('ER  - ')).toBe(true);
    // RIS uses CRLF line endings
    expect(body).toContain('\r\n');
  });

  it('does not apply LaTeX escaping, only plain-text conversion', () => {
    const fixture: CitableArticle = {
      ...article,
      title: 'The <i>Homo economicus</i> assumption & 100% rationality',
    };
    const body = buildRIS(fixture);
    expect(body).toContain('TI  - The Homo economicus assumption & 100% rationality');
  });
});
