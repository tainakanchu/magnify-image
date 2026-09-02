# Magnify Image

ドラッグ&ドロップした画像を、指定倍率でピクセルパーフェクトに拡大するWebアプリです。
ドット絵や小さなアイコンを、ぼかさずに整数倍で引き伸ばして保存できます。

処理はすべてブラウザ内（Canvas API）で完結し、画像がサーバーに送信されることはありません。

**Demo:** https://magnify-image.vercel.app/

## 機能

- **画像の読み込み**
  - ドラッグ&ドロップ
  - クリックしてファイル選択
  - クリップボードからペースト（Cmd/Ctrl + V）
- **倍率の指定**
  - プリセット: 2x / 4x / 8x / 16x
  - 任意の整数倍率（1〜50）を数値入力
  - 既定は 4 倍
- **ピクセルパーフェクト拡大**
  - `imageSmoothingEnabled = false` によるニアレストネイバー補間
  - 元画像と拡大後の画像をサイズ（px）付きで並べて表示
- **ダウンロード**
  - 拡大後の画像を PNG（`magnified_{倍率}x.png`）として保存
- **DPI 計算**
  - 拡大後の画像を指定の幅で印刷した場合の DPI を算出
  - 用紙プリセット: A4 / A5 / A3 / B5 / はがき
  - 印刷幅（mm）を任意入力可能
  - 300 DPI 以上 / 200〜299 DPI / 200 DPI 未満 の3段階で印刷適性を表示
- **設定の保存**
  - 倍率と印刷幅は localStorage に保存され、次回アクセス時に復元されます

## 技術スタック

- [React](https://react.dev/) 18
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) 5
- ESLint / Prettier

外部ライブラリへの依存は React / React DOM のみで、画像処理はブラウザ標準の Canvas API を使用しています。

## 開発

### 必要環境

- Node.js 18 以上
- yarn（`yarn.lock` を同梱）

### セットアップ

```bash
yarn install
yarn dev
```

開発サーバーが起動したら、表示された URL（既定は http://localhost:5173）をブラウザで開いてください。

### スクリプト

| コマンド          | 内容                                     |
| ----------------- | ---------------------------------------- |
| `yarn dev`        | 開発サーバーを起動                       |
| `yarn build`      | 型チェック後、`dist/` に本番ビルドを出力 |
| `yarn preview`    | ビルド成果物をローカルでプレビュー       |
| `yarn lint`       | ESLint を実行（警告 0 件を要求）         |
| `yarn type-check` | `tsc --noEmit` による型チェックのみ実行  |
| `yarn format`     | Prettier でコード整形                    |

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
│   ├── App.css         # アプリのスタイル
│   └── index.css       # グローバルスタイル
├── vite.config.ts
├── vercel.json
└── package.json
```

## License

[MIT](./LICENSE)
