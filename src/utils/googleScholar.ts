// "Google Scholar" lookup links for reference-list entries, built the same way
// as the legacy PHP site (e.g. https://microsimulation.pub/articles/00110#references):
// title, [conference], author…, publication_year, [journal, volume], [pages].

interface ScholarAuthor {
  type: string;
  name?: string | { preferred: string };
}

export interface ScholarReference {
  type: string;
  authors?: ScholarAuthor[];
  // Theses name a single `author`; `authors` is then a "n/a" placeholder.
  author?: ScholarAuthor;
  date?: string;
  articleTitle?: string;
  chapterTitle?: string;
  bookTitle?: string;
  title?: string;
  journal?: string;
  volume?: string;
  conference?: { name: string[] };
  pages?: string | { range?: string; first?: string; last?: string };
  pmid?: number | string;
}

// The legacy site doesn't offer a Scholar link for these reference types.
const UNLINKED_TYPES = new Set(['web', 'software', 'data']);

const PAGED_TYPES = new Set(['journal', 'book-chapter', 'conference-proceeding']);

// Titles can carry inline HTML (<i>, <b>, &amp;) — Scholar wants plain text.
function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function authorName(author: ScholarAuthor): string {
  if (typeof author.name === 'string') return author.name;
  return author.name?.preferred ?? '';
}

// Page ranges are prefixed "pp." (as the legacy site does); free-text pages
// such as an article number are passed through untouched.
function pagesParam(pages: ScholarReference['pages']): string | undefined {
  if (!pages) return undefined;
  if (typeof pages === 'string') return pages;
  const range = pages.range ?? pages.first;
  return range ? `pp. ${range}` : undefined;
}

// Which title field is looked up depends on the reference type, as on the
// legacy site — e.g. a conference proceeding's `articleTitle`, even when it
// also has a `chapterTitle`.
function referenceTitle(ref: ScholarReference): string | undefined {
  switch (ref.type) {
    case 'book-chapter':
      return ref.chapterTitle;
    case 'journal':
    case 'conference-proceeding':
      return ref.articleTitle;
    case 'book':
      return ref.bookTitle;
    default:
      return ref.title ?? ref.articleTitle ?? ref.bookTitle;
  }
}

export function googleScholarUrl(ref: ScholarReference): string | undefined {
  if (UNLINKED_TYPES.has(ref.type)) return undefined;

  const title = referenceTitle(ref);
  if (!title) return undefined;

  const params = new URLSearchParams();
  params.append('title', plainText(title));
  if (ref.type === 'conference-proceeding' && ref.conference) {
    params.append('conference', ref.conference.name.join(', '));
  }
  for (const author of ref.author ? [ref.author] : (ref.authors ?? [])) {
    const name = authorName(author);
    if (name) params.append('author', name);
  }
  if (ref.date) params.append('publication_year', ref.date.slice(0, 4));
  if (ref.type === 'journal') {
    if (ref.journal) params.append('journal', ref.journal);
    if (ref.volume) params.append('volume', ref.volume);
  }
  // Only cited page ranges — a book's `pages` is its page count.
  const pages = PAGED_TYPES.has(ref.type) ? pagesParam(ref.pages) : undefined;
  if (pages) params.append('pages', pages);
  if (ref.pmid) params.append('pmid', String(ref.pmid));

  return `https://scholar.google.com/scholar_lookup?${params.toString()}`;
}
