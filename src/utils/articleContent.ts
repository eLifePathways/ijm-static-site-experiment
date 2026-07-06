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
