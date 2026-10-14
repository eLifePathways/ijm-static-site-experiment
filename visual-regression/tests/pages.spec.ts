import { test, expect, type Page } from '@playwright/test';

// Figures are loading="lazy", so a full-page screenshot would catch
// the ones below the fold unloaded. Load them all up front.
async function loadAllImages(page: Page) {
  await page.evaluate(async () => {
    const images = Array.from(document.images);
    images.forEach((img) => (img.loading = 'eager'));
    await Promise.all(images.map((img) => img.decode().catch(() => {})));
    await document.fonts.ready;
  });
}

const PAGES = [
  // 2007 article: figures, an appendix, MathML and a long reference list.
  { path: '/articles/00003', name: 'article-00003' },
  // 2024 article: MathML equations with labels.
  { path: '/articles/00327', name: 'article-00327' },
];

for (const spec of PAGES) {
  test(spec.name, async ({ page }) => {
    await page.goto(spec.path);
    await loadAllImages(page);
    await expect(page).toHaveScreenshot(`${spec.name}.png`, { fullPage: true });
  });
}

// Collapsed-by-default sections, opened and screenshotted on their own so
// the rest of the page doesn't churn these snapshots.
const SECTIONS = [
  // Short, single-paragraph data and code availability statement.
  { path: '/articles/00338', selector: '#info', name: 'article-00338-info' },
  // Longest data and code availability statement (multiple paragraphs, links).
  { path: '/articles/00277', selector: '#info', name: 'article-00277-info' },
];

for (const spec of SECTIONS) {
  test(spec.name, async ({ page }) => {
    await page.goto(spec.path);
    const section = page.locator(spec.selector);
    await section.evaluate((el) => ((el as HTMLDetailsElement).open = true));
    await page.evaluate(() => document.fonts.ready);
    await expect(section).toHaveScreenshot(`${spec.name}.png`);
  });
}
