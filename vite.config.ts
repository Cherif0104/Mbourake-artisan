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
        // Ignorer les assets statiques (js, css, images, fonts, etc.)
        if (
          req.url &&
          (
            req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|json|webp|mp4|webm)$/) ||
            req.url.startsWith('/src/') ||
            req.url.startsWith('/@vite/') ||
            req.url.startsWith('/node_modules/') ||
            req.url.startsWith('/api/')
          )
        ) {
          return next();
        }
        
        // Pour toutes les autres routes, servir index.html (routing SPA)
        // Cela permet à React Router de gérer la route
        if (req.url && !req.url.startsWith('/_')) {
          req.url = '/index.html';
        }
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
