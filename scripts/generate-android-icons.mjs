import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const root = process.cwd();
const sourceIcon = path.join(root, 'public', 'icon.svg');
const resDir = path.join(root, 'android', 'app', 'src', 'main', 'res');

const densities = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

function circleSvg(size) {
  return Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`
  );
}

for (const { folder, size } of densities) {
  const dir = path.join(resDir, folder);

  const base = sharp(sourceIcon).resize(size, size, { fit: 'contain' });

  await base.png().toFile(path.join(dir, 'ic_launcher.png'));
  await base.png().toFile(path.join(dir, 'ic_launcher_foreground.png'));

  const round = await sharp(sourceIcon)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .composite([{ input: circleSvg(size), blend: 'dest-in' }])
    .png()
    .toBuffer();

  await fs.writeFile(path.join(dir, 'ic_launcher_round.png'), round);
}

console.log('Android launcher icons generated from public/icon.svg');
