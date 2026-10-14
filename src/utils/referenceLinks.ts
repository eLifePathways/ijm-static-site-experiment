// Where a reference's title links to: its DOI if it has one, otherwise its URI.
//
// URIs in the source data were extracted from typeset PDFs, so some have
// spaces where the URL wrapped onto a new line ("…/IJM/ V2_1/…") and one is
// HTML-escaped ("&amp;"). Both break the link, so tidy them up here.
export function referenceHref(ref: { doi?: string; uri?: string }): string | undefined {
  if (ref.doi) return `https://doi.org/${ref.doi.trim()}`;
  if (!ref.uri) return undefined;
  return ref.uri.replace(/\s+/g, '').replace(/&amp;/g, '&');
}
