import { getAllArticles } from '@/utils/content';
import type { APIRoute } from 'astro';
import { buildBibTeX } from '@/utils/articleContent';

export async function getStaticPaths() {
  const articles = await getAllArticles();
  return articles.map((article) => ({
    params: { id: article.data.id },
    props: { article },
  }));
}

export const GET: APIRoute = ({ props }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const article = (props as any).article.data;
  return new Response(buildBibTeX(article), {
    headers: { 'Content-Type': 'application/x-bibtex' },
  });
};
