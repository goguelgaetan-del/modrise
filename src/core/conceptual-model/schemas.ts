/**
 * Schémas Zod du modèle conceptuel.
 *
 * Tout objet provenant de l'extérieur (import de fichier, IndexedDB) doit
 * être validé par ces schémas avant d'entrer dans l'application.
 */
import { z } from 'zod';
import type { ConceptualModel } from './types';

export const conceptualDataTypeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('integer') }),
  z.object({ kind: z.literal('bigint') }),
  z.object({
    kind: z.literal('decimal'),
    precision: z.number().int().positive(),
    scale: z.number().int().nonnegative(),
  }),
  z.object({ kind: z.literal('varchar'), length: z.number().int().positive() }),
  z.object({ kind: z.literal('text') }),
  z.object({ kind: z.literal('boolean') }),
  z.object({ kind: z.literal('date') }),
  z.object({ kind: z.literal('datetime') }),
  z.object({ kind: z.literal('uuid') }),
]);

export const attributeSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  dataType: conceptualDataTypeSchema,
  required: z.boolean(),
  unique: z.boolean(),
  description: z.string().optional(),
});

export const identifierSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  attributeIds: z.array(z.string().min(1)),
  primary: z.boolean(),
});

export const entitySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string().optional(),
  attributes: z.array(attributeSchema),
  identifiers: z.array(identifierSchema),
});

export const cardinalitySchema = z.object({
  min: z.union([z.literal(0), z.literal(1)]),
  max: z.union([z.literal(1), z.literal('N')]),
});

export const participationSchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  role: z.string().optional(),
  cardinality: cardinalitySchema,
});

export const associationSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string().optional(),
  attributes: z.array(attributeSchema),
  participations: z.array(participationSchema),
});

export const conceptualModelSchema: z.ZodType<ConceptualModel> = z.object({
  entities: z.array(entitySchema),
  associations: z.array(associationSchema),
});
