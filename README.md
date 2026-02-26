# cwebp

`src/` ディレクトリの画像を WebP に一括変換して `dist/` へ出力する CLI ツールです。

## 必要環境

- Node.js 18+

## インストール

```bash
npm install
```

## 使い方

```bash
npm run convert
```

実行すると変換品質の入力を求めるプロンプトが表示されます。

```
変換品質を入力してください (0〜100、デフォルト: 80):
```

Enter のみで品質 `80` が使用されます。

## 動作

`src/` に配置した画像ファイルを検索し、ディレクトリ構造を保ったまま `dist/` へ WebP として出力します。

```
src/
├── hero.jpg
├── icons/
│   └── logo.png
└── photos/
    └── sample.jpeg

↓ npm run convert

dist/
├── hero.webp
├── icons/
│   └── logo.webp
└── photos/
    └── sample.webp
```

画像以外のファイル（`.html`、`.md` など）は無視されます。

## 対応フォーマット

| 拡張子 | フォーマット |
|--------|------------|
| `.jpg`, `.jpeg` | JPEG |
| `.png` | PNG |
| `.gif` | GIF |
| `.bmp` | BMP |
| `.tiff`, `.tif` | TIFF |

## 設定

`scripts/convert.js` 冒頭の定数で変更できます。

| 定数 | デフォルト | 説明 |
|------|-----------|------|
| `SRC_DIR` | `'src'` | 入力ディレクトリ |
| `DIST_DIR` | `'dist'` | 出力ディレクトリ |

## ドロップレット

`droplet.bat` に画像ファイルをドラッグ＆ドロップすると、`droplet.bat` と同じフォルダに品質 100 の WebP を出力します。

- 複数ファイルの一括ドロップ対応
- `npm install` 済みであれば追加設定不要
- 出力先は常に `droplet.bat` と同じフォルダ
