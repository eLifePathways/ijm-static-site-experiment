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
  const { year, slashDate } = formatCitationDate(published);
  const abstractParas = (article.abstract?.content ?? []) as Array<{ text: string }>;

  const lines = [
    `TY  - JOUR`,
    `TI  - ${convertInlineFormatting(title, 'ris')}`,
    ...authors.map((name) => `AU  - ${name}`),
    `VL  - ${volume}`,
    ...(issue ? [`IS  - ${issue}`] : []),
    `PY  - ${year}`,
    `DA  - ${slashDate}`,
    `SP  - ${elocationId}`,
    `C1  - IJM ${year};${volume}(${issue}):${elocationId}`,
    `DO  - ${doi}`,
    `UR  - https://doi.org/${doi}`,
    ...(abstractParas.length
      ? [`AB  - ${abstractParas.map((p) => convertInlineFormatting(p.text, 'ris')).join(' ')}`]
      : []),
    ...(keywords?.length ?? 0 ? keywords.map((k: string) => `KW  - ${convertInlineFormatting(k, 'ris')}`) : []),
    `JF  - IJM`,
    `SN  - 1747-5864`,
    `PB  - International Journal of Microsimulation`,
    `ER  - `,
  ];

  return new Response(lines.join('\r\n'), {
    headers: { 'Content-Type': 'application/x-research-info-systems' },
  });
};
