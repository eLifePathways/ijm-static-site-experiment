import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { buildHighwireMeta, type HighwireArticle } from '@/utils/highwireMeta';

const SITE = 'https://microsimulation.pub';

function loadArticle(id: string): HighwireArticle {
  const path = resolve('./data/articles', `${id}.json`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

const values = (tags: ReturnType<typeof buildHighwireMeta>, name: string) =>
  tags.filter((t) => t.name === name).map((t) => t.content);

describe('buildHighwireMeta', () => {
  const article = loadArticle('00110');
  const tags = buildHighwireMeta(article, SITE);

  it('emits the core bibliographic tags for a real article', () => {
    expect(values(tags, 'citation_title')).toEqual([
      'Spot on or way off? Validating results of the AVID microsimulation model retrospectively',
    ]);
    expect(values(tags, 'citation_journal_title')).toEqual(['International Journal of Microsimulation']);
    expect(values(tags, 'citation_issn')).toEqual(['1747-5864']);
    expect(values(tags, 'citation_volume')).toEqual([String(article.volume)]);
    expect(values(tags, 'citation_issue')).toEqual(['1']);
    expect(values(tags, 'citation_firstpage')).toEqual(['3']);
    expect(values(tags, 'citation_lastpage')).toEqual(['32']);
    expect(values(tags, 'citation_doi')).toEqual([article.doi]);
    expect(values(tags, 'citation_publication_date')[0]).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
  });

  it('uses absolute, same-site URLs for the article and its PDF', () => {
    expect(values(tags, 'citation_abstract_html_url')).toEqual([`${SITE}/articles/00110`]);
    expect(values(tags, 'citation_pdf_url')).toEqual([`${SITE}/files/00110/ijm-00110.pdf`]);
  });

  it("places each author's institutions directly after that author", () => {
    const names = tags.map((t) => t.name);
    const first = names.indexOf('citation_author');
    expect(tags[first].content).toBe('Dina Frommert');
    expect(tags[first + 1]).toEqual({
      name: 'citation_author_institution',
      content: 'Deutsche Rentenversicherung Bund, Germany',
    });
  });

  it('strips inline HTML from the title and skips non-person authors and a missing issue', () => {
    const fixture: HighwireArticle = {
      ...article,
      title: 'The <i>Homo economicus</i> &amp; rationality',
      issue: undefined,
      authors: [{ type: 'group' }, { type: 'person', name: { preferred: 'A Person' } }],
    };
    const out = buildHighwireMeta(fixture, SITE);
    expect(values(out, 'citation_title')).toEqual(['The Homo economicus & rationality']);
    expect(values(out, 'citation_author')).toEqual(['A Person']);
    expect(values(out, 'citation_issue')).toEqual([]);
  });
});
