/**
 * Registre de noms de contraintes SQL, local à une génération.
 *
 * PostgreSQL limite les identifiants à 63 octets. Les noms de clé étrangère
 * et de contrainte unique proviennent déjà, en pratique, du modèle logique
 * (déjà déduplicés par `LogicalNameRegistry` en v0.2) ; ce registre les fait
 * simplement transiter pour garantir l'unicité globale du script généré une
 * fois les noms de clé primaire (absents du MLD) ajoutés. Aucune fonction de
 * hachage n'est nécessaire : la résolution de collision utilise un suffixe
 * numérique stable, comme pour le nommage du MLD.
 */
const MAX_IDENTIFIER_BYTES = 63;
/** Marge laissée pour qu'un suffixe de désambiguïsation tienne dans la limite. */
const TRUNCATION_BYTES = 55;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/** Tronque une chaîne pour qu'elle ne dépasse pas `maxBytes` octets UTF-8, sans couper un caractère multi-octets. */
function truncateToBytes(value: string, maxBytes: number): string {
  if (byteLength(value) <= maxBytes) return value;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let end = value.length;
  while (end > 0 && encoder.encode(value.slice(0, end)).length > maxBytes) {
    end -= 1;
  }
  return decoder.decode(encoder.encode(value.slice(0, end)));
}

export interface ConstraintNameReservation {
  name: string;
  collided: boolean;
  truncated: boolean;
}

export class SqlConstraintNameRegistry {
  private readonly names = new Set<string>();

  /** Enregistre un nom déjà déterminé sans le modifier (ex. contraintes déjà nommées par le MLD). */
  claim(name: string): void {
    this.names.add(name.toLowerCase());
  }

  reserve(baseName: string): ConstraintNameReservation {
    const truncatedBase = truncateToBytes(baseName, TRUNCATION_BYTES);
    const truncated = truncatedBase !== baseName;
    const baseKey = truncatedBase.toLowerCase();

    if (!this.names.has(baseKey)) {
      this.names.add(baseKey);
      return { name: truncatedBase, collided: false, truncated };
    }

    let suffix = 2;
    let candidate: string;
    let candidateKey: string;
    do {
      candidate = `${truncatedBase}_${suffix}`;
      candidateKey = candidate.toLowerCase();
      suffix += 1;
    } while (this.names.has(candidateKey) || byteLength(candidate) > MAX_IDENTIFIER_BYTES);
    this.names.add(candidateKey);
    return { name: candidate, collided: true, truncated };
  }
}

export { MAX_IDENTIFIER_BYTES };
