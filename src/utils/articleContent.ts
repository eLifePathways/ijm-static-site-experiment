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

const MONTH_ABBR = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

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
