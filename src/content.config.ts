import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/posts', generateId: ({ entry }) => entry.split('/')[0] }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    lang: z.enum(['en', 'zh-TW']),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    math: z.boolean().default(false),
    comments: z.boolean().default(true),
  }),
});

export const collections = { posts };
