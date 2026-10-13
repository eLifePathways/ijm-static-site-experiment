import { test, expect } from '@playwright/test';

const PAGES = [
  // 2007 article: figures, an appendix, MathML and a long reference list.
  { path: '/articles/00003', name: 'article-00003' },
];

for (const spec of PAGES) {
  test(spec.name, async ({ page }) => {
    await page.goto(spec.path);

    // Figures are loading="lazy", so a full-page screenshot would catch
    // the ones below the fold unloaded. Load them all up front.
    await page.evaluate(async () => {
      const images = Array.from(document.images);
      images.forEach((img) => (img.loading = 'eager'));
      await Promise.all(images.map((img) => img.decode().catch(() => {})));
      await document.fonts.ready;
    });

    await expect(page).toHaveScreenshot(`${spec.name}.png`, { fullPage: true });
  });
}
