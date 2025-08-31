import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'   // or '@vitejs/plugin-react-swc' if that’s what you use

export default defineConfig({
  plugins: [react()],
})
