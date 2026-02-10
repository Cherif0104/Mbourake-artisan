/**
 * Lance Metro ou Android/iOS en appelant le CLI React Native via Node
 * (sans passer par npm run dans un shell), pour éviter les problèmes
 * de chemin contenant "&" (ex: D:\DEVLAB & DEVOPS\...).
 */
const path = require('path');
const { spawn } = require('child_process');

const rootDir = path.join(__dirname, '..');
const mobileDir = path.join(rootDir, 'mobile');
const cliPath = path.join(mobileDir, 'node_modules', 'react-native', 'cli.js');

const command = process.argv[2]; // 'start' | 'android' | 'ios'
if (!command || !['start', 'android', 'ios'].includes(command)) {
  console.error('Usage: node scripts/run-mobile.cjs <start|android|ios>');
  process.exit(1);
}

const cliArg = command === 'start' ? 'start' : command === 'android' ? 'run-android' : 'run-ios';

const child = spawn(process.execPath, [cliPath, cliArg], {
  cwd: mobileDir,
  stdio: 'inherit',
  env: { ...process.env },
});

child.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
