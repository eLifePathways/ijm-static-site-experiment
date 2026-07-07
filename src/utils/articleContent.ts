export function resolvePdfPath(pdfUrl: string): string {
  // http://web:8082/00201/ijm-00201.pdf → /files/00201/ijm-00201.pdf
  const match = pdfUrl.match(/\/(\d+\/ijm-[^/]+\.pdf)$/);
  return match ? `/files/${match[1]}` : pdfUrl;
}

export function resolveImagePath(articleId: string, filename: string): string {
  return `/images/${articleId}/${filename}`;
}

export function formatAuthorList(authors: Array<{ type: string; name?: { preferred: string } }>): string {
  return authors
    .filter((a) => a.type === 'person' && a.name)
    .map((a) => a.name!.preferred)
    .join(', ');
}

// Surname-first author names, as used in citation exports (matches the legacy
// PHP site's `indexName`, e.g. "Spielauer, Martin").
export function citationAuthorNames(authors: Array<{ type: string; name?: { index: string } }>): string[] {
  return authors.filter((a) => a.type === 'person' && a.name).map((a) => a.name!.index);
}

// "Initial. Surname" author list for the "Cite as:" line, e.g.
// "A. Afeku, C. O'Donoghue, K. Kilcline" — matches the legacy PHP site's
// citation format, derived from the same index name ("Afeku, Alfred").
export function formatCiteAsAuthors(authors: Array<{ type: string; name?: { index: string } }>): string {
  return authors
    .filter((a) => a.type === 'person' && a.name)
    .map((a) => {
      const [surname, given] = a.name!.index.split(', ');
      return given ? `${given.trim().charAt(0)}. ${surname}` : surname;
    })
    .join(', ');
}

interface Affiliation {
  name: string[];
  address?: { formatted: string[] };
}

// Full affiliation text, e.g. "Dept of Economics, University Road, Galway,
// Ireland" — used both for each author's own affiliation list and, deduped,
// for the masthead's institution line.
export function formatAffiliation(affiliation: Affiliation): string {
  return [...affiliation.name, ...(affiliation.address?.formatted ?? [])].join(', ');
}

// Unique institution list across all authors, in first-seen order — matches
// the legacy PHP site's masthead, which lists each institution once even
// when multiple authors share it.
export function uniqueAffiliations(authors: Array<{ type: string; affiliations?: Affiliation[] }>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const author of authors) {
    for (const affiliation of author.affiliations ?? []) {
      const formatted = formatAffiliation(affiliation);
      if (!seen.has(formatted)) {
        seen.add(formatted);
        result.push(formatted);
      }
    }
  }
  return result;
}

const MONTH_ABBR = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// "June 4, 2025" style, for the Publication History line — UTC-based like
// formatCitationDate below, to avoid the server/browser timezone shifting
// the date shown near midnight.
export function formatLongDate(isoDate: string): string {
  const d = new Date(isoDate);
  return `${MONTH_FULL[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function formatCitationDate(isoDate: string): { year: number; month: string; ymd: string; slashDate: string } {
  const d = new Date(isoDate);
  const year = d.getUTCFullYear();
  const monthIndex = d.getUTCMonth();
  const day = d.getUTCDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    year,
    month: MONTH_ABBR[monthIndex],
    ymd: `${year}-${pad(monthIndex + 1)}-${pad(day)}`,
    slashDate: `${year}/${pad(monthIndex + 1)}/${pad(day)}`,
  };
}

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const codePoint = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return String.fromCodePoint(codePoint);
    }
    return HTML_ENTITIES[code.toLowerCase()] ?? match;
  });
}

// Mirrors the legacy site's html2tex/html2ris Twig filters: strips markup down
// to plain text, converting the two inline styles actually used in this
// dataset (italics, small-caps) into LaTeX commands, and escaping LaTeX
// special characters for BibTeX exports.
export function convertInlineFormatting(html: string, target: 'tex' | 'ris'): string {
  let text = html;
  if (target === 'tex') {
    text = text.replace(/<(i|em)>([\s\S]*?)<\/\1>/gi, '\\textit{$2}');
    text = text.replace(/<(b|strong)>([\s\S]*?)<\/\1>/gi, '\\textbf{$2}');
    text = text.replace(/<sup>([\s\S]*?)<\/sup>/gi, '\\textsuperscript{$1}');
    text = text.replace(/<span class="small-caps">([\s\S]*?)<\/span>/gi, '\\textsc{$1}');
    text = text.replace(/<span class="underline">([\s\S]*?)<\/span>/gi, '\\uline{$1}');
  }
  text = decodeHtmlEntities(text.replace(/<[^>]+>/g, ''));
  if (target === 'tex') {
    text = text.replace(/[$%&_]/g, '\\$&');
  }
  return text;
}

// Shape shared by [id].bib.ts / [id].ris.ts — a subset of the full article
// schema, kept independent of astro:content types so these pure formatters
// (and the route handlers that call them) are testable without an Astro
// server or the astro:content virtual module.
export interface CitableArticle {
  doi: string;
  title: string;
  volume: number;
  issue?: number;
  published: string;
  elocationId: string;
  keywords?: string[];
  authors?: Array<{ type: string; name?: { index: string } }>;
  abstract?: { content?: Array<{ text: string }> } | null;
}

export function buildBibTeX(article: CitableArticle): string {
  const { doi, title, volume, issue, published, elocationId, keywords } = article;
  const authors = citationAuthorNames(article.authors ?? []);
  const { year, month, ymd } = formatCitationDate(published);
  const abstractParas = article.abstract?.content ?? [];

  const lines = [
    `@article {${doi},`,
    `article_type = {journal},`,
    `title = {${convertInlineFormatting(title, 'tex')}},`,
    `author = {${authors.join(' and ')}},`,
    `volume = ${volume},`,
    ...(issue ? [`number = ${issue},`] : []),
    `year = ${year},`,
    `month = {${month}},`,
    `pub_date = {${ymd}},`,
    `pages = {${elocationId}},`,
    `citation = {IJM ${year};${volume}(${issue}):${elocationId}},`,
    `doi = {${doi}},`,
    `url = {https://doi.org/${doi}},`,
    ...(abstractParas.length
      ? [`abstract = {${abstractParas.map((p) => convertInlineFormatting(p.text, 'tex')).join(' ')}},`]
      : []),
    ...(keywords?.length
      ? [`keywords = {${keywords.map((k) => convertInlineFormatting(k, 'tex')).join(', ')}},`]
      : []),
    `journal = {IJM},`,
    `issn = {1747-5864},`,
    `publisher = {International Journal of Microsimulation},`,
    `}`,
  ];

  return lines.join('\n') + '\n';
}

export function buildRIS(article: CitableArticle): string {
  const { doi, title, volume, issue, published, elocationId, keywords } = article;
  const authors = citationAuthorNames(article.authors ?? []);
  const { year, slashDate } = formatCitationDate(published);
  const abstractParas = article.abstract?.content ?? [];

  const lines = [
    `TY  - JOUR`,
    `TI  - ${convertInlineFormatting(title, 'ris')}`,
    ...authors.map((name) => `AU  - ${name}`),
    `VL  - ${volume}`,
    ...(issue ? [`IS  - ${issue}`] : []),
    `PY  - ${year}`,
    `DA  - ${slashDate}`,
    `SP  - ${elocationId}`,
    `C1  - IJM ${year};${volume}(${issue}):${elocationId}`,
    `DO  - ${doi}`,
    `UR  - https://doi.org/${doi}`,
    ...(abstractParas.length
      ? [`AB  - ${abstractParas.map((p) => convertInlineFormatting(p.text, 'ris')).join(' ')}`]
      : []),
    ...(keywords?.length ? keywords.map((k) => `KW  - ${convertInlineFormatting(k, 'ris')}`) : []),
    `JF  - IJM`,
    `SN  - 1747-5864`,
    `PB  - International Journal of Microsimulation`,
    `ER  - `,
  ];

  return lines.join('\r\n');
}
