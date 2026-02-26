import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdirSync, readdirSync, copyFileSync, rmSync, statSync } from 'node:fs'
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
  const answer = await ask(`インプットディレクトリ (デフォルト: ${DEFAULT_SRC_DIR}): `)
  return answer === '' ? DEFAULT_SRC_DIR : answer
}

async function askSourceMode() {
  const answer = await ask('元ファイル: [1] 置換 [2] 追加 [3]  (デフォルト: 3): ')
  if (answer === '' || answer === '3') return 'none'
  if (answer === '1') return 'replace'
  if (answer === '2') return 'add'
  console.error('エラー: 1、2、3 のいずれかを入力してください')
  process.exit(1)
}

async function askQuality() {
  const answer = await ask('変換品質: 0〜100（デフォルト: 100): ')
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

  const srcSize = statSync(srcPath).size

  const args = quality === 'lossless'
    ? ['-lossless', srcPath, '-o', outputPath]
    : ['-q', String(quality), srcPath, '-o', outputPath]
  await execFileAsync(cwebp, args)

  if (sourceMode !== 'none') {
    const srcWebpPath = join(dirname(srcPath), outputName)
    copyFileSync(outputPath, srcWebpPath)
    if (sourceMode === 'replace') rmSync(srcPath)
  }

  const outSize = statSync(outputPath).size
  return { srcPath, outputPath, srcSize, outSize }
}

async function main() {
  const argFiles = process.argv.slice(2)
  const isDroplet = argFiles.length > 0

  let images, srcDir

  if (isDroplet) {
    images = argFiles.filter(f => SUPPORTED_EXTS.has(extname(f).toLowerCase()))
    if (images.length === 0) {
      console.log('対応する画像ファイルがありません')
      console.log(`対応形式: ${[...SUPPORTED_EXTS].join(', ')}`)
      await ask('\n終了するには Enter キーを押してください...')
      return
    }
  } else {
    srcDir = await askSrcDir()
    if (!existsSync(srcDir)) {
      console.error(`エラー: ${srcDir} ディレクトリが見つかりません`)
      process.exit(1)
    }
    images = findImages(srcDir)
    if (images.length === 0) {
      console.log(`${srcDir} ディレクトリに変換対象の画像が見つかりませんでした`)
      console.log(`対応形式: ${[...SUPPORTED_EXTS].join(', ')}`)
      return
    }
  }

  const sourceMode = isDroplet ? 'none' : await askSourceMode()
  const quality = isDroplet ? 'lossless' : await askQuality()
  const qualityLabel = quality === 'lossless' ? 'ロスレス' : quality
  console.log(`\n${images.length} 件の画像を変換します（品質: ${qualityLabel}）\n`)

  const startTime = Date.now()
  const results = await Promise.allSettled(images.map(img => {
    const fileSrcDir = isDroplet ? dirname(img) : srcDir
    return convertImage(img, fileSrcDir, quality, sourceMode)
  }))
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)

  const succeeded = results.filter(r => r.status === 'fulfilled')
  const failed = results.filter(r => r.status === 'rejected')

  const rows = succeeded.map(r => {
    const { srcPath, outputPath, srcSize, outSize } = r.value
    return {
      srcPath,
      outputPath,
      srcSize: `${(srcSize / 1024).toFixed(1)} KB`,
      outSize: `${(outSize / 1024).toFixed(1)} KB`,
      ratio: (() => { const v = (outSize / srcSize - 1) * 100; return `${v > 0 ? '+ ' : v < 0 ? '- ' : ''}${Math.abs(v).toFixed(1)}%` })(),
      larger: outSize > srcSize,
    }
  })

  const headers = ['入力', '出力', '変換前', '変換後', '削減率']
  const cols = [
    rows.map(r => r.srcPath),
    rows.map(r => r.outputPath),
    rows.map(r => r.srcSize),
    rows.map(r => r.outSize),
    rows.map(r => r.ratio),
  ]
  const dispWidth = str => [...str].reduce((w, c) => w + (c.codePointAt(0) > 0x7F ? 2 : 1), 0)
  const widths = headers.map((h, i) => Math.max(dispWidth(h), ...cols[i].map(v => dispWidth(v))))

  const pad = (str, len) => str + ' '.repeat(len - dispWidth(str))
  const divider = '+' + widths.map(w => '-'.repeat(w + 2)).join('+') + '+'
  const header = '| ' + headers.map((h, i) => pad(h, widths[i])).join(' | ') + ' |'

  console.log(divider)
  console.log(header)
  console.log(divider)
  for (const row of rows) {
    const coloredOutSize = row.larger
      ? `\x1b[1;31m${pad(row.outSize, widths[3])}\x1b[0m`
      : pad(row.outSize, widths[3])
    const coloredRatio = row.larger
      ? `\x1b[1;31m${pad(row.ratio, widths[4])}\x1b[0m`
      : pad(row.ratio, widths[4])
    const line = '| ' + [row.srcPath, row.outputPath, row.srcSize].map((v, i) => pad(v, widths[i])).join(' | ') + ' | ' + coloredOutSize + ' | ' + coloredRatio + ' |'
    console.log(line)
  }
  console.log(divider)

  console.log(`\n完了: ${succeeded.length}/${images.length} 件 (${elapsed}秒)`)

  if (failed.length > 0) {
    console.error(`\n失敗: ${failed.length} 件`)
    for (const result of failed) {
      console.error(' ', result.reason?.message ?? result.reason)
    }
  }

  await ask('\n終了するには Enter キーを押してください...')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
