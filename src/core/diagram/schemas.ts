import { z } from 'zod';
import type { DiagramModel } from './types';

export const diagramNodeSchema = z.object({
  id: z.string().min(1),
  modelId: z.string().min(1),
  nodeType: z.enum(['entity', 'association', 'comment']),
  position: z.object({ x: z.number(), y: z.number() }),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  locked: z.boolean().optional(),
});

export const diagramViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().positive(),
});

export const diagramCommentSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
});

export const diagramModelSchema: z.ZodType<DiagramModel> = z.object({
  nodes: z.array(diagramNodeSchema),
  viewport: diagramViewportSchema,
  comments: z.array(diagramCommentSchema),
});
