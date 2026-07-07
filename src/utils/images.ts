import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

// Populated by scripts/prepare-assets.mjs (a plain copy+rename of the
// source .tif files, since Astro's asset pipeline only recognizes the
// literal ".tiff" extension). Vite requires this glob call to be a static
// literal, so it lives here once and every caller imports the resolver
// below rather than repeating the glob.
const tiffModules = import.meta.glob<{ default: ImageMetadata }>('../generated-tiffs/**/*.tiff');

export interface ResolvedImage {
  src: string;
  width: number;
  height: number;
}

/**
 * Resolves an article figure to an optimized WebP, with width/height read
 * from the actual TIFF file rather than the CMS export's JSON `size`
 * field — which is wrong for a meaningful number of figures (confirmed by
 * comparing recorded vs. real dimensions across the dataset; some are off
 * by enough to flip portrait/landscape). Returns null if the source TIFF
 * isn't present, so callers can fall back to the plain <img> path.
 */
export async function resolveFigureImage(
  articleId: string,
  filename: string,
): Promise<ResolvedImage | null> {
  const stem = filename.replace(/\.[^./]+$/, '');
  const key = `../generated-tiffs/${articleId}/${stem}.tiff`;
  const importTiff = tiffModules[key];
  if (!importTiff) return null;

  const mod = await importTiff();
  const optimized = await getImage({ src: mod.default, format: 'webp', quality: 85 });
  return {
    src: optimized.src,
    width: optimized.attributes.width as number,
    height: optimized.attributes.height as number,
  };
}
