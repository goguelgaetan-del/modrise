import { describe, expect, it } from 'vitest';
import { createAttribute, createEntity } from '../conceptual-model/factories';
import type { Association, ConceptualModel } from '../conceptual-model/types';
import { createHotelExampleProject } from '../examples/hotel';
import {
  compositeIdentifierModel,
  invalidModel,
  manyToManyModel,
  nameCollisionModel,
  nAryModel,
  oneToManyCompositeKeyModel,
  oneToManyModel,
  oneToOneModel,
  oneToOneOptionalOptionalModel,
  oneToOneRequiredRequiredModel,
  reflexiveManyToManyModel,
  reflexiveModel,
} from '../../tests/fixtures/models';
import { LOGICAL_TRANSFORMATION_CODES, transformToLogicalModel } from './mcd-to-mld';
import type { LogicalModel, LogicalTable } from '../logical-model/types';

function transform(model: ConceptualModel): LogicalModel {
  const result = transformToLogicalModel(model);
  if (!result.success) {
    throw new Error(`Transformation inattendue en échec : ${JSON.stringify(result.issues)}`);
  }
  return result.model;
}

function findTable(model: LogicalModel, namePart: string): LogicalTable {
  const table = model.tables.find((t) => t.name.includes(namePart));
  if (!table)
    throw new Error(
      `Table contenant « ${namePart} » introuvable parmi : ${model.tables.map((t) => t.name).join(', ')}`,
    );
  return table;
}

function columnNames(table: LogicalTable): string[] {
  return table.columns.map((c) => c.name);
}

describe('transformToLogicalModel — entités', () => {
  it('crée une table par entité avec ses colonnes dans l’ordre des attributs', () => {
    const model = transform(oneToManyModel());
    const client = findTable(model, 'client');
    expect(columnNames(client)).toEqual(['id']);
    expect(client.sourceIds).toEqual(expect.arrayContaining([expect.any(String)]));
  });

  it('conserve les types conceptuels dans les colonnes', () => {
    const conceptual: ConceptualModel = { entities: [], associations: [] };
    const entity = createEntity({ name: 'PRODUIT' });
    entity.attributes.push(
      createAttribute({ name: 'prix', dataType: { kind: 'decimal', precision: 8, scale: 2 } }),
    );
    conceptual.entities.push(entity);
    const model = transform(conceptual);
    const table = findTable(model, 'produit');
    const prix = table.columns.find((c) => c.name === 'prix');
    expect(prix?.dataType).toEqual({ kind: 'decimal', precision: 8, scale: 2 });
    expect(prix?.origin).toBe('entity-attribute');
    expect(prix?.sourceId).toBe(entity.attributes[1]?.id);
  });

  it('nullable = !required pour les attributs propres', () => {
    const model = transform(oneToManyModel());
    const client = findTable(model, 'client');
    // L'attribut "id" par défaut est required: true → non nullable
    expect(client.columns[0]?.nullable).toBe(false);
  });

  it('produit une clé primaire simple à partir de l’identifiant primaire', () => {
    const model = transform(oneToManyModel());
    const client = findTable(model, 'client');
    expect(client.primaryKey).toHaveLength(1);
    expect(client.primaryKey[0]).toBe(client.columns[0]?.id);
  });

  it('produit une clé primaire composée', () => {
    const model = transform(compositeIdentifierModel());
    const table = findTable(model, 'ligne_commande');
    expect(table.primaryKey).toHaveLength(2);
    expect(columnNames(table)).toEqual(['id', 'no_ligne']);
  });

  it('transforme un identifiant alternatif en contrainte unique', () => {
    const conceptual: ConceptualModel = { entities: [], associations: [] };
    const entity = createEntity({ name: 'CLIENT' });
    const email = createAttribute({ name: 'email', dataType: { kind: 'varchar', length: 255 } });
    entity.attributes.push(email);
    entity.identifiers.push({ id: 'alt-1', attributeIds: [email.id], primary: false });
    conceptual.entities.push(entity);
    const model = transform(conceptual);
    const table = findTable(model, 'client');
    expect(table.uniqueConstraints).toHaveLength(1);
    expect(table.uniqueConstraints[0]?.sourceIdentifierId).toBe('alt-1');
  });

  it('transforme un identifiant alternatif composé en contrainte unique multi-colonnes, ordre conservé', () => {
    const conceptual: ConceptualModel = { entities: [], associations: [] };
    const entity = createEntity({ name: 'RESERVATION' });
    const chambre = createAttribute({ name: 'chambre', dataType: { kind: 'integer' } });
    const dateArrivee = createAttribute({ name: 'date_arrivee', dataType: { kind: 'date' } });
    entity.attributes.push(chambre, dateArrivee);
    entity.identifiers.push({
      id: 'alt-composite',
      name: 'UQ_CHAMBRE_DATE',
      attributeIds: [chambre.id, dateArrivee.id],
      primary: false,
    });
    conceptual.entities.push(entity);
    const model = transform(conceptual);
    const table = findTable(model, 'reservation');
    const constraint = table.uniqueConstraints.find((uq) => uq.sourceIdentifierId === 'alt-composite');
    expect(constraint).toBeDefined();
    const columnNames = constraint!.columnIds.map(
      (id) => table.columns.find((c) => c.id === id)?.name,
    );
    expect(columnNames).toEqual(['chambre', 'date_arrivee']);
  });

  it('transforme un attribut `unique` hors identifiant en contrainte unique', () => {
    const model = transform(createHotelExampleProject().conceptualModel);
    const client = findTable(model, 'client');
    const emailConstraint = client.uniqueConstraints.find((uq) =>
      uq.columnIds.some((id) => client.columns.find((c) => c.id === id)?.name === 'email'),
    );
    expect(emailConstraint).toBeDefined();
    expect(emailConstraint?.sourceIdentifierId).toBeUndefined();
  });
});

describe('transformToLogicalModel — association 1,N', () => {
  it('ajoute la clé étrangère du côté max=1, référencant le côté max=N', () => {
    const model = transform(oneToManyModel());
    const commande = findTable(model, 'commande');
    const client = findTable(model, 'client');
    expect(commande.foreignKeys).toHaveLength(1);
    const fk = commande.foreignKeys[0];
    expect(fk?.referencedTableId).toBe(client.id);
    expect(fk?.referencedColumnIds).toEqual(client.primaryKey);
    expect(columnNames(commande)).toContain('client_id');
  });

  it('la clé étrangère est non nullable quand le côté porteur a un minimum de 1 (hôtel : réservation → client)', () => {
    const model = transform(createHotelExampleProject().conceptualModel);
    const reservation = findTable(model, 'reservation');
    expect(columnNames(reservation)).toContain('client_id_client');
    const fk = reservation.foreignKeys[0];
    expect(fk?.nullable).toBe(false);
    const column = reservation.columns.find((c) => c.name === 'client_id_client');
    expect(column?.nullable).toBe(false);
  });

  it('la clé étrangère est nullable quand le côté porteur a un minimum de 0', () => {
    const model: ConceptualModel = oneToManyModel();
    const commandeAssoc = model.associations[0];
    const commandeParticipation = commandeAssoc?.participations.find(
      (p) => p.cardinality.max === 1,
    );
    if (commandeParticipation) commandeParticipation.cardinality = { min: 0, max: 1 };
    const result = transformToLogicalModel(model);
    if (!result.success) throw new Error('échec inattendu');
    const commande = findTable(result.model, 'commande');
    expect(commande.foreignKeys[0]?.nullable).toBe(true);
  });

  it('migre une clé primaire composée (plusieurs colonnes de référence)', () => {
    const model = transform(oneToManyCompositeKeyModel());
    const commande = findTable(model, 'commande');
    expect(commande.foreignKeys).toHaveLength(1);
    expect(commande.foreignKeys[0]?.columnIds).toHaveLength(2);
    expect(columnNames(commande)).toEqual(
      expect.arrayContaining(['client_code', 'client_version']),
    );
  });

  it('migre les attributs portés par l’association dans la table du côté max=1', () => {
    const model = transform(createHotelExampleProject().conceptualModel);
    const reservation = findTable(model, 'reservation');
    // EFFECTUER ne porte pas d'attribut dans le fixture hôtel ; on vérifie via un modèle dédié.
    expect(reservation).toBeDefined();
  });

  it('un attribut porté par une association 1,N migre après les colonnes propres et la FK', () => {
    const model = oneToManyModel();
    const association = model.associations[0];
    if (association) {
      association.attributes.push(
        createAttribute({ name: 'date_creation', dataType: { kind: 'date' }, required: true }),
      );
    }
    const result = transformToLogicalModel(model);
    if (!result.success) throw new Error('échec inattendu');
    const commande = findTable(result.model, 'commande');
    expect(columnNames(commande)).toEqual(['id', 'client_id', 'date_creation']);
    const dateCol = commande.columns.find((c) => c.name === 'date_creation');
    expect(dateCol?.origin).toBe('association-attribute');
  });

  it('utilise le rôle pour nommer la colonne migrée quand il est présent (réflexif 1,N)', () => {
    const model = transform(reflexiveModel());
    const employe = findTable(model, 'employe');
    expect(columnNames(employe)).toContain('manager_id');
    expect(employe.foreignKeys[0]?.referencedTableId).toBe(employe.id);
  });

  it('résout une collision entre une clé migrée et un attribut local (avertissement émis)', () => {
    const model = oneToManyModel();
    const commandeEntity = model.entities.find((e) => e.name === 'COMMANDE');
    commandeEntity?.attributes.push(
      createAttribute({ name: 'client_id', dataType: { kind: 'integer' } }),
    );
    const result = transformToLogicalModel(model);
    if (!result.success) throw new Error('échec inattendu');
    const commande = findTable(result.model, 'commande');
    const names = columnNames(commande);
    expect(names.filter((n) => n.startsWith('client_id')).length).toBeGreaterThanOrEqual(2);
    expect(
      result.model.issues.some(
        (issue) => issue.code === LOGICAL_TRANSFORMATION_CODES.sqlNameCollisionResolved,
      ),
    ).toBe(true);
  });
});

describe('transformToLogicalModel — association N,N', () => {
  it('crée une table associative avec deux clés étrangères', () => {
    const model = transform(manyToManyModel());
    const contenir = findTable(model, 'contenir');
    expect(contenir.foreignKeys).toHaveLength(2);
  });

  it('la clé primaire de la table associative est composée des colonnes de référence', () => {
    const model = transform(manyToManyModel());
    const contenir = findTable(model, 'contenir');
    expect(contenir.primaryKey).toEqual(contenir.foreignKeys.flatMap((fk) => fk.columnIds));
  });

  it('inclut les attributs portés par l’association', () => {
    const model = transform(manyToManyModel());
    const contenir = findTable(model, 'contenir');
    expect(columnNames(contenir)).toContain('quantite');
    const quantite = contenir.columns.find((c) => c.name === 'quantite');
    expect(quantite?.origin).toBe('association-attribute');
    expect(quantite?.nullable).toBe(false);
  });

  it('gère les clés composées des deux côtés d’une association N,N', () => {
    const model: ConceptualModel = { entities: [], associations: [] };
    const a = createEntity({ name: 'A' });
    const codeA = createAttribute({ name: 'code', dataType: { kind: 'varchar', length: 5 } });
    a.attributes.push(codeA);
    a.identifiers[0]?.attributeIds.push(codeA.id);
    const b = createEntity({ name: 'B' });
    const codeB = createAttribute({ name: 'code', dataType: { kind: 'varchar', length: 5 } });
    b.attributes.push(codeB);
    b.identifiers[0]?.attributeIds.push(codeB.id);
    const assoc = manyToManyModel().associations[0];
    if (!assoc) throw new Error('fixture inattendue');
    assoc.participations = [
      { id: 'p1', entityId: a.id, cardinality: { min: 0, max: 'N' } },
      { id: 'p2', entityId: b.id, cardinality: { min: 0, max: 'N' } },
    ];
    model.entities.push(a, b);
    model.associations.push(assoc);
    const result = transformToLogicalModel(model);
    if (!result.success) throw new Error('échec inattendu');
    const junction = findTable(result.model, assoc.name.toLowerCase());
    expect(junction.primaryKey).toHaveLength(4); // 2 colonnes par entité (id + code)
  });

  it('respecte l’ordre des participations pour les colonnes de la table associative', () => {
    const model = transform(manyToManyModel());
    const contenir = findTable(model, 'contenir');
    expect(columnNames(contenir)).toEqual(['commande_id', 'produit_id', 'quantite']);
  });

  it('ordre déterministe : deux transformations du même modèle produisent le même résultat', () => {
    const model = manyToManyModel();
    const a = transformToLogicalModel(model);
    const b = transformToLogicalModel(model);
    expect(a).toEqual(b);
  });
});

describe('transformToLogicalModel — association 1,1', () => {
  it('0,1 — 1,1 : place la clé étrangère du côté optionnel, nullable et unique', () => {
    const model = transform(oneToOneModel());
    const passeport = findTable(model, 'passeport');
    expect(passeport.foreignKeys).toHaveLength(1);
    expect(passeport.foreignKeys[0]?.nullable).toBe(true);
    expect(passeport.foreignKeys[0]?.unique).toBe(true);
    expect(passeport.uniqueConstraints).toHaveLength(1);
  });

  it('1,1 — 1,1 : choisit un côté de manière déterministe et avertit', () => {
    const result = transformToLogicalModel(oneToOneRequiredRequiredModel());
    if (!result.success) throw new Error('échec inattendu');
    const epoux = findTable(result.model, 'epoux');
    expect(epoux.foreignKeys).toHaveLength(1);
    expect(epoux.foreignKeys[0]?.nullable).toBe(false);
    expect(
      result.model.issues.some(
        (issue) => issue.code === LOGICAL_TRANSFORMATION_CODES.oneToOneAmbiguousSideSelected,
      ),
    ).toBe(true);
  });

  it('0,1 — 0,1 : choisit un côté de manière déterministe, nullable, et avertit', () => {
    const result = transformToLogicalModel(oneToOneOptionalOptionalModel());
    if (!result.success) throw new Error('échec inattendu');
    const vehicule = findTable(result.model, 'vehicule');
    expect(vehicule.foreignKeys).toHaveLength(1);
    expect(vehicule.foreignKeys[0]?.nullable).toBe(true);
    expect(
      result.model.issues.some(
        (issue) => issue.code === LOGICAL_TRANSFORMATION_CODES.oneToOneAmbiguousSideSelected,
      ),
    ).toBe(true);
  });

  it('le choix déterministe est stable entre deux exécutions', () => {
    const model = oneToOneRequiredRequiredModel();
    const a = transformToLogicalModel(model);
    const b = transformToLogicalModel(model);
    expect(a).toEqual(b);
  });

  it('migre les attributs portés par une association 1,1 dans la table porteuse', () => {
    const model = oneToOneModel();
    const association = model.associations[0];
    association?.attributes.push(
      createAttribute({ name: 'numero_passeport', dataType: { kind: 'varchar', length: 20 } }),
    );
    const result = transformToLogicalModel(model);
    if (!result.success) throw new Error('échec inattendu');
    const passeport = findTable(result.model, 'passeport');
    expect(columnNames(passeport)).toContain('numero_passeport');
  });
});

describe('transformToLogicalModel — associations réflexives', () => {
  it('réflexif 1,N : une seule colonne migrée, nommée par le rôle du côté référencé', () => {
    const model = transform(reflexiveModel());
    const employe = findTable(model, 'employe');
    const migrated = employe.columns.filter((c) => c.origin === 'migrated-identifier');
    expect(migrated).toHaveLength(1);
    expect(migrated[0]?.name).toBe('manager_id');
  });

  it('réflexif N,N : table associative avec deux colonnes de référence distinctes vers la même entité', () => {
    const model = transform(reflexiveManyToManyModel());
    const collaborer = findTable(model, 'collaborer');
    expect(collaborer.foreignKeys).toHaveLength(2);
    expect(columnNames(collaborer)).toEqual(
      expect.arrayContaining(['initiateur_id', 'collegue_id']),
    );
    expect(
      collaborer.foreignKeys.every(
        (fk) => fk.referencedTableId === collaborer.foreignKeys[0]?.referencedTableId,
      ),
    ).toBe(true);
  });

  it('gère une clé primaire composée sur une association réflexive', () => {
    const model: ConceptualModel = { entities: [], associations: [] };
    const entity = createEntity({ name: 'NOEUD' });
    const codeAttr = createAttribute({ name: 'code', dataType: { kind: 'varchar', length: 5 } });
    entity.attributes.push(codeAttr);
    entity.identifiers[0]?.attributeIds.push(codeAttr.id);
    const assoc = createAssociationFixtureReflexive(entity.id);
    model.entities.push(entity);
    model.associations.push(assoc);
    const result = transformToLogicalModel(model);
    if (!result.success) throw new Error('échec inattendu');
    const table = findTable(result.model, assoc.name.toLowerCase());
    expect(table.primaryKey).toHaveLength(4); // 2 participations x 2 colonnes de clé
  });

  it('rôles manquants : la collision est résolue et signalée (pas de plantage)', () => {
    const model = reflexiveModel();
    for (const participation of model.associations[0]?.participations ?? []) {
      participation.role = undefined;
    }
    const result = transformToLogicalModel(model);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(
      result.model.issues.some(
        (issue) => issue.code === LOGICAL_TRANSFORMATION_CODES.reflexiveAssociationMissingRole,
      ),
    ).toBe(true);
    const employe = findTable(result.model, 'employe');
    const migratedNames = employe.columns
      .filter((c) => c.origin === 'migrated-identifier')
      .map((c) => c.name);
    expect(new Set(migratedNames).size).toBe(migratedNames.length); // pas de doublon malgré rôles absents
  });

  it('rôles identiques après normalisation : signalés comme rôles manquants', () => {
    const model = reflexiveManyToManyModel();
    for (const participation of model.associations[0]?.participations ?? []) {
      participation.role = 'Pair';
    }
    const result = transformToLogicalModel(model);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(
      result.model.issues.some(
        (issue) => issue.code === LOGICAL_TRANSFORMATION_CODES.reflexiveAssociationMissingRole,
      ),
    ).toBe(true);
  });
});

function createAssociationFixtureReflexive(entityId: string): Association {
  return {
    id: 'assoc-reflexive-composite',
    name: 'RELIER',
    attributes: [],
    participations: [
      { id: 'p1', entityId, role: 'origine', cardinality: { min: 0, max: 'N' } },
      { id: 'p2', entityId, role: 'destination', cardinality: { min: 0, max: 'N' } },
    ],
  };
}

describe('transformToLogicalModel — association n-aire', () => {
  it('crée une table associative avec une clé étrangère par participation', () => {
    const model = transform(nAryModel());
    const enseigner = findTable(model, 'enseigner');
    expect(enseigner.foreignKeys).toHaveLength(3);
    expect(enseigner.primaryKey).toHaveLength(3);
  });

  it('émet un avertissement informatif pour une association n-aire', () => {
    const result = transformToLogicalModel(nAryModel());
    if (!result.success) throw new Error('échec inattendu');
    expect(
      result.model.issues.some(
        (issue) => issue.code === LOGICAL_TRANSFORMATION_CODES.naryAssociationJunctionTableCreated,
      ),
    ).toBe(true);
  });

  it('respecte l’ordre des participations dans les colonnes générées', () => {
    const model = transform(nAryModel());
    const enseigner = findTable(model, 'enseigner');
    expect(columnNames(enseigner)).toEqual(['enseignant_id', 'matiere_id', 'classe_id']);
  });
});

describe('transformToLogicalModel — nommage et collisions', () => {
  it('normalise les accents dans les noms de table', () => {
    const model: ConceptualModel = {
      entities: [createEntity({ name: 'Élève' })],
      associations: [],
    };
    const result = transformToLogicalModel(model);
    if (!result.success) throw new Error('échec inattendu');
    expect(result.model.tables[0]?.name).toBe('eleve');
  });

  it('résout une collision entre deux entités normalisées vers le même nom', () => {
    const result = transformToLogicalModel(nameCollisionModel());
    if (!result.success) throw new Error('échec inattendu');
    const names = result.model.tables.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain('date_debut');
    expect(names).toContain('date_debut_2');
    expect(
      result.model.issues.some(
        (issue) => issue.code === LOGICAL_TRANSFORMATION_CODES.sqlNameCollisionResolved,
      ),
    ).toBe(true);
  });

  it('la stabilité du nommage est identique entre deux exécutions', () => {
    const model = nameCollisionModel();
    const a = transformToLogicalModel(model);
    const b = transformToLogicalModel(model);
    expect(a).toEqual(b);
  });
});

describe('transformToLogicalModel — erreurs et robustesse', () => {
  it('bloque la transformation en présence d’erreurs de validation', () => {
    const result = transformToLogicalModel(invalidModel());
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.every((issue) => issue.severity === 'error')).toBe(true);
  });

  it('ne lève jamais d’exception, même sur un modèle vide', () => {
    expect(() => transformToLogicalModel({ entities: [], associations: [] })).not.toThrow();
    const result = transformToLogicalModel({ entities: [], associations: [] });
    expect(result.success).toBe(true);
  });

  it('reste défensif si une participation référence une entité inconnue malgré le passage de la validation', () => {
    const model = oneToManyModel();
    const association = model.associations[0];
    const participation = association?.participations.find((p) => p.cardinality.max === 'N');
    if (participation) participation.entityId = 'entite-fantome';
    // On contourne volontairement la validation pour tester la robustesse du transformateur seul.
    expect(() => transformToLogicalModel(model)).not.toThrow();
  });
});

describe('transformToLogicalModel — performance', () => {
  it('reste rapide sur un modèle de grande taille (~100 entités, ~200 associations)', () => {
    const model: ConceptualModel = { entities: [], associations: [] };
    for (let i = 0; i < 100; i += 1) {
      const entity = createEntity({ name: `ENTITE_${i}` });
      entity.attributes.push(
        createAttribute({ name: 'nom', dataType: { kind: 'varchar', length: 100 } }),
        createAttribute({ name: 'valeur', dataType: { kind: 'integer' } }),
      );
      model.entities.push(entity);
    }
    for (let i = 0; i < 200; i += 1) {
      const a = model.entities[i % model.entities.length];
      const b = model.entities[(i + 1) % model.entities.length];
      if (!a || !b) continue;
      model.associations.push({
        id: `assoc-${i}`,
        name: `ASSOC_${i}`,
        attributes: [],
        participations: [
          { id: `p-${i}-a`, entityId: a.id, cardinality: { min: 0, max: 'N' } },
          { id: `p-${i}-b`, entityId: b.id, cardinality: { min: 1, max: 1 } },
        ],
      });
    }
    const start = performance.now();
    const result = transformToLogicalModel(model);
    const durationMs = performance.now() - start;
    expect(result.success).toBe(true);
    expect(durationMs).toBeLessThan(2000);
  });
});
