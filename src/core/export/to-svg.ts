/**
 * Génère un document SVG autonome et vectoriel représentant le diagramme
 * entier (entités, associations, cardinalités, rôles, commentaires, liens,
 * texte) — pas une capture d'écran. Fonction pure, testable sans navigateur :
 * aucune mesure DOM, uniquement les dimensions déjà mesurées et stockées
 * dans `DiagramNode.width`/`height`.
 */
import type { Association, ConceptualModel, Entity } from '@/core/conceptual-model/types';
import { formatCardinality } from '@/core/conceptual-model/types';
import { formatDataType } from '@/core/conceptual-model/data-types';
import { isPrimaryAttribute } from '@/core/conceptual-model/operations';
import type { DiagramComment, DiagramNode } from '@/core/diagram/types';
import { nodeBorderPoint, nodeCenter } from '@/core/diagram/geometry';
import type { Bounds } from '@/core/diagram/bounds';

const FONT_FAMILY = 'system-ui, -apple-system, Segoe UI, sans-serif';
const HEADER_HEIGHT = 30;
const ROW_HEIGHT = 18;
const DEFAULT_EMPTY_BOUNDS: Bounds = { x: 0, y: 0, width: 400, height: 200 };

const ENTITY_FILL = '#ffffff';
const ENTITY_STROKE = '#334155';
const ENTITY_HEADER_FILL = '#f1f5f9';
const ENTITY_TEXT = '#0f172a';
const MUTED_TEXT = '#64748b';

const ASSOCIATION_FILL = '#eef2ff';
const ASSOCIATION_STROKE = '#6366f1';
const ASSOCIATION_TEXT = '#312e81';

const COMMENT_FILL = '#fffbeb';
const COMMENT_STROKE = '#fbbf24';
const COMMENT_TEXT = '#78350f';

const EDGE_STROKE = '#94a3b8';
const EDGE_LABEL_FILL = '#ffffff';
const EDGE_LABEL_STROKE = '#cbd5e1';
const EDGE_LABEL_TEXT = '#334155';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Découpage glouton par largeur estimée (pas de mesure canvas : la fonction
 * doit rester pure et exécutable hors navigateur).
 */
function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const avgCharWidth = fontSize * 0.55;
  const maxChars = Math.max(1, Math.floor(maxWidth / avgCharWidth));
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    if (paragraph.length === 0) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function displayName(name: string): string {
  return name.trim() || '(sans nom)';
}

function renderEntity(node: DiagramNode, entity: Entity): string {
  const { x, y } = node.position;
  const width = node.width ?? 200;
  const height = node.height ?? 100;
  const parts: string[] = [];

  parts.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="${ENTITY_FILL}" stroke="${ENTITY_STROKE}" stroke-width="2" />`);
  parts.push(`<rect x="${x}" y="${y}" width="${width}" height="${HEADER_HEIGHT}" fill="${ENTITY_HEADER_FILL}" />`);
  parts.push(`<line x1="${x}" y1="${y + HEADER_HEIGHT}" x2="${x + width}" y2="${y + HEADER_HEIGHT}" stroke="${ENTITY_STROKE}" stroke-width="1" />`);
  parts.push(
    `<text x="${x + width / 2}" y="${y + HEADER_HEIGHT / 2 + 4}" text-anchor="middle" font-size="13" font-weight="700" fill="${ENTITY_TEXT}">${escapeXml(displayName(entity.name))}</text>`,
  );

  if (entity.attributes.length === 0) {
    parts.push(
      `<text x="${x + 12}" y="${y + HEADER_HEIGHT + ROW_HEIGHT * 0.7}" font-size="11" font-style="italic" fill="${MUTED_TEXT}">Aucun attribut</text>`,
    );
  } else {
    entity.attributes.forEach((attribute, index) => {
      const primary = isPrimaryAttribute(entity, attribute.id);
      const rowY = y + HEADER_HEIGHT + ROW_HEIGHT * (index + 0.7);
      const namePart = primary
        ? `<tspan text-decoration="underline" font-weight="600">${escapeXml(displayName(attribute.name))}</tspan>`
        : escapeXml(displayName(attribute.name));
      const keyMarker = primary ? '🔑 ' : '';
      parts.push(
        `<text x="${x + 12}" y="${rowY}" font-size="11" fill="${ENTITY_TEXT}">${keyMarker}${namePart}<tspan fill="${MUTED_TEXT}"> : ${escapeXml(formatDataType(attribute.dataType))}</tspan></text>`,
      );
    });
  }

  return `<g data-entity="${escapeXml(entity.id)}">${parts.join('')}</g>`;
}

function renderAssociation(node: DiagramNode, association: Association): string {
  const { x, y } = node.position;
  const width = node.width ?? 160;
  const height = node.height ?? 60;
  const parts: string[] = [];
  const centerX = x + width / 2;

  parts.push(
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" fill="${ASSOCIATION_FILL}" stroke="${ASSOCIATION_STROKE}" stroke-width="2" />`,
  );
  const nameY = association.attributes.length > 0 ? y + 18 : y + height / 2 + 4;
  parts.push(
    `<text x="${centerX}" y="${nameY}" text-anchor="middle" font-size="13" font-weight="700" fill="${ASSOCIATION_TEXT}">${escapeXml(displayName(association.name))}</text>`,
  );

  if (association.attributes.length > 0) {
    parts.push(`<line x1="${x + 12}" y1="${y + 26}" x2="${x + width - 12}" y2="${y + 26}" stroke="${ASSOCIATION_STROKE}" stroke-width="1" />`);
    association.attributes.forEach((attribute, index) => {
      const rowY = y + 26 + ROW_HEIGHT * (index + 0.7);
      parts.push(
        `<text x="${centerX}" y="${rowY}" text-anchor="middle" font-size="11" fill="${MUTED_TEXT}">${escapeXml(displayName(attribute.name))} : ${escapeXml(formatDataType(attribute.dataType))}</text>`,
      );
    });
  }

  return `<g data-association="${escapeXml(association.id)}">${parts.join('')}</g>`;
}

function renderComment(node: DiagramNode, comment: DiagramComment): string {
  const { x, y } = node.position;
  const width = node.width ?? 160;
  const height = node.height ?? 80;
  const parts: string[] = [];

  parts.push(
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="${COMMENT_FILL}" stroke="${COMMENT_STROKE}" stroke-width="2" stroke-dasharray="4 3" />`,
  );
  parts.push(
    `<text x="${x + 10}" y="${y + 16}" font-size="9" font-weight="700" letter-spacing="0.05em" fill="${COMMENT_TEXT}">COMMENTAIRE</text>`,
  );

  const bodyText = comment.text.trim();
  if (bodyText) {
    const lines = wrapText(bodyText, width - 20, 11);
    lines.forEach((line, index) => {
      parts.push(
        `<text x="${x + 10}" y="${y + 32 + index * 14}" font-size="11" fill="${COMMENT_TEXT}">${escapeXml(line)}</text>`,
      );
    });
  }

  return `<g data-comment="${escapeXml(comment.id)}">${parts.join('')}</g>`;
}

function renderEdges(diagramNodes: DiagramNode[], model: ConceptualModel): string {
  const nodeByModelId = new Map(diagramNodes.map((node) => [node.modelId, node]));
  const parts: string[] = [];

  for (const association of model.associations) {
    const associationNode = nodeByModelId.get(association.id);
    if (!associationNode) continue;
    for (const participation of association.participations) {
      const entityNode = nodeByModelId.get(participation.entityId);
      if (!entityNode) continue;

      const entityCenter = nodeCenter(entityNode);
      const associationCenter = nodeCenter(associationNode);
      const a = nodeBorderPoint(entityNode, associationCenter.x, associationCenter.y);
      const b = nodeBorderPoint(associationNode, entityCenter.x, entityCenter.y);
      parts.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${EDGE_STROKE}" stroke-width="2" />`);

      const labelX = a.x + (b.x - a.x) * 0.3;
      const labelY = a.y + (b.y - a.y) * 0.3;
      const label = participation.role
        ? `${formatCardinality(participation.cardinality)} · ${participation.role}`
        : formatCardinality(participation.cardinality);
      const chipWidth = Math.max(24, label.length * 6 + 8);
      parts.push(
        `<rect x="${labelX - chipWidth / 2}" y="${labelY - 9}" width="${chipWidth}" height="16" rx="3" fill="${EDGE_LABEL_FILL}" stroke="${EDGE_LABEL_STROKE}" stroke-width="1" />`,
      );
      parts.push(
        `<text x="${labelX}" y="${labelY + 3}" text-anchor="middle" font-size="10" font-weight="600" fill="${EDGE_LABEL_TEXT}">${escapeXml(label)}</text>`,
      );
    }
  }

  return parts.join('');
}

export function renderDiagramToSvg(
  model: ConceptualModel,
  diagramNodes: DiagramNode[],
  comments: DiagramComment[],
  bounds: Bounds,
): string {
  const isEmpty = diagramNodes.length === 0;
  const viewBox = isEmpty ? DEFAULT_EMPTY_BOUNDS : bounds;
  const commentById = new Map(comments.map((comment) => [comment.id, comment]));
  const entityById = new Map(model.entities.map((entity) => [entity.id, entity]));
  const associationById = new Map(model.associations.map((association) => [association.id, association]));

  const body: string[] = [];
  body.push(`<rect x="${viewBox.x}" y="${viewBox.y}" width="${viewBox.width}" height="${viewBox.height}" fill="#ffffff" />`);

  if (isEmpty) {
    body.push(
      `<text x="${viewBox.x + viewBox.width / 2}" y="${viewBox.y + viewBox.height / 2}" text-anchor="middle" font-size="14" fill="${MUTED_TEXT}">Diagramme vide</text>`,
    );
  } else {
    body.push(renderEdges(diagramNodes, model));
    for (const node of diagramNodes) {
      if (node.nodeType === 'entity') {
        const entity = entityById.get(node.modelId);
        if (entity) body.push(renderEntity(node, entity));
      } else if (node.nodeType === 'association') {
        const association = associationById.get(node.modelId);
        if (association) body.push(renderAssociation(node, association));
      } else if (node.nodeType === 'comment') {
        const comment = commentById.get(node.modelId);
        if (comment) body.push(renderComment(node, comment));
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}" width="${viewBox.width}" height="${viewBox.height}" font-family="${FONT_FAMILY}">${body.join('')}</svg>`;
}
