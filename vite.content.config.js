import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// This config is ONLY for the Content Script (The logic injected into YouTube)
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    emptyOutDir: false, // DO NOT clean dist (or you delete the popup!)
    outDir: 'dist',
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.jsx'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        format: 'iife', // "Immediately Invoked Function Expression" = Self-contained
        name: 'ContentScript',
        
        // CRITICAL: Forces React/MUI to be bundled INSIDE content.js
        inlineDynamicImports: true, 
      },
    },
  },
})
