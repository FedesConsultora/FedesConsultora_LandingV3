// Genera los recursos gráficos de SEO a partir de los originales:
//  - public/og-fedes.jpg        imagen para compartir (1200x630): foto + degradé oscuro + logo blanco
//  - public/apple-touch-icon.png (180x180) y public/logo-512.png: isotipo «D» blanco sobre #44718D
// Uso: node scripts/generate-brand-assets.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const logo = readFileSync('assets/logo/fedes-logo-blanco.svg');

// --- Imagen Open Graph ---
const W = 1200, H = 630;
const logoW = 520;
const logoBuf = await sharp(logo, { density: 300 }).resize({ width: logoW }).png().toBuffer();
const logoH = (await sharp(logoBuf).metadata()).height;
const overlay = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#1D1D1B" stop-opacity=".96"/><stop offset=".6" stop-color="#1D1D1B" stop-opacity=".78"/><stop offset="1" stop-color="#1D1D1B" stop-opacity=".45"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
);
await sharp('src/assets/fotos/hero-sala-directorio.jpg')
  .resize(W, H, { fit: 'cover', position: 'center' })
  .composite([
    { input: overlay },
    { input: logoBuf, left: 80, top: Math.round((H - logoH) / 2) },
  ])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile('public/og-fedes.jpg');

// --- Íconos: isotipo (la «D» con la flecha), forma original sin modificar ---
const iso = readFileSync('public/favicon.svg');
await sharp(iso, { density: 300 }).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(iso, { density: 300 }).resize(512, 512).png().toFile('public/logo-512.png');
console.log('assets generados');
