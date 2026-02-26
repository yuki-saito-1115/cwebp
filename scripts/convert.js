import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdirSync, readdirSync, copyFileSync, rmSync } from 'node:fs'
import { join, extname, relative, dirname, basename } from 'node:path'
import { createInterface } from 'node:readline'
import cwebp from 'cwebp-bin'

const execFileAsync = promisify(execFile)

const DEFAULT_SRC_DIR = 'public'
const DIST_DIR = 'dist'
const SUPPORTED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif'])

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function askSrcDir() {
  const answer = await ask(`インプットディレクトリを入力してください (デフォルト: ${DEFAULT_SRC_DIR}): `)
  return answer === '' ? DEFAULT_SRC_DIR : answer
}

async function askSourceMode() {
  const answer = await ask('元ファイルの扱いを選択してください ([1] webp に置換 / [2] 元画像を残して webp を追加 / [3] 変更しない、デフォルト: 3): ')
  if (answer === '' || answer === '3') return 'none'
  if (answer === '1') return 'replace'
  if (answer === '2') return 'add'
  console.error('エラー: 1、2、3 のいずれかを入力してください')
  process.exit(1)
}

async function askQuality() {
  const answer = await ask('変換品質を入力してください (0〜100、デフォルト: ロスレス): ')
  if (answer === '') return 'lossless'
  const value = Number(answer)
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    console.error('エラー: 0〜100 の整数を入力してください')
    process.exit(1)
  }
  return value === 100 ? 'lossless' : value
}

function findImages(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findImages(fullPath))
    } else if (SUPPORTED_EXTS.has(extname(entry.name).toLowerCase())) {
      files.push(fullPath)
    }
  }
  return files
}

async function convertImage(srcPath, srcDir, quality, sourceMode) {
  const relativePath = relative(srcDir, srcPath)
  const outputName = basename(relativePath, extname(relativePath)) + '.webp'
  const outputPath = join(DIST_DIR, dirname(relativePath), outputName)

  mkdirSync(dirname(outputPath), { recursive: true })

  const args = quality === 'lossless'
    ? ['-lossless', srcPath, '-o', outputPath]
    : ['-q', String(quality), srcPath, '-o', outputPath]
  await execFileAsync(cwebp, args)

  if (sourceMode !== 'none') {
    const srcWebpPath = join(dirname(srcPath), outputName)
    copyFileSync(outputPath, srcWebpPath)
    if (sourceMode === 'replace') rmSync(srcPath)
  }

  console.log(`  ${srcPath} → ${outputPath}`)
}

async function main() {
  const srcDir = await askSrcDir()

  if (!existsSync(srcDir)) {
    console.error(`エラー: ${srcDir} ディレクトリが見つかりません`)
    process.exit(1)
  }

  const images = findImages(srcDir)

  if (images.length === 0) {
    console.log(`${srcDir} ディレクトリに変換対象の画像が見つかりませんでした`)
    console.log(`対応形式: ${[...SUPPORTED_EXTS].join(', ')}`)
    return
  }

  const sourceMode = await askSourceMode()
  const quality = await askQuality()
  const qualityLabel = quality === 'lossless' ? 'ロスレス' : quality
  console.log(`\n${images.length} 件の画像を変換します... (品質: ${qualityLabel})\n`)

  const results = await Promise.allSettled(images.map(img => convertImage(img, srcDir, quality, sourceMode)))

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected')

  console.log(`\n完了: ${succeeded}/${images.length} 件`)

  if (failed.length > 0) {
    console.error(`\n失敗: ${failed.length} 件`)
    for (const result of failed) {
      console.error(' ', result.reason?.message ?? result.reason)
    }
    process.exit(1)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
