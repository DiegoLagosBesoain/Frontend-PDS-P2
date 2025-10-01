import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    host: true, // permite 0.0.0.0
    port: Number(process.env.PORT) || 4173,
    allowedHosts: ['frontend-pds-p2.onrender.com'] // tu dominio de Render
  }
})