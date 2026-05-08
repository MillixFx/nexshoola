/**
 * Generates PWA icons (solid indigo squares) using pure Node.js — no external deps.
 * Run once: node scripts/generate-icons.mjs
 */
import { createRequire } from "module"
import { mkdirSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import zlib from "zlib"

const __dirname = dirname(fileURLToPath(import.meta.url))

function crc32(buf) {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii")
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcInput = Buffer.concat([typeBuf, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(crcInput))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function makePNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // RGB
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  // Each row: filter byte (0) + RGB * width
  const row = Buffer.alloc(1 + size * 3)
  row[0] = 0
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r
    row[2 + x * 3] = g
    row[3 + x * 3] = b
  }
  const raw = Buffer.alloc(row.length * size)
  for (let y = 0; y < size; y++) row.copy(raw, y * row.length)

  const compressed = zlib.deflateSync(raw, { level: 9 })

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

// Indigo-600: #4f46e5
const [r, g, b] = [79, 70, 229]

const outDir = join(__dirname, "..", "public", "icons")
mkdirSync(outDir, { recursive: true })

writeFileSync(join(outDir, "icon-192.png"), makePNG(192, r, g, b))
writeFileSync(join(outDir, "icon-512.png"), makePNG(512, r, g, b))
writeFileSync(join(outDir, "apple-touch-icon.png"), makePNG(180, r, g, b))

console.log("✓ Icons written to public/icons/")
