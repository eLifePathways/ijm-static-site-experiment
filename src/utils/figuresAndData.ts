export interface ImageAsset {
  type: 'image';
  id: string;
  label?: string;
  title?: string;
  image: {
    alt: string;
    source: { filename: string };
  };
}

export interface TableAsset {
  type: 'table';
  id: string;
  label?: string;
  title?: string;
  tables: string[];
  footnotes?: Array<{ text: Array<{ text: string; type: string }> }>;
}

export type FigureAsset = ImageAsset | TableAsset;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = Record<string, any>;

// Walks the body/appendix node tree the same way BodyNode.astro renders it
// (recursing into `content` and list `items`), collecting every figure/table
// asset in document order — mirrors the legacy PHP site's findFigures(),
// which flattens the whole content tree and filters for Block\Figure nodes.
function collectAssets(nodes: AnyNode[]): FigureAsset[] {
  const assets: FigureAsset[] = [];
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;
    const type = node.type as string | undefined;

    if (type === 'figure' && Array.isArray(node.assets)) {
      assets.push(...(node.assets as FigureAsset[]));
    } else if (type === 'image' && node.image?.source?.filename) {
      assets.push(node as ImageAsset);
    } else if (type === 'table' && Array.isArray(node.tables)) {
      assets.push(node as TableAsset);
    }

    if (Array.isArray(node.content)) {
      assets.push(...collectAssets(node.content));
    }
    if (type === 'list' && Array.isArray(node.items)) {
      for (const item of node.items as AnyNode[][]) {
        assets.push(...collectAssets(item));
      }
    }
  }
  return assets;
}

// Splits the flattened, document-ordered asset list into images vs. tables —
// mirrors figuresAction()'s split on `getAssets()[0]->getAsset() instanceof
// Block\Image`/`Block\Table`.
export function extractFiguresAndTables(nodes: AnyNode[]): { images: ImageAsset[]; tables: TableAsset[] } {
  const assets = collectAssets(nodes);
  return {
    images: assets.filter((a): a is ImageAsset => a.type === 'image'),
    tables: assets.filter((a): a is TableAsset => a.type === 'table'),
  };
}

// Mirrors the legacy figures page's message-bar summary (e.g. "This article
// contains 5 figures and 2 tables."), including its singular-count wording.
export function summarizeFiguresAndTables(images: ImageAsset[], tables: TableAsset[]): string | null {
  const parts: string[] = [];
  if (images.length > 0) parts.push(`${images.length} figure${images.length === 1 ? '' : 's'}`);
  if (tables.length > 0) parts.push(`${tables.length} table${tables.length === 1 ? '' : 's'}`);
  if (parts.length === 0) return null;
  return `This article contains ${parts.join(' and ')}.`;
}

// Kept independent of astro:content types (like CitableArticle in
// articleContent.ts) so this is testable without an Astro/astro:content
// context — callers pass `article.data`.
export interface FigurableArticle {
  status: string;
  // Loosely typed (matches the schema's `z.unknown()` body nodes) so callers
  // don't need to cast article.data.body/appendices before calling this.
  body: unknown[];
  appendices?: unknown[];
}

// Gate for whether an article gets a "Figures and data" view at all — only
// Version-of-Record articles with at least one figure/table, matching
// findFigures()'s `instanceof ArticleVoR` check (POA/preprint versions never
// have one in the legacy site either).
export function articleHasFiguresOrTables(article: FigurableArticle): boolean {
  if (article.status !== 'vor') return false;
  const nodes = [...(article.body ?? []), ...(article.appendices ?? [])] as AnyNode[];
  const { images, tables } = extractFiguresAndTables(nodes);
  return images.length > 0 || tables.length > 0;
}
