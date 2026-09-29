import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Nel browser l'app vive sotto /stentore-browser/; nell'app desktop (Tauri) i percorsi sono relativi.
const isDesktopBuild = process.env.STENTOR_DESKTOP === '1';

export default defineConfig({
  base: isDesktopBuild ? './' : '/stentore-browser/',
  plugins: [react()],
});
