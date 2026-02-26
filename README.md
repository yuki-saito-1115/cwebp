# cwebp

画像を WebP に一括変換する CLI ツールです。

## 必要環境

- Node.js 24+
- pnpm

## インストール

```bash
pnpm i --frozen-lockfile
```

## 使い方

```bash
pnpm convert
```

実行するといくつかの設問が表示されます。

```
インプットディレクトリ（デフォルト: public）:
元ファイル: [1] 置換 [2] 追加 [3] （デフォルト: 3）:
変換品質: 0〜100（デフォルト: 100）:
```

すべて Enter のみでデフォルト値が使用されます（入力ディレクトリ: `public`、元ファイル操作: なし、品質: ロスレス）。

## 動作

指定ディレクトリの画像ファイルを検索し、ディレクトリ構造を保ったまま `dist/` へ WebP として出力します。

```
public/
├── hero.jpg
├── icons/
│   └── logo.png
└── photos/
    └── sample.jpeg

↓ pnpm convert

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
| `DEFAULT_SRC_DIR` | `'public'` | 入力ディレクトリ |
| `DIST_DIR` | `'dist'` | 出力ディレクトリ |

## ドロップレット

`droplet.bat` に画像ファイルをドラッグ＆ドロップすると、ロスレスの WebP に変換して `DIST_DIR` へ出力します。

- 複数ファイルの一括ドロップ対応
    - ただしディレクトリまるごとドラッグ＆ドロップはできない
- `pnpm i --frozen-lockfile` 済みであれば追加設定不要
- 出力先は常に `DIST_DIR`
