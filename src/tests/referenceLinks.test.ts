import { describe, it, expect } from 'vitest';
import { referenceHref } from '@/utils/referenceLinks';

describe('referenceHref', () => {
  it('prefers the DOI over the URI', () => {
    expect(referenceHref({ doi: '10.1016/j.techfore.2020.119946', uri: 'https://example.com' })).toBe(
      'https://doi.org/10.1016/j.techfore.2020.119946',
    );
  });

  it('falls back to the URI', () => {
    expect(referenceHref({ uri: 'https://code.google.com/p/jamsim/' })).toBe('https://code.google.com/p/jamsim/');
  });

  it('removes line-wrap spaces from the URI', () => {
    // 00014, bib24
    expect(referenceHref({ uri: 'http://www.microsimulation.org/IJM/ V2_1/IJM_2_1_2.pdf' })).toBe(
      'http://www.microsimulation.org/IJM/V2_1/IJM_2_1_2.pdf',
    );
  });

  it('unescapes HTML-escaped ampersands in the URI', () => {
    // 00288, bib31
    expect(referenceHref({ uri: 'https://ec.europa.eu/social/main.jsp?catId=738&amp;langId=en&amp;pubId=8219' })).toBe(
      'https://ec.europa.eu/social/main.jsp?catId=738&langId=en&pubId=8219',
    );
  });

  it('returns undefined with neither', () => {
    expect(referenceHref({})).toBeUndefined();
  });
});
