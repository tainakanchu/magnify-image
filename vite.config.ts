import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // kawaraban 等のサブパス配信でもアセットを解決できるよう相対パスで出力する
  base: './',
  plugins: [react()],
})
