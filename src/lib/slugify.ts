/** Convertit un texte libre en identifiant de fichier sûr (minuscules, tirets). */
export function slugify(value: string, fallback: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || fallback;
}
