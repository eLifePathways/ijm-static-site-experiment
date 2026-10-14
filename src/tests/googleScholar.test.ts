import { describe, it, expect } from 'vitest';
import { googleScholarUrl } from '@/utils/googleScholar';

const person = (preferred: string) => ({ type: 'person', name: { preferred, index: preferred } });

describe('googleScholarUrl', () => {
  // Expected URLs are taken from the legacy site's 00110 / 00105 reference lists.
  it('builds a journal lookup with journal, volume and pages', () => {
    expect(
      googleScholarUrl({
        type: 'journal',
        articleTitle: 'Validating a dynamic population microsimulation model: Recent experience in Australia',
        authors: [person('A Harding'), person('M Keegan'), person('S Kelly')],
        date: '2010',
        journal: 'International Journal of Microsimulation',
        volume: '3',
        pages: { first: '46', last: '64', range: '46–64' },
      }),
    ).toBe(
      'https://scholar.google.com/scholar_lookup?title=Validating+a+dynamic+population+microsimulation+model%3A+Recent+experience+in+Australia&author=A+Harding&author=M+Keegan&author=S+Kelly&publication_year=2010&journal=International+Journal+of+Microsimulation&volume=3&pages=pp.+46%E2%80%9364',
    );
  });

  it('uses the chapter title for book chapters', () => {
    expect(
      googleScholarUrl({
        type: 'book-chapter',
        chapterTitle: 'Dynamic Models',
        bookTitle: 'New pathways in microsimulation',
        authors: [person('J Li')],
        date: '2014',
        pages: { first: '305', last: '343', range: '305–343' },
      }),
    ).toBe(
      'https://scholar.google.com/scholar_lookup?title=Dynamic+Models&author=J+Li&publication_year=2014&pages=pp.+305%E2%80%93343',
    );
  });

  it('puts the conference name before the authors', () => {
    expect(
      googleScholarUrl({
        type: 'conference-proceeding',
        articleTitle: 'Parallel discrete-event simulation tool for population analysis',
        conference: { name: ['Proceedings of the Operational Research Society Simulation Workshop 2010 (sw10)'] },
        authors: [person('B Onggo')],
        date: '2010',
      }),
    ).toBe(
      'https://scholar.google.com/scholar_lookup?title=Parallel+discrete-event+simulation+tool+for+population+analysis&conference=Proceedings+of+the+Operational+Research+Society+Simulation+Workshop+2010+%28sw10%29&author=B+Onggo&publication_year=2010',
    );
  });

  it('passes free-text pages through without a "pp." prefix', () => {
    const url = googleScholarUrl({ type: 'journal', articleTitle: 'Jamsim', date: '2012', pages: '8' });
    expect(new URL(url!).searchParams.get('pages')).toBe('8');
  });

  it('uses group names as authors', () => {
    const url = googleScholarUrl({
      type: 'book',
      bookTitle: 'Adequate and Sustainable Pensions',
      authors: [{ type: 'group', name: 'European Community EC' }],
      date: '2003',
    });
    expect(new URL(url!).searchParams.getAll('author')).toEqual(['European Community EC']);
  });

  it('strips inline HTML from the title', () => {
    const url = googleScholarUrl({ type: 'unknown', title: '<i>Homo</i> &amp; economics', date: '2001' });
    expect(new URL(url!).searchParams.get('title')).toBe('Homo & economics');
  });

  it('uses articleTitle (not chapterTitle) for conference proceedings', () => {
    const url = googleScholarUrl({
      type: 'conference-proceeding',
      articleTitle: 'Modelling our Future',
      chapterTitle: 'Model 2: DYNAMOD',
      date: '2007',
    });
    expect(new URL(url!).searchParams.get('title')).toBe('Modelling our Future');
  });

  it("uses a thesis's single author over the placeholder authors list", () => {
    const url = googleScholarUrl({
      type: 'thesis',
      title: 'Regional Income Inequality',
      author: person('E Sommeiller'),
      authors: [{ type: 'group', name: 'n/a' }],
      date: '2006',
    });
    expect(new URL(url!).searchParams.getAll('author')).toEqual(['E Sommeiller']);
  });

  it("omits a book's page count", () => {
    const url = googleScholarUrl({ type: 'book', bookTitle: 'Analysing health status', date: '2006', pages: '22' });
    expect(new URL(url!).searchParams.has('pages')).toBe(false);
  });

  it('appends the PubMed ID last', () => {
    const url = googleScholarUrl({ type: 'journal', articleTitle: 'X', date: '2011', pages: '2', pmid: 24376472 });
    expect(url).toMatch(/&pages=2&pmid=24376472$/);
  });

  it.each(['web', 'software', 'data'])('returns undefined for %s references', (type) => {
    expect(googleScholarUrl({ type, title: 'Something', date: '2014' })).toBeUndefined();
  });
});
