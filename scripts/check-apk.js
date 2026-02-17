#!/usr/bin/env node
/**
 * Vérifie la présence de l'APK Android avant le build.
 * Si absent, affiche un avertissement (le lien de téléchargement renverra 404).
 */
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apkPath = path.join(__dirname, '..', 'public', 'download', 'mbourake.apk');

if (!existsSync(apkPath)) {
  console.warn(
    '\n⚠️  [Mbourake] public/download/mbourake.apk est absent. Le lien "Télécharger l\'app Android" renverra 404 sur le site déployé. Ajoutez l’APK (release signé) dans public/download/ puis redéployez.\n',
  );
}
