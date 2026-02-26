import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join, extname, relative, dirname, basename } from 'node:path'
import { createInterface } from 'node:readline'
import cwebp from 'cwebp-bin'

const execFileAsync = promisify(execFile)

const SRC_DIR = 'src'
const DIST_DIR = 'dist'
const SUPPORTED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif'])

function askQuality() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question('変換品質を入力してください (0〜100、デフォルト: 80): ', answer => {
      rl.close()
      const value = answer.trim() === '' ? 80 : Number(answer.trim())
      if (!Number.isInteger(value) || value < 0 || value > 100) {
        console.error('エラー: 0〜100 の整数を入力してください')
        process.exit(1)
      }
      resolve(value)
    })
  })
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

async function convertImage(srcPath, quality) {
  const relativePath = relative(SRC_DIR, srcPath)
  const outputName = basename(relativePath, extname(relativePath)) + '.webp'
  const outputPath = join(DIST_DIR, dirname(relativePath), outputName)

  mkdirSync(dirname(outputPath), { recursive: true })

  await execFileAsync(cwebp, ['-q', String(quality), srcPath, '-o', outputPath])
  console.log(`  ${srcPath} → ${outputPath}`)
}

async function main() {
  if (!existsSync(SRC_DIR)) {
    console.error(`エラー: src ディレクトリが見つかりません`)
    process.exit(1)
  }

  const images = findImages(SRC_DIR)

  if (images.length === 0) {
    console.log('src ディレクトリに変換対象の画像が見つかりませんでした')
    console.log(`対応形式: ${[...SUPPORTED_EXTS].join(', ')}`)
    return
  }

  const quality = await askQuality()
  console.log(`\n${images.length} 件の画像を変換します... (品質: ${quality})\n`)

  const results = await Promise.allSettled(images.map(img => convertImage(img, quality)))

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
