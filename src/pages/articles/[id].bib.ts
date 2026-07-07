import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import {
  citationAuthorNames,
  convertInlineFormatting,
  formatCitationDate,
} from '@/utils/articleContent';

export async function getStaticPaths() {
  const articles = await getCollection('articles');
  return articles.map((article) => ({
    params: { id: article.data.id },
    props: { article },
  }));
}

export const GET: APIRoute = ({ props }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const article = (props as any).article.data;
  const { doi, title, volume, issue, published, elocationId, keywords } = article;
  const authors = citationAuthorNames(article.authors ?? []);
  const { year, month, ymd } = formatCitationDate(published);
  const abstractParas = (article.abstract?.content ?? []) as Array<{ text: string }>;

  const lines = [
    `@article {${doi},`,
    `article_type = {journal},`,
    `title = {${convertInlineFormatting(title, 'tex')}},`,
    `author = {${authors.join(' and ')}},`,
    `volume = ${volume},`,
    ...(issue ? [`number = ${issue},`] : []),
    `year = ${year},`,
    `month = {${month}},`,
    `pub_date = {${ymd}},`,
    `pages = {${elocationId}},`,
    `citation = {IJM ${year};${volume}(${issue}):${elocationId}},`,
    `doi = {${doi}},`,
    `url = {https://doi.org/${doi}},`,
    ...(abstractParas.length
      ? [`abstract = {${abstractParas.map((p) => convertInlineFormatting(p.text, 'tex')).join(' ')}},`]
      : []),
    ...(keywords?.length
      ? [`keywords = {${keywords.map((k: string) => convertInlineFormatting(k, 'tex')).join(', ')}},`]
      : []),
    `journal = {IJM},`,
    `issn = {1747-5864},`,
    `publisher = {International Journal of Microsimulation},`,
    `}`,
  ];

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'application/x-bibtex' },
  });
};
