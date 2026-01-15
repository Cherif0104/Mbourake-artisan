import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Plugin Vite pour gérer le routing SPA en développement
// Redirige toutes les routes vers index.html (history API fallback)
const spaFallbackPlugin = (): Plugin => {
  return {
    name: 'spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        
        // Ignorer les assets statiques et les routes Vite internes (CRITIQUE)
        if (
          // Fichiers avec extensions
          url.match(/\.(js|mjs|cjs|ts|tsx|jsx|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|json|webp|mp4|webm|wasm)$/) ||
          // Routes Vite internes - NE PAS REDIRIGER CES ROUTES
          url.startsWith('/@vite/') ||
          url.startsWith('/@react-refresh') ||
          url.startsWith('/@id/') ||
          url.startsWith('/@fs/') ||
          url.startsWith('/node_modules/') ||
          url.startsWith('/src/') ||
          url.startsWith('/api/') ||
          // Autres routes spéciales
          url.startsWith('/_') ||
          url.startsWith('/__')
        ) {
          return next();
        }
        
        // Pour toutes les autres routes (routes de l'app React), servir index.html (routing SPA)
        // Cela permet à React Router de gérer la route
        req.url = '/index.html';
        next();
      });
    },
  };
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3002,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        spaFallbackPlugin(), // CRITIQUE : Fallback SPA pour routing en dev
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        },
        dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
      },
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom', 'react-router-dom'],
              'supabase-vendor': ['@supabase/supabase-js'],
            },
          },
        },
      },
      preview: {
        port: 3002,
        host: '0.0.0.0',
        // Configuration pour preview (serveur de build)
        // Le middleware SPA n'est pas nécessaire en preview car on sert les fichiers statiques
        // Mais on peut ajouter une config similaire si nécessaire
      },
    };
});
