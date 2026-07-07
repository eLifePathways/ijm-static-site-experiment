export interface YearBand<T> {
  start: number;
  end: number;
  items: T[];
}

/**
 * Groups items into 3-year bands counting down from the newest year with
 * content. The last (oldest) band may be shorter than 3 years if the data
 * doesn't divide evenly — simpler than the legacy site's fixed-width last
 * band, which leaves a year uncovered by any label when it doesn't divide
 * evenly either. Items within each band are sorted newest-first.
 */
export function groupByYearBand<T>(items: T[], getPublished: (item: T) => string): YearBand<T>[] {
  const withYear = items.map((item) => ({ item, year: new Date(getPublished(item)).getUTCFullYear() }));
  const years = withYear.map((i) => i.year);
  const maxYear = Math.max(...years);
  const minYear = Math.min(...years);

  const bands: YearBand<T>[] = [];
  for (let top = maxYear; top >= minYear; top -= 3) {
    const bottom = Math.max(top - 2, minYear);
    bands.push({
      start: top,
      end: bottom,
      items: withYear
        .filter((i) => i.year >= bottom && i.year <= top)
        .sort((a, b) => getPublished(b.item).localeCompare(getPublished(a.item)))
        .map((i) => i.item),
    });
  }
  return bands;
}
