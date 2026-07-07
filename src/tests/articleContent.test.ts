import { describe, it, expect } from 'vitest';
import {
  formatAuthorList,
  citationAuthorNames,
  formatCiteAsAuthors,
  formatCitationDate,
  convertInlineFormatting,
  formatAffiliation,
  uniqueAffiliations,
  formatLongDate,
} from '@/utils/articleContent';

const person = (preferred: string, index: string) => ({
  type: 'person',
  name: { preferred, index },
});

describe('formatAuthorList', () => {
  it('joins multiple authors with ", "', () => {
    expect(
      formatAuthorList([person('Alfred Afeku', 'Afeku, Alfred'), person('Kevin Kilcline', 'Kilcline, Kevin')]),
    ).toBe('Alfred Afeku, Kevin Kilcline');
  });

  it('filters out non-person entries', () => {
    expect(
      formatAuthorList([person('Alfred Afeku', 'Afeku, Alfred'), { type: 'group' } as never]),
    ).toBe('Alfred Afeku');
  });

  it('returns an empty string for no authors', () => {
    expect(formatAuthorList([])).toBe('');
  });
});

describe('citationAuthorNames', () => {
  it('returns surname-first index names', () => {
    expect(
      citationAuthorNames([person('Alfred Afeku', 'Afeku, Alfred'), person('Kevin Kilcline', 'Kilcline, Kevin')]),
    ).toEqual(['Afeku, Alfred', 'Kilcline, Kevin']);
  });

  it('filters out non-person entries', () => {
    expect(citationAuthorNames([{ type: 'group' } as never])).toEqual([]);
  });
});

describe('formatCiteAsAuthors', () => {
  it('derives "Initial. Surname" from the index name', () => {
    expect(formatCiteAsAuthors([person('Alfred Afeku', 'Afeku, Alfred')])).toBe('A. Afeku');
  });

  it('joins multiple authors with ", "', () => {
    expect(
      formatCiteAsAuthors([
        person('Alfred Afeku', 'Afeku, Alfred'),
        person('Cathal O’Donoghue', 'O’Donoghue, Cathal'),
        person('Kevin Kilcline', 'Kilcline, Kevin'),
      ]),
    ).toBe('A. Afeku, C. O’Donoghue, K. Kilcline');
  });

  it('uses only the first initial for multi-word given names', () => {
    expect(formatCiteAsAuthors([person('John Paul Smith', 'Smith, John Paul')])).toBe('J. Smith');
  });

  it('falls back to the bare surname when there is no given name', () => {
    expect(formatCiteAsAuthors([person('Prince', 'Prince')])).toBe('Prince');
  });
});

describe('formatCitationDate', () => {
  it('formats year/month/ymd/slashDate from an ISO date', () => {
    expect(formatCitationDate('2026-06-09T00:00:00Z')).toEqual({
      year: 2026,
      month: 'jun',
      ymd: '2026-06-09',
      slashDate: '2026/06/09',
    });
  });

  it('zero-pads single-digit months and days', () => {
    expect(formatCitationDate('2025-01-05T00:00:00Z')).toEqual({
      year: 2025,
      month: 'jan',
      ymd: '2025-01-05',
      slashDate: '2025/01/05',
    });
  });

  it('handles the December/year-end edge', () => {
    const result = formatCitationDate('2020-12-31T00:00:00Z');
    expect(result.month).toBe('dec');
    expect(result.ymd).toBe('2020-12-31');
  });
});

describe('formatAffiliation', () => {
  it('joins name and formatted address', () => {
    expect(
      formatAffiliation({
        name: ['Dept of International Trade and Finance, Adana Alparslan Türkeş University'],
        address: { formatted: ['Adana', 'Turkey'] },
      }),
    ).toBe('Dept of International Trade and Finance, Adana Alparslan Türkeş University, Adana, Turkey');
  });

  it('handles a missing address', () => {
    expect(formatAffiliation({ name: ['University of Galway'] })).toBe('University of Galway');
  });

  it('supports a multi-part name array', () => {
    expect(formatAffiliation({ name: ['Dept A', 'Faculty B'], address: { formatted: ['Ireland'] } })).toBe(
      'Dept A, Faculty B, Ireland',
    );
  });
});

describe('uniqueAffiliations', () => {
  const aff = (name: string) => ({ name: [name] });

  it('dedupes affiliations shared across authors, preserving first-seen order', () => {
    const authors = [
      { type: 'person', affiliations: [aff('University of Galway'), aff('Teagasc')] },
      { type: 'person', affiliations: [aff('Teagasc'), aff('J.E. Cairnes School')] },
    ];
    expect(uniqueAffiliations(authors)).toEqual(['University of Galway', 'Teagasc', 'J.E. Cairnes School']);
  });

  it('returns an empty array when no author has affiliations', () => {
    expect(uniqueAffiliations([{ type: 'person' }])).toEqual([]);
  });
});

describe('formatLongDate', () => {
  it('formats a full month name, day, and year', () => {
    expect(formatLongDate('2025-06-04T00:00:00Z')).toBe('June 4, 2025');
  });

  it('does not zero-pad the day', () => {
    expect(formatLongDate('2025-01-05T00:00:00Z')).toBe('January 5, 2025');
  });
});

describe('convertInlineFormatting', () => {
  describe('target: tex', () => {
    it('converts italics to \\textit{}', () => {
      expect(convertInlineFormatting('<i>Homo sapiens</i>', 'tex')).toBe('\\textit{Homo sapiens}');
      expect(convertInlineFormatting('<em>Homo sapiens</em>', 'tex')).toBe('\\textit{Homo sapiens}');
    });

    it('converts bold to \\textbf{}', () => {
      expect(convertInlineFormatting('<b>important</b>', 'tex')).toBe('\\textbf{important}');
      expect(convertInlineFormatting('<strong>important</strong>', 'tex')).toBe('\\textbf{important}');
    });

    it('converts sup to \\textsuperscript{}', () => {
      expect(convertInlineFormatting('x<sup>2</sup>', 'tex')).toBe('x\\textsuperscript{2}');
    });

    it('converts small-caps spans to \\textsc{}', () => {
      expect(convertInlineFormatting('<span class="small-caps">Smith</span>', 'tex')).toBe('\\textsc{Smith}');
    });

    it('converts underline spans to \\uline{}', () => {
      expect(convertInlineFormatting('<span class="underline">key term</span>', 'tex')).toBe('\\uline{key term}');
    });

    it('escapes LaTeX special characters', () => {
      expect(convertInlineFormatting('100% of $5 & _extra_', 'tex')).toBe('100\\% of \\$5 \\& \\_extra\\_');
    });

    it('decodes HTML entities before escaping', () => {
      // "&amp;" decodes to "&", which then gets LaTeX-escaped to "\&"
      expect(convertInlineFormatting('A &amp; B', 'tex')).toBe('A \\& B');
    });

    it('strips unrecognized tags without escaping their content', () => {
      expect(convertInlineFormatting('<p>plain</p>', 'tex')).toBe('plain');
    });
  });

  describe('target: ris', () => {
    it('strips tags down to plain text without LaTeX conversion', () => {
      expect(convertInlineFormatting('<i>Homo sapiens</i>', 'ris')).toBe('Homo sapiens');
    });

    it('does not escape special characters', () => {
      expect(convertInlineFormatting('100% of $5 & _extra_', 'ris')).toBe('100% of $5 & _extra_');
    });

    it('decodes HTML entities', () => {
      expect(convertInlineFormatting('A &amp; B &lt;C&gt;', 'ris')).toBe('A & B <C>');
    });
  });
});
