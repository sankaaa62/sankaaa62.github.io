import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob, file } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    role: z.string(),
    period: z.string(),
    genre: z.string(),
    platforms: z.array(z.string()),
    metrics: z.array(z.string()).default([]),
    stack: z.array(z.string()),
    links: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
    youtube: z.string().optional(),
    company: z.string(),
    trailer: z.string().optional(),
    order: z.number(),
  }),
});

const prototypes = defineCollection({
  loader: file('./src/content/prototypes/prototypes.json'),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    genre: z.object({ en: z.string(), ru: z.string() }),
    year: z.number(),
    clip: z.boolean().default(false),
    clipFull: z.boolean().default(false),
    shots: z.number().default(0),
    link: z.url().optional(),
    badge: z.object({ en: z.string(), ru: z.string() }).optional(),
    pin: z.boolean().default(false),
  }),
});

export const collections = { projects, prototypes };
