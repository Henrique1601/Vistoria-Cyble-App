const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Função CRC32 para chunks PNG
function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function createPng(size) {
  const width = size;
  const height = size;

  // Renderizar pixel a pixel o ícone
  // Fundo #0a0f14 (10, 15, 20)
  // Anel laranja #f2994a (242, 153, 74)
  const bgR = 10, bgG = 15, bgB = 20, bgA = 255;
  const fgR = 242, fgG = 153, fgB = 74, fgA = 255;

  const cx = width / 2;
  const cy = height / 2;
  const ringR = width * 0.28;
  const ringThick = width * 0.06;
  const dotR = width * 0.08;

  // Cada linha: 1 byte filter (0) + width * 4 bytes RGBA
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter 0: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let isRing = Math.abs(dist - ringR) <= (ringThick / 2);
      let isDot = dist <= dotR;

      if (isRing || isDot) {
        rawData[offset++] = fgR;
        rawData[offset++] = fgG;
        rawData[offset++] = fgB;
        rawData[offset++] = fgA;
      } else {
        rawData[offset++] = bgR;
        rawData[offset++] = bgG;
        rawData[offset++] = bgB;
        rawData[offset++] = bgA;
      }
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);

  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.join(__dirname, '..', 'public');
const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of sizes) {
  const outPath = path.join(publicDir, name);
  const pngBuf = createPng(size);
  fs.writeFileSync(outPath, pngBuf);
  console.log(`Generated ${name} (${size}x${size}, ${pngBuf.length} bytes)`);
}
