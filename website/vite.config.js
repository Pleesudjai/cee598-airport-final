import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:5100', changeOrigin: true },
      // Proxy NOAA NCEI Climate Normals CSV downloads to bypass browser CORS.
      // Used by src/lib/frost.js for any-airport frost analysis.
      // Example: GET /noaa/data/normals-daily/1991-2020/access/USW00024110.csv
      //         → https://www.ncei.noaa.gov/data/normals-daily/1991-2020/access/USW00024110.csv
      '/noaa': {
        target: 'https://www.ncei.noaa.gov',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/noaa/, ''),
      },
    }
  }
})
