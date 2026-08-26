#!/usr/bin/env node
/**
 * Upload fotos de vistoria do desktop para Vercel Blob + Neon.
 * 
 * Usage:
 *   node scripts/upload-fotos.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { put } from '@vercel/blob';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Config ---
const PHOTOS_BASE = String.raw`C:\Users\conta\Desktop\Desktop Henrique-Leituras e vistorias\Fotos das vistorias`;
const DONE_APTOS = [
  '252E','241E','236F','225F','163D','156A','151E','136A','106A','104D',
  '78A','48A','43D','33C','35H','43B','64C','72C','76D','87B',
  '112A','126A','132F','155G','156C','162C','193A','243E','256G','34C',
  '56G','87A','105A','125A','125H','127A','153F','165E','184E','198A',
  '241G','244D','245G',
];
const DATE_FOLDERS = ['25.06.2026', '07.08.2026', '20.08.2026', '24.08.2026'];

// Category mapping: with N files → [antes, depois x(N-2), documento]
function assignCategories(fileCount) {
  const cats = ['cyble_antes'];
  for (let i = 1; i < fileCount - 1; i++) cats.push('cyble_depois');
  cats.push('documento');
  return cats;
}

// Parse folder name → { bloco, apartamento }
function parseAptoFolder(folderName) {
  const match = folderName.match(/^(\d+)([A-Ha-h])$/);
  if (!match) return null;
  const num = match[1];
  const letter = match[2].toUpperCase();
  return { bloco: `Torre ${letter}`, apartamento: num };
}

// Get timestamp from filename
function getTimestamp(filename) {
  // "20260824_133435.jpg"
  const camMatch = filename.match(/^(\d{8}_\d{6})\.\w+$/);
  if (camMatch) {
    const [date, time] = camMatch[1].split('_');
    const y = date.slice(0, 4), m = date.slice(4, 6), d = date.slice(6, 8);
    const h = time.slice(0, 2), mi = time.slice(2, 4), s = time.slice(4, 6);
    return new Date(`${y}-${m}-${d}T${h}:${mi}:${s}`).getTime();
  }
  // "WhatsApp Image 2026-08-10 at 8.42.50 AM.jpeg"
  const waMatch = filename.match(/(\d{4})-(\d{2})-(\d{2})\s+at\s+(\d{1,2})\.(\d{2})\.(\d{2})\s*(AM|PM)/i);
  if (waMatch) {
    let [, y, m, d, h, mi, s, period] = waMatch;
    h = parseInt(h);
    if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (period.toUpperCase() === 'AM' && h === 12) h = 0;
    return new Date(`${y}-${m}-${d}T${String(h).padStart(2,'0')}:${mi}:${s}`).getTime();
  }
  // "56G ANTES.jpeg" or "DOC .jpeg" — use file mtime
  return Date.now();
}

function getExt(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return '.png';
  if (ext === '.webp') return '.webp';
  if (ext === '.heic' || ext === '.heif') return '.heic';
  return '.jpg';
}

function getMime(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.heic' || ext === '.heif') return 'image/heic';
  return 'image/jpeg';
}

async function main() {
  // Load env vars from .env.local if not set
  if (!process.env.BLOB_READ_WRITE_TOKEN || !process.env.DATABASE_URL) {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN not set');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  // Normalize DATABASE_URL — some setups add "postgres:" prefix
  let dbUrl = process.env.DATABASE_URL;
  if (dbUrl.startsWith('postgres:')) dbUrl = dbUrl.slice(dbUrl.indexOf('://') - 1);
  // Remove channel_binding param (not supported everywhere)
  dbUrl = dbUrl.replace(/[&?]channel_binding=require/, '');
  
  const sql = postgres(dbUrl, { ssl: 'require', max: 5 });

  // Collect all files
  const uploads = [];
  for (const dateFolder of DATE_FOLDERS) {
    const datePath = path.join(PHOTOS_BASE, dateFolder);
    if (!fs.existsSync(datePath)) continue;

    const dirs = fs.readdirSync(datePath, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const dir of dirs) {
      const aptoInfo = parseAptoFolder(dir.name);
      if (!aptoInfo) continue;

      const match = DONE_APTOS.find(a => a.toLowerCase() === dir.name.toLowerCase());
      if (!match) continue;

      const folderPath = path.join(datePath, dir.name);
      const files = fs.readdirSync(folderPath)
        .filter(f => /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(f))
        .sort();

      const categories = assignCategories(files.length);

      for (let i = 0; i < files.length; i++) {
        const cat = categories[i] || 'documento';
        uploads.push({
          filePath: path.join(folderPath, files[i]),
          filename: files[i],
          bloco: aptoInfo.bloco,
          apartamento: aptoInfo.apartamento,
          categoria: cat,
          timestamp: getTimestamp(files[i]),
          ext: getExt(files[i]),
          mime: getMime(files[i]),
        });
      }
    }
  }

  console.log(`\nFound ${uploads.length} photos across ${DONE_APTOS.length} apartments\n`);

  let uploaded = 0;
  let errors = 0;

  for (const u of uploads) {
    const blobPath = `vistorias/bloco-${u.bloco}/apto-${u.apartamento}/${u.categoria}-${u.timestamp}${u.ext}`;

    try {
      const fileBuffer = fs.readFileSync(u.filePath);
      const blob = new Blob([fileBuffer], { type: u.mime });

      const result = await put(blobPath, blob, {
        access: 'public',
        addRandomSuffix: false,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      // Insert metadata into Neon
      const dataLeitura = new Date(u.timestamp).toISOString().split('T')[0];
      await sql.unsafe(
        `INSERT INTO fotos (bloco, apartamento, data_leitura, foto_url, foto_index)
         VALUES ($1, $2, $3::date, $4, 0)
         ON CONFLICT DO NOTHING`,
        [u.bloco, u.apartamento, dataLeitura, result.url]
      );

      uploaded++;
      console.log(`  [${uploaded}/${uploads.length}] ${u.bloco}/${u.apartamento} ${u.categoria} <- ${u.filename}`);
    } catch (err) {
      errors++;
      console.error(`  ERR ${u.bloco}/${u.apartamento} ${u.categoria}: ${err.message || err}`);
      if (errors <= 3) console.error('    Stack:', err.stack);
    }
  }

  // Mark all as concluidos in fotos table
  console.log('\nMarking apartments as concluidos...');
  for (const apto of DONE_APTOS) {
    const info = parseAptoFolder(apto);
    if (!info) continue;
    try {
      await sql.unsafe(
        `INSERT INTO fotos (bloco, apartamento, data_leitura, foto_url, foto_index)
         VALUES ($1, $2, CURRENT_DATE, 'concluido', 0)
         ON CONFLICT DO NOTHING`,
        [info.bloco, info.apartamento]
      );
    } catch (err) {
      console.error(`  ERR marking ${info.bloco}/${info.apartamento}: ${err.message}`);
    }
  }

  // Also insert into concluidos table
  console.log('Inserting into concluidos table...');
  const blocoGroups = {};
  for (const apto of DONE_APTOS) {
    const info = parseAptoFolder(apto);
    if (!info) continue;
    if (!blocoGroups[info.bloco]) blocoGroups[info.bloco] = [];
    blocoGroups[info.bloco].push(info.apartamento);
  }
  for (const [bloco, aptos] of Object.entries(blocoGroups)) {
    try {
      await sql.unsafe(
        `INSERT INTO concluidos (bloco, apartamentos) VALUES ($1, $2::text[])
         ON CONFLICT (bloco) DO UPDATE SET apartamentos = (
           SELECT ARRAY(SELECT DISTINCT unnest(concluidos.apartamentos || EXCLUDED.apartamentos))
         )`,
        [bloco, aptos]
      );
    } catch (err) {
      console.error(`  ERR concluidos ${bloco}: ${err.message}`);
    }
  }

  console.log(`\nDone! Uploaded: ${uploaded}, Errors: ${errors}`);
  await sql.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
