import { describe, expect, it } from 'vitest';
import { DELIVERED_EXAMPLES, getDeliveredExample } from './index';
import type { DeliveredExample } from './index';
import { deterministicId } from './define-example';
import type { ModriseProject } from '../project/types';
import { CURRENT_FORMAT_VERSION } from '../project/types';
import { parseProjectFile, serializeProject } from '../serialization/file-format';
import { validateConceptualModel } from '../validation/validate';
import { transformToLogicalModel } from '../transformations/mcd-to-mld';
import { loadSqlDialect } from '../sql/registry';
import { SQL_DIALECT_IDS } from '../sql/dialect';
import hotelRaw from '../../../examples/gestion-hotel.merise.json?raw';
import ecommerceRaw from '../../../examples/boutique-en-ligne.merise.json?raw';
import libraryRaw from '../../../examples/bibliotheque.merise.json?raw';

const DELIVERED_FILES: Record<string, string> = {
  'gestion-hotel.merise.json': hotelRaw,
  'boutique-en-ligne.merise.json': ecommerceRaw,
  'bibliotheque.merise.json': libraryRaw,
};

const cases: [string, DeliveredExample][] = DELIVERED_EXAMPLES.map((example) => [
  example.label,
  example,
]);

function collectIds(project: ModriseProject): string[] {
  const ids: string[] = [];
  for (const entity of project.conceptualModel.entities) {
    ids.push(entity.id);
    for (const attribute of entity.attributes) ids.push(attribute.id);
    for (const identifier of entity.identifiers) ids.push(identifier.id);
  }
  for (const association of project.conceptualModel.associations) {
    ids.push(association.id);
    for (const attribute of association.attributes) ids.push(attribute.id);
    for (const participation of association.participations) ids.push(participation.id);
  }
  for (const node of project.diagram.nodes) ids.push(node.id);
  return ids;
}

describe('registre des exemples livrés', () => {
  it('livre au moins la gestion d’hôtel, la boutique et la bibliothèque', () => {
    expect(DELIVERED_EXAMPLES.map((example) => example.key)).toEqual([
      'hotel',
      'ecommerce',
      'bibliotheque',
    ]);
  });

  it('n’a ni clé ni nom de fichier en double', () => {
    const keys = DELIVERED_EXAMPLES.map((example) => example.key);
    const fileNames = DELIVERED_EXAMPLES.map((example) => example.fileName);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(fileNames).size).toBe(fileNames.length);
  });

  it('refuse une clé inconnue au lieu de renvoyer un exemple par défaut', () => {
    // @ts-expect-error — clé volontairement hors du type, comme le ferait un
    // état persisté écrit par une version plus ancienne.
    expect(() => getDeliveredExample('inexistant')).toThrow(/Exemple inconnu/);
  });
});

describe.each(cases)('exemple « %s »', (_label, example) => {
  it('est valide au sens du format de fichier, et se relit à l’identique', () => {
    const project = example.create();
    const serialized = serializeProject(project);
    const reparsed = parseProjectFile(serialized);

    expect(project.formatVersion).toBe(CURRENT_FORMAT_VERSION);
    expect(serializeProject(reparsed)).toBe(serialized);
  });

  it('ne produit aucune erreur ni aucun avertissement de validation', () => {
    const project = example.create();
    const issues = validateConceptualModel(project.conceptualModel, {
      namingConvention: project.settings.namingConvention,
    });
    // Comparaison au tableau vide plutôt qu'à une longueur : en cas d'échec,
    // le diff affiche le problème au lieu de « 3 ≠ 0 ».
    expect(issues).toEqual([]);
  });

  it('se transforme en modèle logique', () => {
    const project = example.create();
    const result = transformToLogicalModel(project.conceptualModel);
    expect(result.success ? [] : result.issues).toEqual([]);
    expect(result.success && result.model.tables.length).toBeGreaterThan(0);
  });

  it.each(SQL_DIALECT_IDS)('génère du SQL %s sans erreur', async (dialectId) => {
    const project = example.create();
    const transformed = transformToLogicalModel(project.conceptualModel);
    if (!transformed.success) throw new Error('transformation MLD impossible');

    const dialect = await loadSqlDialect(dialectId);
    const generated = dialect.generate(transformed.model);

    expect(generated.issues.filter((issue) => issue.severity === 'error')).toEqual([]);
    expect(generated.success).toBe(true);
    expect(generated.sql).toContain('CREATE TABLE');
  });

  it('n’attribue jamais deux fois le même identifiant', () => {
    const ids = collectIds(example.create());
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(duplicates).toEqual([]);
    expect(ids.every((id) => /^[0-9a-f-]{36}$/.test(id))).toBe(true);
  });

  it('construit une structure identique à chaque appel, mais un projet distinct', () => {
    const first = example.create();
    const second = example.create();

    // La structure est déterministe : deux chargements du même exemple
    // donnent exactement le même modèle.
    expect(second.conceptualModel).toEqual(first.conceptualModel);
    expect(second.diagram).toEqual(first.diagram);

    // L'identité, elle, ne l'est pas : deux exemples chargés l'un après
    // l'autre sont deux projets différents pour IndexedDB.
    expect(second.id).not.toBe(first.id);
  });

  it('est figé octet pour octet en mode `frozen`', () => {
    expect(serializeProject(example.create({ frozen: true }))).toBe(
      serializeProject(example.create({ frozen: true })),
    );
  });

  it('correspond au fichier livré dans `examples/`', () => {
    const delivered = DELIVERED_FILES[example.fileName];
    expect(delivered, `fichier livré manquant : ${example.fileName}`).toBeDefined();
    // Garde-fou anti-dérive : le fichier du dépôt n'est jamais édité à la
    // main, il est produit par `pnpm examples:export`. Si ce test échoue,
    // c'est cette commande qu'il faut relancer.
    expect(delivered?.trimEnd()).toBe(serializeProject(example.create({ frozen: true })));
  });
});

describe('deterministicId', () => {
  it('est stable et produit un UUID v8 bien formé', () => {
    const id = deterministicId('hotel/entity/CLIENT');
    expect(deterministicId('hotel/entity/CLIENT')).toBe(id);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('sépare deux chemins voisins', () => {
    expect(deterministicId('hotel/entity/CLIENT')).not.toBe(deterministicId('hotel/entity/CLIEN'));
    expect(deterministicId('hotel/entity/CLIENT')).not.toBe(
      deterministicId('ecommerce/entity/CLIENT'),
    );
  });
});
