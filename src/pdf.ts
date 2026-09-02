import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'

// worker は CDN ではなくバンドル済みのローカルファイルを使う（ブラウザ内で完結させるため）
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export type { PDFDocumentProxy }

export interface PdfPageRender {
  dataUrl: string
  width: number
  height: number
}

export function loadPdfDocument(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  return pdfjsLib.getDocument({ data }).promise
}

// pdf.js 6 では PDFDocumentProxy.destroy() が無く、破棄は loadingTask 側に移っている
export function destroyPdfDocument(doc: PDFDocumentProxy): void {
  void doc.loadingTask.destroy()
}

/**
 * ページを倍率 scale でベクター描画し、PNG data URL として返す。
 * 出力サイズは viewport scale 1（72dpi）の整数サイズ x scale に揃える。
 */
export async function renderPdfPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  scale: number
): Promise<PdfPageRender> {
  const page = await doc.getPage(pageNumber)
  const base = page.getViewport({ scale: 1 })
  const width = Math.round(base.width) * scale
  const height = Math.round(base.height) * scale

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  await page.render({
    canvas,
    viewport: page.getViewport({ scale: width / base.width }),
  }).promise

  return { dataUrl: canvas.toDataURL('image/png'), width, height }
}

/**
 * 全ページを倍率 scale で描き直した PDF を生成する。
 * 1px = 1pt でページを作るので、拡大後のページはそのまま大きい紙面になる。
 */
export async function buildMagnifiedPdf(
  doc: PDFDocumentProxy,
  scale: number,
  onProgress?: (done: number, total: number) => void
): Promise<Uint8Array<ArrayBuffer>> {
  const total = doc.numPages
  const out = await PDFDocument.create()
  // メモリを抑えるためページは逐次描画する
  for (let n = 1; n <= total; n++) {
    const { dataUrl, width, height } = await renderPdfPage(doc, n, scale)
    const image = await out.embedPng(dataUrl)
    out.addPage([width, height]).drawImage(image, {
      x: 0,
      y: 0,
      width,
      height,
    })
    onProgress?.(n, total)
  }
  // pdf-lib の戻り値は Uint8Array<ArrayBufferLike> で Blob に渡せないため絞る
  return (await out.save()) as Uint8Array<ArrayBuffer>
}
