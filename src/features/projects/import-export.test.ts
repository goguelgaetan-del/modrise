/**
 * Ce que vérifie ce fichier, c'est la couche navigateur — pas le format.
 * Le parsing a ses propres tests dans `core/serialization`. Ici, trois
 * promesses seulement :
 *
 * 1. la taille est refusée **avant** toute lecture, pas après ;
 * 2. une lecture impossible devient un message, jamais une promesse rejetée
 *    avec une erreur que l'appelant ne saurait pas nommer ;
 * 3. le reste est délégué au noyau sans réinterprétation.
 */
import { describe, expect, it, vi } from 'vitest';
import { MAX_PROJECT_FILE_BYTES, FileFormatError } from '@/core/serialization/file-format';
import v3Raw from '@/tests/fixtures/formats/v3.merise.json?raw';
import { exportFileName, readProjectFile } from './import-export';

/**
 * Un faux `File` : `text()` est espionnable et la taille est arbitraire, ce
 * qui permet de simuler un fichier de 20 Mio sans en allouer un.
 */
function fakeFile(options: { size: number; text: () => Promise<string> }): File {
  return { name: 'projet.merise.json', size: options.size, text: vi.fn(options.text) } as unknown as File;
}

async function messageFor(file: File): Promise<string> {
  try {
    await readProjectFile(file);
  } catch (error) {
    expect(error).toBeInstanceOf(FileFormatError);
    return (error as FileFormatError).message;
  }
  throw new Error('ce fichier aurait dû être refusé');
}

describe('readProjectFile', () => {
  it('lit et migre un fichier valide', async () => {
    const file = fakeFile({ size: v3Raw.length, text: () => Promise.resolve(v3Raw) });

    const { project, warnings } = await readProjectFile(file);

    expect(project.name).toBe('Fixture de format v3');
    expect(warnings).toEqual([]);
  });

  it('refuse un fichier surdimensionné sans jamais le lire', async () => {
    const text = vi.fn(() => Promise.resolve('{}'));
    const file = fakeFile({ size: 20 * 1024 * 1024, text });

    const message = await messageFor(file);

    expect(message).toContain('20.0 Mio');
    expect(message).toContain("limite d'import");
    // Le point de tout l'exercice : on n'a pas chargé 20 Mio en mémoire pour
    // découvrir qu'ils faisaient 20 Mio.
    expect(text).not.toHaveBeenCalled();
  });

  it('accepte exactement la limite', async () => {
    const text = vi.fn(() => Promise.resolve(v3Raw));
    const file = fakeFile({ size: MAX_PROJECT_FILE_BYTES, text });

    await expect(readProjectFile(file)).resolves.toMatchObject({ warnings: [] });
    expect(text).toHaveBeenCalledTimes(1);
  });

  it('refuse un fichier vide sans le lire', async () => {
    const text = vi.fn(() => Promise.resolve(''));
    const file = fakeFile({ size: 0, text });

    expect(await messageFor(file)).toBe('Ce fichier est vide.');
    expect(text).not.toHaveBeenCalled();
  });

  it('transforme une lecture impossible en message, pas en promesse rejetée obscure', async () => {
    // Cas réel : le fichier a été supprimé, déplacé ou son support retiré
    // entre la sélection et la lecture. `File.text()` rejette alors avec une
    // `DOMException` que l'interface ne saurait pas présenter.
    const file = fakeFile({
      size: 1024,
      text: () => Promise.reject(new DOMException('NotReadableError', 'NotReadableError')),
    });

    expect(await messageFor(file)).toBe(
      "Ce fichier n'a pas pu être lu. Vérifiez qu'il est toujours accessible, puis réessayez.",
    );
  });

  it('délègue les erreurs de format au noyau sans les réécrire', async () => {
    const file = fakeFile({ size: 24, text: () => Promise.resolve('{"pas": "un projet"}') });

    expect(await messageFor(file)).toBe(
      'Ce fichier ne déclare pas de version de format (champ « formatVersion »).',
    );
  });
});

describe('exportFileName', () => {
  it('produit un nom de fichier sûr à partir du nom du projet', () => {
    expect(exportFileName('Gestion d’hôtel')).toBe('gestion-d-hotel.merise.json');
  });

  it('retombe sur un nom générique quand le nom ne donne rien', () => {
    expect(exportFileName('   ')).toBe('projet.merise.json');
  });
});
