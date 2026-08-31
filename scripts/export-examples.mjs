/**
 * Réécrit les fichiers `examples/*.merise.json` à partir des fabriques
 * déterministes de `src/core/examples`.
 *
 * Les exemples ne sont jamais recopiés à la main : le dépôt ne contient que
 * le résultat exporté de ce script, et `examples.test.ts` échoue si les deux
 * divergent. Les projets sont construits en mode figé (`frozen: true`) pour
 * que deux exécutions produisent des octets identiques — sans quoi chaque
 * exécution créerait une différence de `id` et de dates.
 *
 * Le script passe par Vite (`ssrLoadModule`) plutôt que par un exécuteur
 * TypeScript : cela évite d'ajouter une dépendance juste pour trois fichiers,
 * et garantit que l'alias `@/` et la configuration du projet s'appliquent.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(root, 'examples');

const server = await createServer({
  root,
  configFile: join(root, 'vite.config.ts'),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'warn',
});

try {
  const { DELIVERED_EXAMPLES } = await server.ssrLoadModule('/src/core/examples/index.ts');
  const { serializeProject } = await server.ssrLoadModule('/src/core/serialization/file-format.ts');

  await mkdir(outputDir, { recursive: true });

  for (const example of DELIVERED_EXAMPLES) {
    const content = `${serializeProject(example.create({ frozen: true }))}\n`;
    await writeFile(join(outputDir, example.fileName), content, 'utf8');
    process.stdout.write(
      `examples/${example.fileName} — ${String(Buffer.byteLength(content))} octets\n`,
    );
  }
} finally {
  await server.close();
}
