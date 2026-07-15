import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';
import { put } from '@vercel/blob';
import postgres from 'postgres';

const FOTOS_DIR = './Fotos das leituras';
const IMAGE_EXTS = new Set(['.jpeg', '.jpg', '.png', '.webp']);

function parseDateFolder(name) {
  const match = name.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

function parseApartamento(name) {
  const cleaned = name.replace(/\s*NINGUEM\s*/i, '').trim();
  const match = cleaned.match(/^(\d+)([A-Ha-h])$/);
  if (!match) return { apto: cleaned, torre: 'Desconhecido' };
  const num = match[1];
  const letra = match[2].toUpperCase();
  const torres = { A: 'Torre A', B: 'Torre B', C: 'Torre C', D: 'Torre D', E: 'Torre E', F: 'Torre F', G: 'Torre G', H: 'Torre H' };
  return { apto: num, torre: torres[letra] || `Torre ${letra}` };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (!databaseUrl) {
    console.error('ERROR: Set DATABASE_URL env var');
    console.error('  export DATABASE_URL="postgresql://..."');
    process.exit(1);
  }
  if (!blobToken) {
    console.error('ERROR: Set BLOB_READ_WRITE_TOKEN env var');
    console.error('  Get it from Vercel Dashboard > Storage > Blob > Settings');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { ssl: 'require' });

  console.log('Scanning photos in', FOTOS_DIR, '...');
  const dateFolders = await readdir(FOTOS_DIR, { withFileTypes: true });

  let total = 0;
  let uploaded = 0;
  let errors = 0;

  for (const dateDir of dateFolders.filter(d => d.isDirectory())) {
    const dateStr = parseDateFolder(dateDir.name);
    if (!dateStr) continue;

    const datePath = join(FOTOS_DIR, dateDir.name);
    const aptoFolders = await readdir(datePath, { withFileTypes: true });

    for (const aptoDir of aptoFolders.filter(d => d.isDirectory())) {
      const { apto, torre } = parseApartamento(aptoDir.name);
      const aptoPath = join(datePath, aptoDir.name);
      const files = (await readdir(aptoPath, { withFileTypes: true }))
        .filter(f => f.isFile() && IMAGE_EXTS.has(extname(f.name).toLowerCase()));

      for (let i = 0; i < files.length; i++) {
        total++;
        const filePath = join(aptoPath, files[i].name);

        try {
          const buffer = await readFile(filePath);
          const ext = extname(files[i].name).toLowerCase() === '.png' ? 'png' : 'jpg';
          const blobPath = `leituras/${dateStr}/${torre}/${apto}/${i}_${files[i].name}`;

          const blob = await put(blobPath, buffer, {
            access: 'public',
            token: blobToken,
          });

          await sql`INSERT INTO fotos (bloco, apartamento, data_leitura, foto_url, foto_index)
                     VALUES (${torre}, ${apto}, ${dateStr}, ${blob.url}, ${i})`;

          uploaded++;
          if (uploaded % 10 === 0 || uploaded === 1) {
            console.log(`  [${uploaded}/${total}] ${torre} ${apto} ${dateStr}`);
          }
        } catch (err) {
          console.error(`  ERROR: ${filePath} - ${err.message}`);
          errors++;
        }
      }
    }
  }

  console.log(`\nDone! Uploaded: ${uploaded} | Errors: ${errors} | Total: ${total}`);
  await sql.end();
}

main().catch(console.error);
