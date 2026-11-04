import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cp, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const pdfAssets = ['cmaps', 'standard_fonts', 'wasm']
const pdfSource = new URL('./node_modules/pdfjs-dist/', import.meta.url)

export default defineConfig({
  // kawaraban 等のサブパス配信でもアセットを解決できるよう相対パスで出力する
  base: './',
  plugins: [
    react(),
    {
      name: 'pdf-assets',
      configureServer(server) {
        server.middlewares.use('/pdfjs', async (req, res, next) => {
          const match = req.url?.split('?')[0].match(/^\/([\w]+)\/([\w.-]+)$/)
          if (!match || !pdfAssets.includes(match[1])) return next()
          try {
            const data = await readFile(
              new URL(`${match[1]}/${match[2]}`, pdfSource)
            )
            res.setHeader(
              'Content-Type',
              match[1] === 'wasm'
                ? 'application/wasm'
                : 'application/octet-stream'
            )
            res.end(data)
          } catch {
            next()
          }
        })
      },
      async writeBundle({ dir }) {
        if (!dir) return
        await Promise.all(
          pdfAssets.map((name) =>
            cp(new URL(name, pdfSource), resolve(dir, 'pdfjs', name), {
              recursive: true,
            })
          )
        )
      },
    },
  ],
})
