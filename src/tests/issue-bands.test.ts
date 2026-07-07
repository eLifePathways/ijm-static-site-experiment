import { describe, it, expect } from 'vitest';
import { groupByYearBand } from '@/utils/issues';

interface Item {
  id: string;
  published: string;
}

const item = (id: string, published: string): Item => ({ id, published });
const getPublished = (i: Item) => i.published;

describe('groupByYearBand', () => {
  it('divides evenly across an exact multiple of 3 years', () => {
    const items = [
      item('a', '2018-01-01'),
      item('b', '2019-01-01'),
      item('c', '2020-01-01'),
      item('d', '2021-01-01'),
      item('e', '2022-01-01'),
      item('f', '2023-01-01'),
    ];
    const bands = groupByYearBand(items, getPublished);
    expect(bands.map((b) => [b.start, b.end])).toEqual([
      [2023, 2021],
      [2020, 2018],
    ]);
  });

  it('shortens the final (oldest) band instead of leaving a gap year', () => {
    // 2018-2023 is 6 years (two full bands); adding 2017 makes an odd 7-year
    // spread that shouldn't divide evenly into 3s.
    const items = [
      item('a', '2017-06-01'),
      item('b', '2018-01-01'),
      item('c', '2023-01-01'),
    ];
    const bands = groupByYearBand(items, getPublished);
    expect(bands.map((b) => [b.start, b.end])).toEqual([
      [2023, 2021],
      [2020, 2018],
      [2017, 2017],
    ]);
    // every year from min to max is covered by exactly one band
    const allYears = bands.flatMap((b) => {
      const ys: number[] = [];
      for (let y = b.end; y <= b.start; y++) ys.push(y);
      return ys;
    });
    expect(new Set(allYears).size).toBe(allYears.length);
    expect(Math.min(...allYears)).toBe(2017);
    expect(Math.max(...allYears)).toBe(2023);
  });

  it('produces a single band for a single year of data', () => {
    const items = [item('a', '2020-03-01'), item('b', '2020-09-01')];
    const bands = groupByYearBand(items, getPublished);
    expect(bands).toHaveLength(1);
    expect(bands[0].start).toBe(2020);
    expect(bands[0].end).toBe(2020);
  });

  it('sorts items newest-first within a band', () => {
    const items = [item('older', '2020-01-01'), item('newer', '2020-06-01'), item('newest', '2021-01-01')];
    const bands = groupByYearBand(items, getPublished);
    expect(bands[0].items.map((i) => i.id)).toEqual(['newest', 'newer', 'older']);
  });

  it('produces ceil((max-min+1)/3) bands', () => {
    const items = [item('a', '2010-01-01'), item('b', '2024-01-01')];
    const bands = groupByYearBand(items, getPublished);
    expect(bands).toHaveLength(Math.ceil((2024 - 2010 + 1) / 3));
  });
});
