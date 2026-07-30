import { describe, expect, it } from 'vitest';
import { computeAlignment, computeDistribution } from './align';
import type { DiagramNode } from './types';

function node(
  id: string,
  x: number,
  y: number,
  width = 200,
  height = 100,
  locked = false,
): DiagramNode {
  return { id, modelId: id, nodeType: 'entity', position: { x, y }, width, height, locked };
}

describe('computeAlignment', () => {
  it('ne fait rien pour moins de deux nœuds', () => {
    expect(computeAlignment([node('a', 0, 0)], 'left').size).toBe(0);
  });

  it('aligne à gauche sur le x minimum', () => {
    const nodes = [node('a', 100, 0), node('b', 300, 50)];
    const positions = computeAlignment(nodes, 'left');
    expect(positions.get('a')).toEqual({ x: 100, y: 0 });
    expect(positions.get('b')).toEqual({ x: 100, y: 50 });
  });

  it('aligne à droite sur le bord droit maximum', () => {
    const nodes = [node('a', 0, 0, 200), node('b', 100, 50, 100)];
    // bords droits : 200 et 200 -> maxRight = 200
    const positions = computeAlignment(nodes, 'right');
    expect(positions.get('a')).toEqual({ x: 0, y: 0 });
    expect(positions.get('b')).toEqual({ x: 100, y: 50 });
  });

  it('centre horizontalement sur le centre du rectangle englobant', () => {
    const nodes = [node('a', 0, 0, 200), node('b', 400, 0, 200)];
    // englobant x: 0..600, centre = 300
    const positions = computeAlignment(nodes, 'centerX');
    expect(positions.get('a')!.x).toBe(200); // 300 - 100
    expect(positions.get('b')!.x).toBe(200);
  });

  it('aligne en haut, en bas et centre verticalement', () => {
    const nodes = [node('a', 0, 0, 200, 100), node('b', 0, 200, 200, 50)];
    expect(computeAlignment(nodes, 'top').get('b')).toEqual({ x: 0, y: 0 });
    expect(computeAlignment(nodes, 'bottom').get('a')).toEqual({ x: 0, y: 150 }); // maxBottom(250) - height(100)
    const centered = computeAlignment(nodes, 'centerY');
    // englobant y: 0..250, centre=125
    expect(centered.get('a')!.y).toBe(75); // 125 - 50
    expect(centered.get('b')!.y).toBe(100); // 125 - 25
  });

  it('un nœud verrouillé sert d’ancre mais n’est jamais déplacé', () => {
    const locked = node('locked', 500, 0, 200, 100, true);
    const nodes = [node('a', 0, 0), locked];
    const positions = computeAlignment(nodes, 'left');
    expect(positions.has('locked')).toBe(false);
    // Ancre le calcul : minX = 0 (venant de 'a'), donc 'a' reste sur place ici,
    // mais on vérifie surtout que le verrouillé n'apparaît jamais dans le résultat.
    expect(positions.get('a')).toEqual({ x: 0, y: 0 });
  });

  it('un nœud verrouillé décale la cible pour les autres (il sert d’ancre)', () => {
    // Le verrouillé a le x le plus petit : 'a' doit s'aligner sur lui, bien
    // qu'il ne figure jamais lui-même dans le résultat.
    const locked = node('locked', 20, 0, 200, 100, true);
    const nodes = [node('a', 100, 0), locked];
    const positions = computeAlignment(nodes, 'left');
    expect(positions.get('a')).toEqual({ x: 20, y: 0 });
    expect(positions.has('locked')).toBe(false);
  });
});

describe('computeDistribution', () => {
  it('ne fait rien pour moins de trois nœuds', () => {
    const nodes = [node('a', 0, 0), node('b', 100, 0)];
    expect(computeDistribution(nodes, 'horizontal').size).toBe(0);
  });

  it('distribue horizontalement en conservant les deux extrêmes', () => {
    // centres : a=100 (0+100), b=550 (500+50), c=1100 (1000+100)
    const nodes = [node('a', 0, 0, 200), node('b', 500, 0, 100), node('c', 1000, 0, 200)];
    const positions = computeDistribution(nodes, 'horizontal');
    expect(positions.has('a')).toBe(false); // extrême, jamais dans le résultat
    expect(positions.has('c')).toBe(false); // extrême
    // espacement centre-à-centre régulier entre 100 et 1100 sur 3 nœuds : b au centre (600)
    expect(positions.get('b')!.x).toBe(550); // 600 - 50 (demi-largeur)
    expect(positions.get('b')!.y).toBe(0);
  });

  it('distribue verticalement en espaçant régulièrement les centres', () => {
    const nodes = [node('a', 0, 0, 100, 100), node('b', 0, 400, 100, 100), node('c', 0, 900, 100, 100)];
    const positions = computeDistribution(nodes, 'vertical');
    // centres : a=50, b=450, c=950 -> pas régulier au départ (400 puis 500) ;
    // après distribution, le milieu doit être exactement à mi-chemin (500).
    expect(positions.get('b')!.y).toBe(500 - 50);
  });

  it('un nœud verrouillé au milieu de la sélection n’est jamais déplacé', () => {
    const lockedMiddle = node('b', 500, 0, 100, 100, true);
    const nodes = [node('a', 0, 0, 200), lockedMiddle, node('c', 1000, 0, 200)];
    const positions = computeDistribution(nodes, 'horizontal');
    expect(positions.has('b')).toBe(false);
  });
});
