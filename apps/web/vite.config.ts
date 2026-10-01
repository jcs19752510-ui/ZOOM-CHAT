import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 개발 중에는 API와 소켓을 서버(3001)로 프록시해서 같은 Origin으로 쓴다.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/healthz': 'http://localhost:3001',
      '/socket.io': { target: 'http://localhost:3001', ws: true },
    },
  },
  build: { sourcemap: false, target: 'es2022' },
});
