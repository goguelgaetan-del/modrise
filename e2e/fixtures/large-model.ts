/**
 * Fixture `.merise.json` déterministe pour les tests de bout en bout sur un
 * grand diagramme (v0.5.1, voir docs/canvas-performance.md).
 *
 * Construit du JSON brut plutôt que d'importer les fabriques de `src/core` :
 * ce dossier est type-vérifié par `tsconfig.node.json` (résolution
 * `nodenext`, sans alias `@/`), incompatible avec la résolution « bundler »
 * utilisée par `src/**` — voir tsconfig.node.json / tsconfig.app.json.
 *
 * Le générateur est déterministe à l'exception des identifiants (UUID) :
 * mêmes noms, mêmes positions, mêmes cardinalités à chaque appel.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface LargeModelFixtureOptions {
  entityCount?: number;
  associationCount?: number;
  attributesPerEntity?: number;
  /** Nombre de colonnes de la grille de placement. */
  columns?: number;
  /** Nom du projet importé. */
  projectName?: string;
  /**
   * Indices (dans l'ordre de création des nœuds d'entité) des nœuds à
   * marquer verrouillés — pour tester qu'un nœud verrouillé ne bouge pas.
   */
  lockedEntityIndexes?: readonly number[];
  /** Nombre de commentaires graphiques ajoutés au diagramme. */
  commentCount?: number;
  /** Zoom initial du viewport enregistré dans le fichier. */
  zoom?: number;
}

export interface LargeModelFixture {
  file: unknown;
  /** Ids des nœuds de diagramme, dans l'ordre : entités puis associations puis commentaires. */
  nodeIds: string[];
  entityNames: string[];
  nodeCount: number;
  participationCount: number;
}

export function createLargeModelFixture(
  options: LargeModelFixtureOptions = {},
): LargeModelFixture {
  const entityCount = options.entityCount ?? 100;
  const associationCount = options.associationCount ?? 150;
  const attributesPerEntity = options.attributesPerEntity ?? 5;
  const columns = options.columns ?? 16;
  const commentCount = options.commentCount ?? 0;
  const locked = new Set(options.lockedEntityIndexes ?? []);
  const now = new Date().toISOString();

  const entities = Array.from({ length: entityCount }, (_, index) => {
    const idAttribute = {
      id: crypto.randomUUID(),
      name: 'id',
      dataType: { kind: 'integer' },
      required: true,
      unique: false,
    };
    const attributes: unknown[] = [idAttribute];
    for (let a = 0; a < attributesPerEntity; a += 1) {
      attributes.push({
        id: crypto.randomUUID(),
        name: `attribut_${a}`,
        dataType: { kind: 'varchar', length: 100 },
        required: false,
        unique: false,
      });
    }
    return {
      id: crypto.randomUUID(),
      name: `ENTITE_${index}`,
      attributes,
      identifiers: [{ id: crypto.randomUUID(), attributeIds: [idAttribute.id], primary: true }],
    };
  });

  const associations = Array.from({ length: associationCount }, (_, index) => {
    const from = entities[index % entityCount]!;
    const to = entities[(index + 1) % entityCount]!;
    return {
      id: crypto.randomUUID(),
      name: `ASSOCIATION_${index}`,
      attributes: [],
      participations: [
        { id: crypto.randomUUID(), entityId: from.id, cardinality: { min: 0, max: 'N' } },
        { id: crypto.randomUUID(), entityId: to.id, cardinality: { min: 1, max: 1 } },
      ],
    };
  });

  const nodes: unknown[] = [];
  const nodeIds: string[] = [];
  let index = 0;
  const place = () => ({
    x: (index % columns) * 260 + 40,
    y: Math.floor(index / columns) * 220 + 100,
  });

  entities.forEach((entity, entityIndex) => {
    const id = `n-e-${entityIndex}`;
    nodes.push({
      id,
      modelId: entity.id,
      nodeType: 'entity',
      position: place(),
      width: 200,
      height: 160,
      locked: locked.has(entityIndex),
    });
    nodeIds.push(id);
    index += 1;
  });

  associations.forEach((association, associationIndex) => {
    const id = `n-a-${associationIndex}`;
    nodes.push({
      id,
      modelId: association.id,
      nodeType: 'association',
      position: place(),
      width: 160,
      height: 60,
      locked: false,
    });
    nodeIds.push(id);
    index += 1;
  });

  const comments: unknown[] = [];
  for (let c = 0; c < commentCount; c += 1) {
    const commentId = crypto.randomUUID();
    comments.push({ id: commentId, text: `Commentaire ${c}` });
    const id = `n-c-${c}`;
    nodes.push({
      id,
      modelId: commentId,
      nodeType: 'comment',
      position: place(),
      width: 220,
      height: 120,
      locked: false,
    });
    nodeIds.push(id);
    index += 1;
  }

  const file = {
    formatVersion: 3,
    project: {
      id: crypto.randomUUID(),
      name: options.projectName ?? 'Grand modele',
      createdAt: now,
      updatedAt: now,
    },
    conceptualModel: { entities, associations },
    diagram: { nodes, viewport: { x: 0, y: 0, zoom: options.zoom ?? 0.5 }, comments },
    settings: {
      sqlDialect: 'postgresql',
      namingConvention: 'snake_case',
      gridEnabled: true,
      snapToGrid: true,
    },
  };

  return {
    file,
    nodeIds,
    entityNames: entities.map((entity) => entity.name),
    nodeCount: nodes.length,
    participationCount: associations.length * 2,
  };
}

/** Écrit la fixture dans un fichier temporaire et retourne son chemin. */
export function writeLargeModelFixture(
  options: LargeModelFixtureOptions = {},
): { filePath: string; fixture: LargeModelFixture } {
  const fixture = createLargeModelFixture(options);
  const filePath = path.join(
    os.tmpdir(),
    `modrise-large-model-${Date.now()}-${Math.floor(Math.random() * 1e6)}.merise.json`,
  );
  fs.writeFileSync(filePath, JSON.stringify(fixture.file, null, 2));
  return { filePath, fixture };
}
