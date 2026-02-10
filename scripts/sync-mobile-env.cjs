/**
 * Copie les variables Supabase du .env racine vers mobile/.env
 * pour que l'app mobile utilise la même config (react-native-config lit mobile/.env).
 * Utilise VITE_SUPABASE_* ou SUPABASE_* du fichier racine.
 */
const fs = require('fs');
const path = require('path');

const rootEnvPath = path.join(__dirname, '..', '.env');
const mobileEnvPath = path.join(__dirname, '..', 'mobile', '.env');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/^\uFEFF/, ''); // BOM
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (val) out[key] = val;
  }
  return out;
}

const root = parseEnv(rootEnvPath);
const url = root.SUPABASE_URL || root.VITE_SUPABASE_URL || '';
const key = root.SUPABASE_ANON_KEY || root.VITE_SUPABASE_ANON_KEY || '';

if (!url || !key) {
  console.warn('sync-mobile-env: aucune SUPABASE_URL/SUPABASE_ANON_KEY (ou VITE_*) trouvée.');
  console.warn('  Fichier lu: ' + rootEnvPath);
  console.warn('  Vérifiez que le .env à la racine contient VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.');
  process.exit(0);
}

const mobileDir = path.dirname(mobileEnvPath);
if (!fs.existsSync(mobileDir)) {
  console.warn('sync-mobile-env: dossier mobile/ introuvable');
  process.exit(1);
}

const content = `# Généré par scripts/sync-mobile-env.cjs - ne pas commiter si clés réelles
SUPABASE_URL=${url}
SUPABASE_ANON_KEY=${key}
`;
fs.writeFileSync(mobileEnvPath, content, 'utf8');
console.log('sync-mobile-env: mobile/.env mis à jour avec SUPABASE_URL et SUPABASE_ANON_KEY');
console.log('  (à partir de .env racine)');
process.exit(0);
