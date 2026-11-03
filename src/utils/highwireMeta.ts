import { convertInlineFormatting, formatAffiliation, formatCitationDate, resolvePdfPath } from '@/utils/articleContent';

// Highwire Press `citation_*` tags — what Google Scholar (and Zotero/Mendeley)
// read first when indexing an article page; Dublin Core is only a fallback
// for them. The legacy PHP site never emitted these, so there's no legacy
// output to match: tag names and formats follow Google Scholar's inclusion
// guidelines (https://scholar.google.com/intl/en/scholar/inclusion.html).

export interface HighwireArticle {
  id: string;
  doi: string;
  title: string;
  published: string;
  volume: number;
  issue?: number;
  fpage: number | string;
  lpage: number | string;
  pdf: string;
  keywords?: string[];
  authors?: Array<{
    type: string;
    name?: { preferred: string };
    affiliations?: Array<{ name: string[]; address?: { formatted: string[] } }>;
  }>;
}

export interface MetaTag {
  name: string;
  content: string;
}

export function buildHighwireMeta(article: HighwireArticle, siteUrl: string): MetaTag[] {
  const { id, doi, title, published, volume, issue, fpage, lpage, pdf, keywords, authors } = article;
  const tag = (name: string, content: string | number): MetaTag => ({ name, content: String(content) });

  return [
    // Titles can carry inline HTML (<i>, small-caps spans) — tags want plain text.
    tag('citation_title', convertInlineFormatting(title, 'ris')),
    // Each author's institutions must directly follow that author's tag —
    // Scholar associates them by order.
    ...(authors ?? [])
      .filter((a) => a.type === 'person' && a.name)
      .flatMap((a) => [
        tag('citation_author', a.name!.preferred),
        ...(a.affiliations ?? []).map((aff) => tag('citation_author_institution', formatAffiliation(aff))),
      ]),
    tag('citation_publication_date', formatCitationDate(published).slashDate),
    tag('citation_journal_title', 'International Journal of Microsimulation'),
    tag('citation_journal_abbrev', 'IJM'),
    tag('citation_issn', '1747-5864'),
    tag('citation_publisher', 'International Journal of Microsimulation'),
    tag('citation_volume', volume),
    ...(issue ? [tag('citation_issue', issue)] : []),
    tag('citation_firstpage', fpage),
    tag('citation_lastpage', lpage),
    tag('citation_doi', doi),
    tag('citation_language', 'en'),
    ...(keywords ?? []).map((k) => tag('citation_keywords', convertInlineFormatting(k, 'ris'))),
    tag('citation_abstract_html_url', `${siteUrl}/articles/${id}`),
    tag('citation_fulltext_html_url', `${siteUrl}/articles/${id}`),
    tag('citation_pdf_url', `${siteUrl}${resolvePdfPath(pdf)}`),
  ];
}
