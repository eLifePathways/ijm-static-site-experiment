import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

// ── Shared primitives ───────────────────────────────────────────────────────

const affiliationSchema = z.object({
  name: z.array(z.string()),
  address: z
    .object({
      components: z.record(z.string(), z.unknown()),
      formatted: z.array(z.string()),
    })
    .optional(),
});

const authorSchema = z.object({
  type: z.literal('person'),
  name: z.object({
    preferred: z.string(),
    index: z.string(),
  }),
  affiliations: z.array(affiliationSchema).optional(),
  emailAddresses: z.array(z.string()).optional(),
  equalContributionGroups: z.array(z.number()).optional(),
  competing: z.string().optional(),
  orcid: z.string().optional(),
});

const subjectRefSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const copyrightSchema = z.object({
  license: z.string(),
  holder: z.string().optional(),
  statement: z.string(),
  year: z.number().optional(),
});

// Body nodes are a recursive tree — typed loosely here; narrowed in Phase 2.
const bodyNodeSchema: z.ZodType<unknown> = z.unknown();

// ── Collection definitions ───────────────────────────────────────────────────

const articlesCollection = defineCollection({
  loader: glob({ pattern: '*.json', base: '../api/data/articles' }),
  schema: z
    .object({
      '-meta': z.object({ patched: z.boolean() }).optional(),
      id: z.string(),
      status: z.enum(['vor', 'poa']),
      stage: z.string(),
      version: z.number(),
      type: z.enum([
        'editorial',
        'research-article',
        'short-report',
        'scientific-correspondence',
        'tools-resources',
        'registered-report',
        'feature',
      ]),
      doi: z.string(),
      title: z.string(),
      authorLine: z.string().optional(),
      published: z.string(),
      versionDate: z.string(),
      statusDate: z.string(),
      volume: z.number(),
      issue: z.number(),
      // Some articles (e.g. appendix-only pages) use Roman numerals — accept both
      fpage: z.union([z.number(), z.string()]),
      lpage: z.union([z.number(), z.string()]),
      elocationId: z.string(),
      pdf: z.string(),
      copyright: copyrightSchema,
      authors: z.array(authorSchema).optional(),
      subjects: z.array(subjectRefSchema).optional(),
      keywords: z.array(z.string()).optional(),
      abstract: z.unknown().optional(),
      body: z.array(bodyNodeSchema),
      references: z.array(z.unknown()).optional(),
      appendices: z.array(z.unknown()).optional(),
      acknowledgements: z.array(z.unknown()).optional(),
      funding: z.unknown().optional(),
      dataSets: z.unknown().optional(),
      additionalFiles: z.unknown().optional(),
      ethics: z.unknown().optional(),
    })
    .passthrough(),
});

const issuesCollection = defineCollection({
  loader: glob({ pattern: '*.json', base: '../api/data/collections' }),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    published: z.string(),
    content: z.array(z.string()),
  }),
});

const subjectsCollection = defineCollection({
  loader: glob({ pattern: '*.json', base: '../api/data/subjects' }),
  schema: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

const aboutCollection = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/about' }),
  schema: z.object({
    title: z.string(),
    // Sets the about-section menu order; pages without one (e.g. author-notes,
    // which the legacy PHP site's own menu excludes) are left out of the menu.
    order: z.number().optional(),
  }),
});

export const collections = {
  articles: articlesCollection,
  issues: issuesCollection,
  subjects: subjectsCollection,
  about: aboutCollection,
};
