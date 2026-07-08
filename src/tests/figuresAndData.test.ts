import { describe, it, expect } from 'vitest';
import { extractFiguresAndTables, articleHasFiguresOrTables, summarizeFiguresAndTables } from '@/utils/figuresAndData';

const image = (id: string) => ({
  type: 'image' as const,
  id,
  label: `Figure ${id}`,
  image: { alt: '', source: { filename: `${id}.tif` } },
});

const table = (id: string) => ({
  type: 'table' as const,
  id,
  label: `Table ${id}`,
  tables: ['<table></table>'],
});

describe('extractFiguresAndTables', () => {
  it('collects figure-node assets in document order, split by type', () => {
    const body = [
      { type: 'section', content: [{ type: 'figure', assets: [image('1')] }] },
      { type: 'figure', assets: [table('1')] },
      { type: 'figure', assets: [image('2')] },
    ];
    const { images, tables } = extractFiguresAndTables(body);
    expect(images.map((i) => i.id)).toEqual(['1', '2']);
    expect(tables.map((t) => t.id)).toEqual(['1']);
  });

  it('descends into nested sections at any depth', () => {
    const body = [
      {
        type: 'section',
        content: [
          { type: 'section', content: [{ type: 'section', content: [{ type: 'figure', assets: [image('deep')] }] }] },
        ],
      },
    ];
    expect(extractFiguresAndTables(body).images.map((i) => i.id)).toEqual(['deep']);
  });

  it('collects bare image/table nodes (not wrapped in a figure node)', () => {
    const body = [{ type: 'image', id: 'bare-img', image: { alt: '', source: { filename: 'a.tif' } } }, { type: 'table', id: 'bare-table', tables: ['<table></table>'] }];
    const { images, tables } = extractFiguresAndTables(body);
    expect(images.map((i) => i.id)).toEqual(['bare-img']);
    expect(tables.map((t) => t.id)).toEqual(['bare-table']);
  });

  it('descends into list items', () => {
    const body = [{ type: 'list', items: [[{ type: 'figure', assets: [image('in-list')] }]] }];
    expect(extractFiguresAndTables(body).images.map((i) => i.id)).toEqual(['in-list']);
  });

  it('returns empty arrays when there are no figures', () => {
    expect(extractFiguresAndTables([{ type: 'paragraph', text: 'hi' }])).toEqual({ images: [], tables: [] });
  });
});

describe('articleHasFiguresOrTables', () => {
  it('is false for a poa (preprint) article even with figures', () => {
    expect(
      articleHasFiguresOrTables({ status: 'poa', body: [{ type: 'figure', assets: [image('1')] }] }),
    ).toBe(false);
  });

  it('is true for a vor article with at least one figure', () => {
    expect(
      articleHasFiguresOrTables({ status: 'vor', body: [{ type: 'figure', assets: [image('1')] }] }),
    ).toBe(true);
  });

  it('checks appendices too', () => {
    expect(
      articleHasFiguresOrTables({ status: 'vor', body: [], appendices: [{ type: 'figure', assets: [table('1')] }] }),
    ).toBe(true);
  });

  it('is false for a vor article with no figures/tables at all', () => {
    expect(articleHasFiguresOrTables({ status: 'vor', body: [{ type: 'paragraph', text: 'hi' }] })).toBe(false);
  });
});

describe('summarizeFiguresAndTables', () => {
  it('pluralizes both counts', () => {
    expect(summarizeFiguresAndTables([image('1'), image('2')], [table('1')])).toBe(
      'This article contains 2 figures and 1 table.',
    );
  });

  it('uses singular wording for a count of one', () => {
    expect(summarizeFiguresAndTables([image('1')], [])).toBe('This article contains 1 figure.');
  });

  it('omits the missing kind entirely', () => {
    expect(summarizeFiguresAndTables([], [table('1'), table('2')])).toBe('This article contains 2 tables.');
  });

  it('returns null when there is nothing to summarize', () => {
    expect(summarizeFiguresAndTables([], [])).toBeNull();
  });
});
