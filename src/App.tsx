import React, { useState, useCallback, useRef, useEffect } from 'react'
import './App.css'

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [magnifiedImage, setMagnifiedImage] = useState<string | null>(null)
  const [magnification, setMagnification] = useState<number>(() => {
    const saved = localStorage.getItem('magnification')
    return saved ? parseInt(saved) : 3
  })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
      setError(null)

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        const file = files[0]
        if (file.type.startsWith('image/')) {
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
        } else {
          setError('画像ファイルをドロップしてください')
        }
      }
    },
    [magnification]
  )

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
        canvas.width = img.width * scale
        canvas.height = img.height * scale

        ctx.imageSmoothingEnabled = false
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        const magnifiedDataUrl = canvas.toDataURL('image/png')
        setMagnifiedImage(magnifiedDataUrl)
        setIsProcessing(false)
      } catch (err) {
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

  const handleMagnificationBlur = useCallback(() => {
    if (originalImage) {
      magnifyImage(originalImage, magnification)
    }
  }, [originalImage, magnifyImage, magnification])

  const downloadImage = useCallback(() => {
    if (magnifiedImage) {
      const link = document.createElement('a')
      link.href = magnifiedImage
      link.download = `magnified_${magnification}x.png`
      link.click()
    }
  }, [magnifiedImage, magnification])

  return (
    <div className="app">
      <h1>画像拡大アプリ</h1>

      <div className="controls">
        <label>
          倍率:
          <input
            type="number"
            min="1"
            max="50"
            value={magnification}
            onChange={handleMagnificationChange}
            onBlur={handleMagnificationBlur}
          />
          <span>x</span>
        </label>
      </div>

      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {originalImage ? (
          <div className="image-display">
            <div className="original-image">
              <h3>元画像</h3>
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
                <button onClick={() => setError(null)} className="retry-button">
                  再試行
                </button>
              </div>
            ) : (
              magnifiedImage && (
                <div className="magnified-image">
                  <h3>拡大画像 ({magnification}x)</h3>
                  <img src={magnifiedImage} alt="Magnified" />
                  <button onClick={downloadImage} className="download-button">
                    ダウンロード
                  </button>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="drop-message">
            <p>画像をここにドラッグ&ドロップしてください</p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

export default App
