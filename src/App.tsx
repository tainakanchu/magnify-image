import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import './App.css'
import {
  buildMagnifiedPdf,
  destroyPdfDocument,
  loadPdfDocument,
  renderPdfPage,
} from './pdf'
import type { PDFDocumentProxy } from './pdf'

const PRESETS = [2, 4, 8, 16] as const
const MM_PER_INCH = 25.4

const PAPER_SIZES = [
  { label: 'A4', width: 210 },
  { label: 'A5', width: 148 },
  { label: 'A3', width: 297 },
  { label: 'B5', width: 182 },
  { label: 'はがき', width: 100 },
] as const

interface ImageSize {
  width: number
  height: number
}

function getDpiLevel(dpi: number): 'low' | 'ok' | 'good' {
  if (dpi < 200) return 'low'
  if (dpi < 300) return 'ok'
  return 'good'
}

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [magnifiedImage, setMagnifiedImage] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState<ImageSize | null>(null)
  const [magnification, setMagnification] = useState<number>(() => {
    const saved = localStorage.getItem('magnification')
    return saved ? parseInt(saved) : 4
  })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [printWidthMm, setPrintWidthMm] = useState<number>(() => {
    const saved = localStorage.getItem('printWidthMm')
    return saved ? parseFloat(saved) : 210
  })
  const [pdfPageCount, setPdfPageCount] = useState<number>(0)
  const [pdfPage, setPdfPage] = useState<number>(1)
  const [pdfExportProgress, setPdfExportProgress] = useState<{
    done: number
    total: number
  } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null)

  const magnifyImage = useCallback((imageUrl: string, scale: number) => {
    setIsProcessing(true)
    setMagnifiedImage(null)
    setError(null)

    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) {
        setIsProcessing(false)
        setError('Canvas の初期化に失敗しました')
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setIsProcessing(false)
        setError('Canvas のコンテキスト取得に失敗しました')
        return
      }

      try {
        setImageSize({ width: img.width, height: img.height })
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const magnifiedDataUrl = canvas.toDataURL('image/png')
        setMagnifiedImage(magnifiedDataUrl)
        setIsProcessing(false)
      } catch {
        setIsProcessing(false)
        setError('画像の処理に失敗しました')
      }
    }
    img.onerror = () => {
      setIsProcessing(false)
      setError(
        '画像の読み込みに失敗しました。ファイルが破損している可能性があります'
      )
    }
    img.src = imageUrl
  }, [])

  const clearPdf = useCallback(() => {
    if (pdfDocRef.current) {
      destroyPdfDocument(pdfDocRef.current)
      pdfDocRef.current = null
    }
    setPdfPageCount(0)
    setPdfPage(1)
  }, [])

  const magnifyPdfPage = useCallback(
    async (pageNumber: number, scale: number) => {
      const doc = pdfDocRef.current
      if (!doc) return
      setIsProcessing(true)
      setMagnifiedImage(null)
      setError(null)
      try {
        const rendered = await renderPdfPage(doc, pageNumber, scale)
        setMagnifiedImage(rendered.dataUrl)
      } catch {
        setError('PDF の描画に失敗しました')
      } finally {
        setIsProcessing(false)
      }
    },
    []
  )

  // Original は viewport scale 1（72dpi）で描き、そのサイズを拡大計算の基準にする
  const showPdfPage = useCallback(
    async (pageNumber: number, scale: number) => {
      const doc = pdfDocRef.current
      if (!doc) return
      setIsProcessing(true)
      try {
        const base = await renderPdfPage(doc, pageNumber, 1)
        setOriginalImage(base.dataUrl)
        setImageSize({ width: base.width, height: base.height })
      } catch {
        setIsProcessing(false)
        setError('PDF の描画に失敗しました')
        return
      }
      await magnifyPdfPage(pageNumber, scale)
    },
    [magnifyPdfPage]
  )

  const processPdf = useCallback(
    async (file: File) => {
      clearPdf()
      setOriginalImage(null)
      setMagnifiedImage(null)
      setImageSize(null)
      setIsProcessing(true)
      try {
        const doc = await loadPdfDocument(await file.arrayBuffer())
        pdfDocRef.current = doc
        setPdfPageCount(doc.numPages)
        await showPdfPage(1, magnification)
      } catch (err) {
        setIsProcessing(false)
        setError(
          err instanceof Error && err.name === 'PasswordException'
            ? 'パスワード付き PDF には対応していません'
            : 'PDF の読み込みに失敗しました'
        )
      }
    },
    [clearPdf, showPdfPage, magnification]
  )

  const processFile = useCallback(
    (file: File) => {
      setError(null)
      // type が空になる環境があるため、その場合は拡張子で PDF を判定する
      if (
        file.type === 'application/pdf' ||
        (!file.type && file.name.toLowerCase().endsWith('.pdf'))
      ) {
        void processPdf(file)
        return
      }
      if (!file.type.startsWith('image/')) {
        setError('画像または PDF ファイルを選択してください')
        return
      }
      clearPdf()
      const reader = new FileReader()
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string
        setOriginalImage(imageUrl)
        magnifyImage(imageUrl, magnification)
      }
      reader.onerror = () => {
        setError('ファイルの読み込みに失敗しました')
      }
      reader.readAsDataURL(file)
    },
    [magnification, magnifyImage, clearPdf, processPdf]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        processFile(files[0])
      }
    },
    [processFile]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        processFile(files[0])
      }
    },
    [processFile]
  )

  const handleDropZoneClick = useCallback(() => {
    if (!originalImage) {
      fileInputRef.current?.click()
    }
  }, [originalImage])

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const imageItem = Array.from(items).find((item) =>
        item.type.startsWith('image/')
      )
      if (!imageItem) return
      // テキスト等の通常ペーストを妨げないよう、画像が見つかったときのみ preventDefault する
      e.preventDefault()
      const file = imageItem.getAsFile()
      if (file) {
        processFile(file)
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [processFile])

  const handleMagnificationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value)
      if (isNaN(value) || value < 1) return
      setMagnification(value)
    },
    []
  )

  useEffect(() => {
    localStorage.setItem('magnification', magnification.toString())
  }, [magnification])

  useEffect(() => {
    localStorage.setItem('printWidthMm', printWidthMm.toString())
  }, [printWidthMm])

  const magnifiedSize = useMemo<ImageSize | null>(() => {
    if (!imageSize) return null
    return {
      width: imageSize.width * magnification,
      height: imageSize.height * magnification,
    }
  }, [imageSize, magnification])

  const dpiInfo = useMemo(() => {
    if (!magnifiedSize || !printWidthMm || printWidthMm <= 0) return null
    const aspect = magnifiedSize.height / magnifiedSize.width
    const printHeightMm = printWidthMm * aspect
    const dpiW = (magnifiedSize.width / printWidthMm) * MM_PER_INCH
    const dpiH = (magnifiedSize.height / printHeightMm) * MM_PER_INCH
    const dpi = Math.round(Math.min(dpiW, dpiH))
    return {
      dpi,
      printHeightMm: Math.round(printHeightMm * 10) / 10,
      level: getDpiLevel(dpi),
    }
  }, [magnifiedSize, printWidthMm])

  // 画像 / PDF のどちらでも、現在のソースを指定倍率で描き直す
  const remagnify = useCallback(
    (scale: number) => {
      if (pdfDocRef.current) {
        void magnifyPdfPage(pdfPage, scale)
      } else if (originalImage) {
        magnifyImage(originalImage, scale)
      }
    },
    [originalImage, magnifyImage, magnifyPdfPage, pdfPage]
  )

  const handleMagnificationBlur = useCallback(() => {
    remagnify(magnification)
  }, [remagnify, magnification])

  const handlePreset = useCallback(
    (value: number) => {
      setMagnification(value)
      remagnify(value)
    },
    [remagnify]
  )

  const handlePageChange = useCallback(
    (delta: number) => {
      const next = pdfPage + delta
      if (next < 1 || next > pdfPageCount) return
      setPdfPage(next)
      void showPdfPage(next, magnification)
    },
    [pdfPage, pdfPageCount, magnification, showPdfPage]
  )

  const download = useCallback(
    (href: string, extension: string) => {
      const link = document.createElement('a')
      link.href = href
      link.download = `magnified_${magnification}x.${extension}`
      link.click()
    },
    [magnification]
  )

  // PDF は表示中のページだけでなく全ページを拡大して 1 つの PDF に束ねる
  const downloadMagnified = useCallback(async () => {
    const doc = pdfDocRef.current
    if (!doc) {
      if (magnifiedImage) download(magnifiedImage, 'png')
      return
    }
    setPdfExportProgress({ done: 0, total: doc.numPages })
    setError(null)
    let url: string | null = null
    try {
      const bytes = await buildMagnifiedPdf(doc, magnification, (done, total) =>
        setPdfExportProgress({ done, total })
      )
      url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
      download(url, 'pdf')
    } catch {
      setError('PDF の生成に失敗しました')
    } finally {
      if (url) URL.revokeObjectURL(url)
      setPdfExportProgress(null)
    }
  }, [magnifiedImage, magnification, download])

  return (
    <div className="app">
      <header className="header">
        <h1>Magnify Image</h1>
        <p>ドラッグ&ドロップで画像をピクセルパーフェクトに拡大</p>
      </header>

      <div className="controls">
        <span className="controls-label">倍率</span>
        <input
          type="number"
          min="1"
          max="50"
          value={magnification}
          onChange={handleMagnificationChange}
          onBlur={handleMagnificationBlur}
          className="magnification-input"
        />
        <span className="magnification-suffix">x</span>
        <div className="preset-buttons">
          {PRESETS.map((p) => (
            <button
              key={p}
              className={`preset-btn ${magnification === p ? 'active' : ''}`}
              onClick={() => handlePreset(p)}
            >
              {p}x
            </button>
          ))}
        </div>
      </div>

      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${originalImage ? 'has-image' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleDropZoneClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {originalImage ? (
          <div className="image-display">
            <div className="image-card">
              <div className="image-card-header">
                <h3 className="image-card-title">
                  Original
                  {imageSize && (
                    <span className="image-dimensions">
                      {imageSize.width} x {imageSize.height} px
                    </span>
                  )}
                </h3>
                <div className="image-card-actions">
                  {pdfPageCount > 1 && (
                    <div className="page-selector">
                      <button
                        className="preset-btn"
                        disabled={pdfPage <= 1}
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePageChange(-1)
                        }}
                      >
                        ‹
                      </button>
                      <span className="page-indicator">
                        {pdfPage} / {pdfPageCount}
                      </span>
                      <button
                        className="preset-btn"
                        disabled={pdfPage >= pdfPageCount}
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePageChange(1)
                        }}
                      >
                        ›
                      </button>
                    </div>
                  )}
                  <button
                    className="btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOriginalImage(null)
                      setMagnifiedImage(null)
                      setImageSize(null)
                      clearPdf()
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                    削除
                  </button>
                </div>
              </div>
              <img src={originalImage} alt="Original" />
            </div>

            {isProcessing ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>処理中...</p>
              </div>
            ) : error ? (
              <div className="error-container">
                <p className="error-message">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="btn-secondary"
                >
                  再試行
                </button>
              </div>
            ) : (
              magnifiedImage && (
                <div className="image-card">
                  <div className="image-card-header">
                    <h3 className="image-card-title">
                      Magnified ({magnification}x)
                      {magnifiedSize && (
                        <span className="image-dimensions">
                          {magnifiedSize.width} x {magnifiedSize.height} px
                          {pdfPageCount > 0 && ` · 全 ${pdfPageCount} ページ`}
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={() => void downloadMagnified()}
                      disabled={pdfExportProgress !== null}
                      className="btn-primary"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      {pdfExportProgress
                        ? `PDF 生成中… ${pdfExportProgress.done} / ${pdfExportProgress.total}`
                        : 'ダウンロード'}
                    </button>
                  </div>
                  {/* PDF はベクター描画なので pixelated を当てない */}
                  <img
                    src={magnifiedImage}
                    alt="Magnified"
                    className={pdfPageCount > 0 ? undefined : 'pixelated'}
                  />
                </div>
              )
            )}
          </div>
        ) : (
          <div className="drop-message">
            <svg
              className="drop-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <p className="drop-message-text">
              画像または PDF をここにドラッグ&ドロップ
            </p>
            <p className="drop-message-hint">
              または <span>ファイルを選択</span> / 画像は Cmd/Ctrl+V でペースト
            </p>
          </div>
        )}
      </div>

      {magnifiedSize && (
        <div className="dpi-calculator">
          <h3 className="dpi-calculator-title">DPI 計算</h3>
          <p className="dpi-calculator-desc">
            拡大後の画像を指定サイズで印刷した場合の解像度
          </p>
          <div className="dpi-calculator-row">
            <span className="controls-label">用紙幅</span>
            <div className="preset-buttons">
              {PAPER_SIZES.map((paper) => (
                <button
                  key={paper.label}
                  className={`preset-btn ${printWidthMm === paper.width ? 'active' : ''}`}
                  onClick={() => setPrintWidthMm(paper.width)}
                >
                  {paper.label}
                </button>
              ))}
            </div>
          </div>
          <div className="dpi-calculator-row" style={{ marginTop: '0.5rem' }}>
            <span className="controls-label">印刷幅</span>
            <input
              type="number"
              min="1"
              max="2000"
              value={printWidthMm}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                if (!isNaN(v) && v > 0) setPrintWidthMm(v)
              }}
              className="magnification-input"
            />
            <span className="magnification-suffix">mm</span>
            {dpiInfo && (
              <>
                <span className="dpi-arrow">=</span>
                <span className="dpi-result-group">
                  <span className={`dpi-badge dpi-${dpiInfo.level}`}>
                    {dpiInfo.dpi} DPI
                  </span>
                  <span className="dpi-print-size">
                    ({printWidthMm} x {dpiInfo.printHeightMm} mm)
                  </span>
                </span>
              </>
            )}
          </div>
          {dpiInfo && (
            <p className={`dpi-hint dpi-hint-${dpiInfo.level}`}>
              {dpiInfo.level === 'good'
                ? '300 DPI 以上 — 高品質な印刷に適しています'
                : dpiInfo.level === 'ok'
                  ? '200〜299 DPI — 印刷可能ですが、300 DPI 以上を推奨します'
                  : '200 DPI 未満 — 印刷には解像度が不足しています。倍率を上げるか印刷サイズを小さくしてください'}
            </p>
          )}
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <footer className="footer">
        <a
          href="https://github.com/tainakanchu/magnify-image"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub
        </a>
      </footer>
    </div>
  )
}

export default App
