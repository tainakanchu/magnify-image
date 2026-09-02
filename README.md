# Magnify Image

ドラッグ&ドロップした画像や PDF を、指定倍率で拡大するWebアプリです。
画像はピクセルパーフェクトに（ドット絵や小さなアイコンをぼかさず整数倍で）、PDF は全ページをベクター描画で拡大して保存できます。

処理はすべてブラウザ内（Canvas API / pdf.js）で完結し、ファイルがサーバーに送信されることはありません。

**Demo:** https://magnify-image.vercel.app/

## 機能

- **ファイルの読み込み**
  - ドラッグ&ドロップ
  - クリックしてファイル選択
  - クリップボードからペースト（Cmd/Ctrl + V、画像のみ）
  - 対応形式: 画像（PNG / JPEG など）と PDF
- **倍率の指定**
  - プリセット: 2x / 4x / 8x / 16x
  - 任意の整数倍率（1〜50）を数値入力
  - 既定は 4 倍
- **ピクセルパーフェクト拡大（画像）**
  - `imageSmoothingEnabled = false` によるニアレストネイバー補間
  - 元画像と拡大後の画像をサイズ（px）付きで並べて表示
- **ベクター拡大（PDF）**
  - ページを指定倍率のスケールで再描画するため、文字や線がぼやけずくっきり出力されます
  - Original は 72dpi 相当（viewport scale 1）のページサイズを基準にします
  - 複数ページの PDF はページを切り替えて拡大できます（既定は 1 ページ目）
  - パスワード付き PDF には対応していません
- **ダウンロード**
  - 画像: 拡大後の画像を PNG（`magnified_{倍率}x.png`）として保存
  - PDF: 全ページを倍率で拡大した PDF（`magnified_{倍率}x.pdf`）として保存（1px = 1pt でページ自体が大きくなります）
- **DPI 計算**
  - 拡大後の画像を指定の幅で印刷した場合の DPI を算出
  - 用紙プリセット: A4 / A5 / A3 / B5 / はがき
  - 印刷幅（mm）を任意入力可能
  - 300 DPI 以上 / 200〜299 DPI / 200 DPI 未満 の3段階で印刷適性を表示
- **設定の保存**
  - 倍率と印刷幅は localStorage に保存され、次回アクセス時に復元されます

## 技術スタック

- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/) 7
- [Vite](https://vitejs.dev/) 8
- [pdf.js](https://mozilla.github.io/pdf.js/)（`pdfjs-dist`） / [pdf-lib](https://pdf-lib.js.org/)
- [oxlint](https://oxc.rs/docs/guide/usage/linter.html) / Prettier

実行時の依存は React / React DOM と pdf.js / pdf-lib のみです。画像処理はブラウザ標準の Canvas API、PDF の描画は pdf.js、拡大 PDF の生成は pdf-lib で行います。pdf.js の worker もローカルにバンドルするため、外部への通信は発生しません。

## 開発

### 必要環境

- Node.js 20.19 以上（22.12 以上を推奨）
- pnpm（`pnpm-lock.yaml` を同梱）

### セットアップ

```bash
pnpm install
pnpm dev
```

開発サーバーが起動したら、表示された URL（既定は http://localhost:5173）をブラウザで開いてください。

### スクリプト

| コマンド          | 内容                                       |
| ----------------- | ------------------------------------------ |
| `pnpm dev`        | 開発サーバーを起動                         |
| `pnpm build`      | 型チェック後、`dist/` に本番ビルドを出力   |
| `pnpm preview`    | ビルド成果物をローカルでプレビュー         |
| `pnpm lint`       | oxlint を実行（警告 0 件を要求）           |
| `pnpm type-check` | `tsc -b --noEmit` による型チェックのみ実行 |
| `pnpm format`     | Prettier でコード整形                      |

## デプロイ

[Vercel](https://vercel.com/) に https://magnify-image.vercel.app/ としてデプロイしています。設定は `vercel.json` に記載しています。
静的サイトとしてビルドされるため、`dist/` を配信できる任意のホスティングでも動作します。

## ディレクトリ構成

```
.
├── index.html          # エントリ HTML
├── src/
│   ├── main.tsx        # React のマウント
│   ├── App.tsx         # アプリ本体（読み込み・拡大・DPI 計算・UI）
│   ├── pdf.ts          # PDF の読み込み・ページ描画・拡大 PDF の生成
│   ├── App.css         # アプリのスタイル
│   └── index.css       # グローバルスタイル
├── vite.config.ts
├── .oxlintrc.json
├── tsconfig.json      # プロジェクト参照のルート
├── tsconfig.app.json  # src/ 向け
├── tsconfig.node.json # vite.config.ts 向け
├── vercel.json
└── package.json
```

## License

[MIT](./LICENSE)
