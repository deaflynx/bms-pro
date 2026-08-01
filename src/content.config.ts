import { glob } from 'astro/loaders';
// `import { z } from 'astro:content'` is deprecated in Astro 7 and removed next major.
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';

const DOC_TYPES = ['passport', 'declaration', 'technical-conditions'] as const;

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    name: z.string(),
    tagline: z.string(),
    zones: z.array(z.string()).min(1),
    price: z.number().int().positive(),
    channels: z.string(),
    indicator: z.enum(['analog', 'digital', 'dual-digital', 'roller']),
    control: z.string(),
    usage: z.string(),
    image: z.string(),
    gallery: z.array(z.string()).default([]),
    benefits: z.array(z.string()).default([]),
    specs: z.record(z.string(), z.string()).default({}),
    included: z.array(z.object({ item: z.string(), qty: z.number().int() })).default([]),
    documents: z.array(z.enum(DOC_TYPES)).default([]),
    order: z.number().int(),
  }),
});

const documents = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/documents' }),
  schema: z.object({
    model: z.string(),
    type: z.enum(DOC_TYPES),
    title: z.string(),
    designation: z.string(),
    lead: z.string(),
    pdf: z.string().optional(),
    image: z.string().optional(),
  }),
});

const faq = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/faq' }),
  schema: z.object({
    question: z.string(),
    models: z.array(z.string()).default([]),
    order: z.number().int(),
  }),
});

export const collections = { products, documents, faq };
