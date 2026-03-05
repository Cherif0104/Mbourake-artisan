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
        // Ignorer les paramètres de requête pour la détection d'assets
        const pathname = url.split('?')[0] || '';
        
        // Ignorer les assets statiques et les routes Vite internes (CRITIQUE)
        if (
          // Fichiers avec extensions (dont .apk pour téléchargement Android)
          pathname.match(/\.(js|mjs|cjs|ts|tsx|jsx|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|json|webp|mp4|webm|wasm|apk)$/) ||
          // Téléchargement APK : laisser Vite servir le fichier depuis public/download/
          url.startsWith('/download/') ||
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
    const supabaseUrl = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    return {
      base: '/',
      server: {
        port: 3002,
        host: '0.0.0.0',
        // En dev : proxy vers Supabase pour éviter CORS sur les Edge Functions (ex. delete-my-account)
        proxy: supabaseUrl
          ? {
              '/api/supabase-functions': {
                target: supabaseUrl,
                changeOrigin: true,
                secure: true,
                rewrite: (path) => path.replace(/^\/api\/supabase-functions/, '/functions'),
                configure: (proxy) => {
                  proxy.on('proxyReq', (proxyReq) => {
                    const key = env.VITE_SUPABASE_ANON_KEY;
                    if (key) proxyReq.setHeader('apikey', key);
                  });
                },
              },
            }
          : undefined,
      },
      plugins: [
        react(),
        spaFallbackPlugin(), // CRITIQUE : Fallback SPA pour routing en dev
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
          '@shared': path.resolve(__dirname, './shared'),
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
