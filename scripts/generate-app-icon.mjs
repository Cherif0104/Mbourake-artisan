/**
 * Génère une icône PWA agrandie (contenu plus visible sur mobile).
 * Zoom sur le centre pour que le logo et le texte "Mbouraké" soient plus lisibles.
 * Usage: npm run icon:generate
 * Pour ajuster le zoom, modifier ZOOM ci-dessous.
 */
import sharp from 'sharp';
import { existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public', 'icons');
const sourcePath = join(publicDir, 'icon-mbourake-source.png');
const inputPath = join(publicDir, 'icon-mbourake.png');
const outputPath = join(publicDir, 'icon-mbourake.png');
const outputPath192 = join(publicDir, 'icon-mbourake-192.png');
const outputPath512 = join(publicDir, 'icon-mbourake-512.png');

// Facteur de zoom : 1.6 = le contenu central occupe plus d'espace (logo et texte plus lisibles)
const ZOOM = 1.6;
const SIZE = 512;

async function main() {
  if (!existsSync(inputPath)) {
    console.error('Fichier introuvable:', inputPath);
    process.exit(1);
  }
  // Conserver une copie de l'original pour éviter le double zoom si on relance le script
  if (!existsSync(sourcePath)) {
    copyFileSync(inputPath, sourcePath);
    console.log('Source sauvegardée dans icon-mbourake-source.png');
  }
  const pathToUse = existsSync(sourcePath) ? sourcePath : inputPath;
  const image = sharp(pathToUse);
  const meta = await image.metadata();
  const w = meta.width || 512;
  const h = meta.height || 512;

  // Zoom : on agrandit l'image (scale uniforme) puis on recadre le centre 512x512
  const newW = Math.max(SIZE, Math.round(w * ZOOM));
  const newH = Math.max(SIZE, Math.round(h * ZOOM));

  const resized = await image
    .resize(newW, newH, { fit: 'inside', withoutEnlargement: false })
    .toBuffer({ resolveWithObject: true });

  const rw = resized.info.width;
  const rh = resized.info.height;
  const extractW = Math.min(SIZE, rw);
  const extractH = Math.min(SIZE, rh);
  const left = Math.max(0, Math.floor((rw - extractW) / 2));
  const top = Math.max(0, Math.floor((rh - extractH) / 2));

  let zoomed = sharp(resized.data).extract({ left, top, width: extractW, height: extractH });
  if (extractW < SIZE || extractH < SIZE) {
    zoomed = zoomed.resize(SIZE, SIZE, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } });
  } else {
    zoomed = zoomed.resize(SIZE, SIZE);
  }

  await zoomed.clone().toFile(outputPath512);
  await zoomed.clone().resize(192, 192).toFile(outputPath192);

  // Remplacer l'original par la version 512 (pour apple-touch-icon, etc.)
  await zoomed.toFile(outputPath);

  console.log('Icônes générées :');
  console.log('  - icon-mbourake.png (512x512, zoomé)');
  console.log('  - icon-mbourake-192.png');
  console.log('  - icon-mbourake-512.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
