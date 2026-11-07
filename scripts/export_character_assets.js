import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Target directory requested by the user
const OUTPUT_DIR = 'D:/career/asset';

// ---------------------------------------------------------------------------
// 1. PURE-JS PNG ENCODER (Menggunakan zlib bawaan Node.js)
// ---------------------------------------------------------------------------
function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    let c = 0xffffffff;
    const combined = Buffer.concat([typeBuf, data]);
    for (let i = 0; i < combined.length; i++) {
      c ^= combined[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
      }
    }
    c ^= 0xffffffff;
    crcBuf.writeInt32BE(c, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const scanlines = Buffer.alloc(height * (1 + width * 4));
  let srcOffset = 0;
  let dstOffset = 0;
  for (let y = 0; y < height; y++) {
    scanlines[dstOffset++] = 0; // Filter 0 (None)
    for (let x = 0; x < width * 4; x++) {
      scanlines[dstOffset++] = rgbaBuffer[srcOffset++];
    }
  }

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', zlib.deflateSync(scanlines)),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// ---------------------------------------------------------------------------
// 2. PARSER WARNA & SIMULATOR PIXEL BUFFER
// ---------------------------------------------------------------------------
function parseColor(str) {
  if (!str) return [0, 0, 0, 255];
  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const num = parseInt(hex, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 255];
  } else if (str.startsWith('rgba')) {
    const m = str.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/);
    if (m) {
      return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), Math.round(parseFloat(m[4]) * 255)];
    }
  } else if (str.startsWith('rgb')) {
    const m = str.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (m) {
      return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), 255];
    }
  }
  return [0, 0, 0, 255];
}

class PixelCanvas {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.buffer = Buffer.alloc(w * h * 4, 0); // transparan default
  }

  fillRect(rx, ry, rw, rh, colorStr) {
    const [cr, cg, cb, ca] = parseColor(colorStr);
    const x0 = Math.max(0, Math.floor(rx));
    const y0 = Math.max(0, Math.floor(ry));
    const x1 = Math.min(this.width, Math.floor(rx + rw));
    const y1 = Math.min(this.height, Math.floor(ry + rh));
    const aNorm = ca / 255;

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = (y * this.width + x) * 4;
        if (ca === 255) {
          this.buffer[idx] = cr;
          this.buffer[idx + 1] = cg;
          this.buffer[idx + 2] = cb;
          this.buffer[idx + 3] = 255;
        } else {
          const dstA = this.buffer[idx + 3] / 255;
          const outA = aNorm + dstA * (1 - aNorm);
          if (outA > 0) {
            this.buffer[idx] = Math.round((cr * aNorm + this.buffer[idx] * dstA * (1 - aNorm)) / outA);
            this.buffer[idx + 1] = Math.round((cg * aNorm + this.buffer[idx + 1] * dstA * (1 - aNorm)) / outA);
            this.buffer[idx + 2] = Math.round((cb * aNorm + this.buffer[idx + 2] * dstA * (1 - aNorm)) / outA);
            this.buffer[idx + 3] = Math.round(outA * 255);
          }
        }
      }
    }
  }

  blit(srcCanvas, destX, destY) {
    for (let sy = 0; sy < srcCanvas.height; sy++) {
      const dy = destY + sy;
      if (dy < 0 || dy >= this.height) continue;
      for (let sx = 0; sx < srcCanvas.width; sx++) {
        const dx = destX + sx;
        if (dx < 0 || dx >= this.width) continue;
        const sIdx = (sy * srcCanvas.width + sx) * 4;
        const dIdx = (dy * this.width + dx) * 4;
        const sa = srcCanvas.buffer[sIdx + 3];
        if (sa === 0) continue;
        if (sa === 255) {
          this.buffer[dIdx] = srcCanvas.buffer[sIdx];
          this.buffer[dIdx + 1] = srcCanvas.buffer[sIdx + 1];
          this.buffer[dIdx + 2] = srcCanvas.buffer[sIdx + 2];
          this.buffer[dIdx + 3] = 255;
        } else {
          const aNorm = sa / 255;
          const dstA = this.buffer[dIdx + 3] / 255;
          const outA = aNorm + dstA * (1 - aNorm);
          this.buffer[dIdx] = Math.round((srcCanvas.buffer[sIdx] * aNorm + this.buffer[dIdx] * dstA * (1 - aNorm)) / outA);
          this.buffer[dIdx + 1] = Math.round((srcCanvas.buffer[sIdx + 1] * aNorm + this.buffer[dIdx + 1] * dstA * (1 - aNorm)) / outA);
          this.buffer[dIdx + 2] = Math.round((srcCanvas.buffer[sIdx + 2] * aNorm + this.buffer[dIdx + 2] * dstA * (1 - aNorm)) / outA);
          this.buffer[dIdx + 3] = Math.round(outA * 255);
        }
      }
    }
  }

  scaleNearest(factor) {
    const dstW = this.width * factor;
    const dstH = this.height * factor;
    const out = new PixelCanvas(dstW, dstH);
    for (let dy = 0; dy < dstH; dy++) {
      const sy = Math.floor(dy / factor);
      for (let dx = 0; dx < dstW; dx++) {
        const sx = Math.floor(dx / factor);
        const srcIdx = (sy * this.width + sx) * 4;
        const dstIdx = (dy * dstW + dx) * 4;
        out.buffer[dstIdx] = this.buffer[srcIdx];
        out.buffer[dstIdx + 1] = this.buffer[srcIdx + 1];
        out.buffer[dstIdx + 2] = this.buffer[srcIdx + 2];
        out.buffer[dstIdx + 3] = this.buffer[srcIdx + 3];
      }
    }
    return out;
  }

  toPNG() {
    return encodePNG(this.width, this.height, this.buffer);
  }
}

// ---------------------------------------------------------------------------
// 3. LOGIKA MENGGAMBAR SPRITE KARAKTER MANUSIA (16 x 24 px)
// ---------------------------------------------------------------------------
function renderCharacterFrame(appearance, dir, step) {
  const canvas = new PixelCanvas(16, 24);
  const px = (x, y, w, h, col) => canvas.fillRect(x, y, w, h, col);

  const skin = appearance.skin || '#f1c27d';
  const shirt = appearance.shirt || '#457b9d';
  const pants = appearance.pants || '#1d3557';
  const hat = appearance.hat || 'straw';
  const hatColor = appearance.hatColor || '#e9c46a';

  const bob = step === 0 ? 0 : 1;
  px(4, 22, 8, 2, 'rgba(0,0,0,0.32)'); // Bayangan kaki di tanah

  const legL = step === 1 ? -1 : step === 2 ? 1 : 0;
  const legR = step === 1 ? 1 : step === 2 ? -1 : 0;
  if (dir === 'left' || dir === 'right') {
    px(6 + legL, 17, 4, 4, pants);
    px(6 + legL, 21, 4, 2, '#3d2616');
    px(6 + legR, 17, 3, 4, pants);
    px(6 + legR, 21, 3, 2, '#2b1a0e');
  } else {
    px(5, 17 + Math.max(0, legL), 3, 4 - Math.max(0, legL), pants);
    px(5, 21 + Math.min(0, legL), 3, 2, '#3d2616');
    px(8, 17 + Math.max(0, legR), 3, 4 - Math.max(0, legR), pants);
    px(8, 21 + Math.min(0, legR), 3, 2, '#3d2616');
  }

  px(3, 11 + bob, 10, 7, '#221812'); // Garis tepi baju
  px(4, 12 + bob, 8, 5, shirt);
  px(5, 14 + bob, 1, 3, pants);
  px(10, 14 + bob, 1, 3, pants);
  px(5, 16 + bob, 6, 1, pants);

  const armOffset = step === 1 ? 1 : step === 2 ? -1 : 0;
  if (dir === 'down' || dir === 'up') {
    px(2, 12 + bob + armOffset, 2, 4, shirt);
    px(2, 15 + bob + armOffset, 2, 2, skin);
    px(12, 12 + bob - armOffset, 2, 4, shirt);
    px(12, 15 + bob - armOffset, 2, 2, skin);
  } else {
    const sideX = dir === 'right' ? 7 : 6;
    px(sideX + armOffset, 13 + bob, 3, 4, shirt);
    px(sideX + armOffset, 16 + bob, 3, 2, skin);
  }

  px(3, 3 + bob, 10, 9, '#221812'); // Garis tepi kepala
  px(4, 4 + bob, 8, 7, skin);

  const hairBase = hat === 'hair' ? hatColor : '#4a3222';
  if (dir === 'up') {
    px(4, 4 + bob, 8, 6, hairBase);
  } else if (dir === 'down') {
    px(4, 4 + bob, 8, 2, hairBase);
    px(5, 7 + bob, 2, 2, '#1b1b1b');
    px(9, 7 + bob, 2, 2, '#1b1b1b');
    px(5, 7 + bob, 1, 1, '#ffffff');
    px(9, 7 + bob, 1, 1, '#ffffff');
    px(4, 9 + bob, 1, 1, '#e5989b');
    px(11, 9 + bob, 1, 1, '#e5989b');
  } else if (dir === 'left') {
    px(7, 4 + bob, 5, 5, hairBase);
    px(5, 7 + bob, 2, 2, '#1b1b1b');
  } else if (dir === 'right') {
    px(4, 4 + bob, 5, 5, hairBase);
    px(9, 7 + bob, 2, 2, '#1b1b1b');
  }

  if (hat === 'straw') {
    px(1, 3 + bob, 14, 2, '#8c5e2a');
    px(2, 3 + bob, 12, 1, hatColor);
    px(4, 1 + bob, 8, 2, hatColor);
    px(4, 2 + bob, 8, 1, '#d94e4e');
  } else if (hat === 'cap') {
    px(3, 2 + bob, 10, 3, hatColor);
    if (dir === 'down') px(3, 4 + bob, 10, 1, '#221812');
    if (dir === 'right') px(10, 4 + bob, 5, 1, hatColor);
    if (dir === 'left') px(1, 4 + bob, 5, 1, hatColor);
  } else if (hat === 'hair') {
    px(3, 2 + bob, 10, 3, hatColor);
    px(6, 0 + bob, 3, 2, hatColor);
  }

  return canvas;
}

// ---------------------------------------------------------------------------
// 4. LOGIKA MENGGAMBAR SPRITE HEWAN (AYAM & DOMBA) (24 x 24 px)
// ---------------------------------------------------------------------------
function renderAnimalFrame(animalKind, dir, step) {
  const canvas = new PixelCanvas(24, 24);
  const px = (x, y, w, h, col) => canvas.fillRect(x, y, w, h, col);

  const bob = step === 1 ? -1 : 0;
  const legBob = step === 1 ? 1 : 0;

  if (animalKind === 'chicken') {
    // Kaki oranye
    px(9 - legBob, 18, 2, 3, '#f77f00');
    px(13 + legBob, 18, 2, 3, '#f77f00');

    // Badan ayam bulat putih
    px(6, 9 + bob, 12, 9, '#f8f9fa');
    px(7, 8 + bob, 10, 11, '#ffffff');

    // Sayap & kepala sesuai arah
    if (dir === 'left') {
      px(10, 11 + bob, 6, 5, '#e9ecef');
      px(4, 6 + bob, 6, 6, '#ffffff');
      px(2, 8 + bob, 3, 2, '#f77f00');
      px(5, 7 + bob, 1, 1, '#1b1b1b');
      px(6, 4 + bob, 3, 2, '#d90429');
      px(4, 10 + bob, 2, 2, '#d90429');
    } else if (dir === 'right') {
      px(8, 11 + bob, 6, 5, '#e9ecef');
      px(14, 6 + bob, 6, 6, '#ffffff');
      px(19, 8 + bob, 3, 2, '#f77f00');
      px(17, 7 + bob, 1, 1, '#1b1b1b');
      px(15, 4 + bob, 3, 2, '#d90429');
      px(17, 10 + bob, 2, 2, '#d90429');
    } else if (dir === 'down') {
      px(5, 11 + bob, 3, 5, '#e9ecef');
      px(16, 11 + bob, 3, 5, '#e9ecef');
      px(8, 6 + bob, 8, 6, '#ffffff');
      px(11, 9 + bob, 2, 2, '#f77f00');
      px(9, 8 + bob, 1, 1, '#1b1b1b');
      px(14, 8 + bob, 1, 1, '#1b1b1b');
      px(11, 4 + bob, 2, 2, '#d90429');
      px(11, 11 + bob, 2, 2, '#d90429');
    } else {
      px(5, 11 + bob, 3, 5, '#e9ecef');
      px(16, 11 + bob, 3, 5, '#e9ecef');
      px(8, 6 + bob, 8, 6, '#ffffff');
      px(11, 4 + bob, 2, 2, '#d90429');
      px(10, 13 + bob, 4, 3, '#dee2e6');
    }
  } else if (animalKind === 'cow') {
    // SAPI PERAH PIXEL ART (Badan Putih Bercak Hitam, Moncong Pink, Tanduk Beige)
    px(5 - legBob, 17, 3, 5, '#2b2d42');
    px(9 - legBob, 17, 3, 5, '#2b2d42');
    px(13 + legBob, 17, 3, 5, '#2b2d42');
    px(17 + legBob, 17, 3, 5, '#2b2d42');

    px(4, 7 + bob, 16, 11, '#ffffff');
    px(5, 6 + bob, 14, 13, '#f8f9fa');

    if (dir === 'left') {
      px(11, 8 + bob, 5, 5, '#212529');
      px(14, 12 + bob, 4, 4, '#212529');
      px(11, 16 + bob, 4, 2, '#ffb4a2');
      px(19, 9 + bob, 2, 6, '#f8f9fa');
      px(19, 14 + bob, 3, 3, '#212529');
      px(3, 6 + bob, 7, 8, '#ffffff');
      px(6, 6 + bob, 4, 4, '#212529');
      px(1, 9 + bob, 4, 5, '#ffb4a2');
      px(2, 11 + bob, 1, 1, '#1b1b1b');
      px(5, 8 + bob, 1, 2, '#1b1b1b');
      px(7, 4 + bob, 2, 3, '#ddb892');
      px(9, 6 + bob, 2, 2, '#ffb4a2');
    } else if (dir === 'right') {
      px(8, 8 + bob, 5, 5, '#212529');
      px(6, 12 + bob, 4, 4, '#212529');
      px(9, 16 + bob, 4, 2, '#ffb4a2');
      px(3, 9 + bob, 2, 6, '#f8f9fa');
      px(2, 14 + bob, 3, 3, '#212529');
      px(14, 6 + bob, 7, 8, '#ffffff');
      px(14, 6 + bob, 4, 4, '#212529');
      px(19, 9 + bob, 4, 5, '#ffb4a2');
      px(21, 11 + bob, 1, 1, '#1b1b1b');
      px(18, 8 + bob, 1, 2, '#1b1b1b');
      px(15, 4 + bob, 2, 3, '#ddb892');
      px(13, 6 + bob, 2, 2, '#ffb4a2');
    } else if (dir === 'down') {
      px(4, 9 + bob, 4, 6, '#212529');
      px(16, 10 + bob, 4, 5, '#212529');
      px(7, 5 + bob, 10, 8, '#ffffff');
      px(7, 5 + bob, 4, 5, '#212529');
      px(6, 3 + bob, 2, 3, '#ddb892');
      px(16, 3 + bob, 2, 3, '#ddb892');
      px(5, 6 + bob, 2, 2, '#ffb4a2');
      px(17, 6 + bob, 2, 2, '#ffb4a2');
      px(8, 7 + bob, 1, 2, '#ffffff');
      px(9, 7 + bob, 1, 2, '#1b1b1b');
      px(14, 7 + bob, 1, 2, '#1b1b1b');
      px(8, 10 + bob, 8, 4, '#ffb4a2');
      px(9, 12 + bob, 2, 1, '#1b1b1b');
      px(13, 12 + bob, 2, 1, '#1b1b1b');
    } else {
      px(5, 8 + bob, 6, 6, '#212529');
      px(14, 11 + bob, 5, 5, '#212529');
      px(6, 4 + bob, 2, 3, '#ddb892');
      px(16, 4 + bob, 2, 3, '#ddb892');
      px(11, 9 + bob, 2, 8, '#f8f9fa');
      px(10, 16 + bob, 4, 3, '#212529');
    }
  } else {
    // DOMBA (Bulu wol putih mengembang, muka hitam, kaki hitam)
    px(6 - legBob, 17, 2, 4, '#2b2d42');
    px(9 - legBob, 17, 2, 4, '#2b2d42');
    px(13 + legBob, 17, 2, 4, '#2b2d42');
    px(16 + legBob, 17, 2, 4, '#2b2d42');

    px(5, 6 + bob, 14, 11, '#e9ecef');
    px(4, 7 + bob, 16, 9, '#f8f9fa');
    px(6, 5 + bob, 12, 13, '#ffffff');

    if (dir === 'left') {
      px(2, 8 + bob, 6, 7, '#343a40');
      px(3, 10 + bob, 1, 1, '#ffffff');
      px(1, 8 + bob, 2, 3, '#212529');
    } else if (dir === 'right') {
      px(16, 8 + bob, 6, 7, '#343a40');
      px(20, 10 + bob, 1, 1, '#ffffff');
      px(21, 8 + bob, 2, 3, '#212529');
    } else if (dir === 'down') {
      px(9, 9 + bob, 6, 7, '#343a40');
      px(10, 11 + bob, 1, 1, '#ffffff');
      px(13, 11 + bob, 1, 1, '#ffffff');
      px(7, 9 + bob, 2, 3, '#212529');
      px(15, 9 + bob, 2, 3, '#212529');
    } else {
      px(10, 12 + bob, 4, 4, '#dee2e6');
    }
  }

  return canvas;
}

// ---------------------------------------------------------------------------
// 5. DAFTAR KARAKTER & HEWAN LENGKAP DALAM GAME
// ---------------------------------------------------------------------------
const CHARACTERS = [
  {
    id: 'player_bayu',
    folder: 'player',
    displayName: 'Bayu (Karakter Utama Petani)',
    role: 'Protagonis / Petani Cozy Valley',
    appearance: {
      skin: '#f1c27d',
      shirt: '#457b9d',
      pants: '#1d3557',
      hat: 'straw',
      hatColor: '#e9c46a'
    }
  },
  {
    id: 'npc_budi',
    folder: 'npc_budi',
    displayName: 'Pak Budi',
    role: 'Pemilik Toko Desa (Beli Bibit & Jual Hasil)',
    appearance: {
      skin: '#e0ac69',
      shirt: '#2a9d8f',
      pants: '#264653',
      hat: 'straw',
      hatColor: '#e9c46a'
    }
  },
  {
    id: 'npc_kakek',
    folder: 'npc_kakek',
    displayName: 'Kek Wiryo',
    role: 'Tetua Desa Asri',
    appearance: {
      skin: '#c68642',
      shirt: '#6c584c',
      pants: '#3a2e2b',
      hat: 'none',
      hatColor: '#dcdcdc'
    }
  },
  {
    id: 'npc_sari',
    folder: 'npc_sari',
    displayName: 'Mbak Sari',
    role: 'Penambang & Ahli Mineral / Pengrajin',
    appearance: {
      skin: '#f1c27d',
      shirt: '#e76f51',
      pants: '#3d405b',
      hat: 'cap',
      hatColor: '#f4a261'
    }
  },
  {
    id: 'npc_damar',
    folder: 'npc_damar',
    displayName: 'Bang Damar',
    role: 'Nelayan Pantai Selatan',
    appearance: {
      skin: '#c68642',
      shirt: '#457b9d',
      pants: '#1d3557',
      hat: 'straw',
      hatColor: '#f4a261'
    }
  },
  {
    id: 'npc_lurah',
    folder: 'npc_lurah',
    displayName: 'Pak Lurah Hendra',
    role: 'Kepala Balai Desa Asri',
    appearance: {
      skin: '#e0ac69',
      shirt: '#6f1d1b',
      pants: '#1d3557',
      hat: 'hair',
      hatColor: '#222222'
    }
  }
];

const ANIMALS = [
  {
    id: 'animal_chicken',
    folder: 'animal_chicken',
    displayName: 'Ayam (Liar & Ternak)',
    role: 'Hewan Liar Desa/Hutan & Penghasil Telur di Gudang Ternak',
    kind: 'chicken'
  },
  {
    id: 'animal_cow',
    folder: 'animal_cow',
    displayName: 'Sapi Perah (Liar & Ternak)',
    role: 'Hewan Liar Desa/Pantai & Penghasil Susu / Anak di Gudang Ternak',
    kind: 'cow'
  }
];

const DIRECTIONS = ['down', 'up', 'left', 'right'];

// ---------------------------------------------------------------------------
// 6. PROSES EKSPOR ASSET KE D:\career\asset
// ---------------------------------------------------------------------------
async function runExport() {
  console.log(`Memulai ekspor aset karakter ke: ${OUTPUT_DIR}...`);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const charsBaseDir = path.join(OUTPUT_DIR, 'characters');
  const animsBaseDir = path.join(OUTPUT_DIR, 'animals');
  const previewDir = path.join(OUTPUT_DIR, 'preview_sheets');
  [charsBaseDir, animsBaseDir, previewDir].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  const exportSummary = [];

  // 1. Ekspor Setiap Karakter Manusia (16x24 px)
  for (const char of CHARACTERS) {
    const charDir = path.join(charsBaseDir, char.folder);
    if (!fs.existsSync(charDir)) fs.mkdirSync(charDir, { recursive: true });

    // Grid Spritesheet: 3 kolom (step 0, 1, 2) x 4 baris (down, up, left, right)
    // 3 * 16 = 48 px lebar, 4 * 24 = 96 px tinggi
    const sheetCanvas = new PixelCanvas(48, 96);

    for (let r = 0; r < DIRECTIONS.length; r++) {
      const dir = DIRECTIONS[r];
      for (let step = 0; step < 3; step++) {
        const frame = renderCharacterFrame(char.appearance, dir, step);
        const fileName = `${char.folder}_${dir}_step${step}.png`;
        fs.writeFileSync(path.join(charDir, fileName), frame.toPNG());

        sheetCanvas.blit(frame, step * 16, r * 24);
      }
    }

    // Simpan Spritesheet 1x (Ukuran Asli Game 48x96 px)
    fs.writeFileSync(path.join(charDir, `${char.folder}_spritesheet_1x.png`), sheetCanvas.toPNG());

    // Simpan Spritesheet Diperbesar (4x & 8x) agar Azi mudah zoom tanpa blur
    const sheet4x = sheetCanvas.scaleNearest(4);
    fs.writeFileSync(path.join(charDir, `${char.folder}_spritesheet_4x.png`), sheet4x.toPNG());

    const sheet8x = sheetCanvas.scaleNearest(8);
    fs.writeFileSync(path.join(charDir, `${char.folder}_spritesheet_8x.png`), sheet8x.toPNG());

    exportSummary.push({
      name: char.displayName,
      role: char.role,
      folder: `characters/${char.folder}`,
      size: '16x24 px per frame (12 frames: 4 arah x 3 langkah)'
    });
  }

  // 2. Ekspor Setiap Hewan (24x24 px)
  for (const anim of ANIMALS) {
    const animDir = path.join(animsBaseDir, anim.folder);
    if (!fs.existsSync(animDir)) fs.mkdirSync(animDir, { recursive: true });

    // Grid Spritesheet: 2 kolom (step 0, 1) x 4 baris (down, up, left, right)
    // 2 * 24 = 48 px lebar, 4 * 24 = 96 px tinggi
    const sheetCanvas = new PixelCanvas(48, 96);

    for (let r = 0; r < DIRECTIONS.length; r++) {
      const dir = DIRECTIONS[r];
      for (let step = 0; step < 2; step++) {
        const frame = renderAnimalFrame(anim.kind, dir, step);
        const fileName = `${anim.folder}_${dir}_step${step}.png`;
        fs.writeFileSync(path.join(animDir, fileName), frame.toPNG());

        sheetCanvas.blit(frame, step * 24, r * 24);
      }
    }

    fs.writeFileSync(path.join(animDir, `${anim.folder}_spritesheet_1x.png`), sheetCanvas.toPNG());
    fs.writeFileSync(path.join(animDir, `${anim.folder}_spritesheet_4x.png`), sheetCanvas.scaleNearest(4).toPNG());
    fs.writeFileSync(path.join(animDir, `${anim.folder}_spritesheet_8x.png`), sheetCanvas.scaleNearest(8).toPNG());

    exportSummary.push({
      name: anim.displayName,
      role: anim.role,
      folder: `animals/${anim.folder}`,
      size: '24x24 px per frame (8 frames: 4 arah x 2 langkah)'
    });
  }

  // 3. Buat Gambar Preview Gabungan Seluruh Karakter & Hewan (ALL_CHARACTERS_PREVIEW_4X.png)
  // 6 Karakter (16 px lebar x 6 = 96) + 2 Hewan (24 px lebar x 2 = 48) + Spasi antar karakter
  const totalSlots = CHARACTERS.length + ANIMALS.length; // 8 entitas
  const slotW = 32; // tiap entitas diberi kotak 32 px lebar
  const slotH = 32; // tinggi 32 px
  const masterPreview1x = new PixelCanvas(totalSlots * slotW, slotH);

  let currentSlotX = 0;
  for (const char of CHARACTERS) {
    // Ambil pose depan diam (down, step 0)
    const frontFrame = renderCharacterFrame(char.appearance, 'down', 0);
    // Letakkan di tengah slot (32 - 16) / 2 = 8, bawah (32 - 24) - 2 = 6
    masterPreview1x.blit(frontFrame, currentSlotX + 8, 4);
    currentSlotX += slotW;
  }

  for (const anim of ANIMALS) {
    const animFrame = renderAnimalFrame(anim.kind, 'down', 0);
    masterPreview1x.blit(animFrame, currentSlotX + 4, 4);
    currentSlotX += slotW;
  }

  const masterPreview4x = masterPreview1x.scaleNearest(4);
  fs.writeFileSync(path.join(previewDir, 'ALL_CHARACTERS_PREVIEW_4X.png'), masterPreview4x.toPNG());
  const masterPreview8x = masterPreview1x.scaleNearest(8);
  fs.writeFileSync(path.join(previewDir, 'ALL_CHARACTERS_PREVIEW_8X.png'), masterPreview8x.toPNG());

  // 4. Buat File Dokumentasi Lengkap untuk Azi (PANDUAN_ASSET_KARAKTER_AZI.md)
  const readmeContent = `# 🎨 Panduan Referensi Asset Karakter & Hewan untuk Azi

Halo Azi! Folder ini berisi seluruh salinan aset karakter dan hewan ternak/liar yang saat ini aktif digunakan dalam game **Cozy Valley 2D** sebagai bahan referensi desain pixel art.

---

## 📸 Pratinjau Cepat Semua Karakter
Lihat file pratinjau di folder:
👉 **\`preview_sheets/ALL_CHARACTERS_PREVIEW_4X.png\`** atau **\`ALL_CHARACTERS_PREVIEW_8X.png\`**  
*(Urutan dari kiri ke kanan: Bayu Petani, Pak Budi, Kek Wiryo, Mbak Sari, Bang Damar, Pak Lurah Hendra, Ayam, Domba)*.

---

## 📏 Spesifikasi Ukuran & Frame

### 1. Karakter Manusia (Player & NPC)
* **Ukuran Asli per Frame:** \`16 x 24 pixel\` (Rasio 1 : 1.5, pas proporsi pixel art)
* **Format File:** PNG Transparan 32-bit (RGBA)
* **Total Frame per Karakter:** 12 Frame
  * **Baris 1 (Down - Hadap Depan):** Step 0 (Diam/Idle), Step 1 (Langkah Kiri), Step 2 (Langkah Kanan)
  * **Baris 2 (Up - Hadap Belakang):** Step 0 (Diam/Idle), Step 1 (Langkah Kiri), Step 2 (Langkah Kanan)
  * **Baris 3 (Left - Hadap Kiri):** Step 0 (Diam/Idle), Step 1 (Langkah Kiri), Step 2 (Langkah Kanan)
  * **Baris 4 (Right - Hadap Kanan):** Step 0 (Diam/Idle), Step 1 (Langkah Kiri), Step 2 (Langkah Kanan)
* **Ukuran Spritesheet Lengkap (3x4 Grid):** \`48 x 96 pixel\`
  *(Di folder tiap karakter sudah disediakan versi \`_spritesheet_1x.png\`, \`_spritesheet_4x.png\`, dan \`_spritesheet_8x.png\` untuk memudahkan inspeksi pixel)*.

---

### 2. Hewan Ternak & Liar (Ayam & Domba)
* **Ukuran Asli per Frame:** \`24 x 24 pixel\` (Kotak seimbang untuk tubuh hewan)
* **Total Frame per Hewan:** 8 Frame
  * **Baris 1 (Down - Hadap Depan):** Step 0 (Diam), Step 1 (Gerak Kaki/Bob)
  * **Baris 2 (Up - Hadap Belakang):** Step 0 (Diam), Step 1 (Gerak Kaki/Bob)
  * **Baris 3 (Left - Hadap Kiri):** Step 0 (Diam), Step 1 (Gerak Kaki/Bob)
  * **Baris 4 (Right - Hadap Kanan):** Step 0 (Diam), Step 1 (Gerak Kaki/Bob)
* **Ukuran Spritesheet Lengkap (2x4 Grid):** \`48 x 96 pixel\`

---

## 📂 Daftar Karakter dalam Game

| No | Karakter / Hewan | Peran dalam Game | Lokasi Peta | Folder Referensi |
|---|---|---|---|---|
| 1 | **Bayu (Player)** | Karakter Utama Petani | Rumah & Seluruh Peta | \`characters/player/\` |
| 2 | **Pak Budi** | Pemilik Toko Desa (Beli Bibit, Jual Panen/Ikan/Mineral) | Toko Alun-Alun Desa | \`characters/npc_budi/\` |
| 3 | **Kek Wiryo** | Tetua Desa Asri (Quest Sejarah & Pengenalan Desa) | Rumah Kek Wiryo (Desa) | \`characters/npc_kakek/\` |
| 4 | **Mbak Sari** | Ahli Mineral, Penambang & Pengrajin Logam | Dekat Mulut Gua Tambang (Desa) | \`characters/npc_sari/\` |
| 5 | **Bang Damar** | Nelayan Ahli Pancing Laut & Sungai | Dermaga Pantai Selatan | \`characters/npc_damar/\` |
| 6 | **Pak Lurah Hendra** | Kepala Desa Asri (Quest Gotong Royong / Bundles) | Balai Desa Asri (Alun-Alun) | \`characters/npc_lurah/\` |
| 7 | **Ayam Liar / Ternak** | Hewan Liar & Ternak Kandang | Alun-Alun Desa, Hutan, & Pekarangan | \`animals/animal_chicken/\` |
| 8 | **Sapi Perah Liar / Ternak** | Hewan Liar & Ternak Gudang | Alun-Alun Desa, Hutan/Pantai, & Gudang Ternak | \`animals/animal_cow/\` |

---

## 💡 Tips untuk Azi Saat Mendesain
1. **Titik Tumpu (Pivot / Kaki):** Pastikan posisi telapak kaki berada di bagian paling bawah frame (sekitar y = 21–23) agar karakter menempel pas dengan ubin tanah game.
2. **Kontur & Shading:** Game menggunakan pencahayaan natural ala *Stardew Valley*. Garis tepi (outline) gelap/kecokelatan lebih disukai daripada outline hitam pekat kaku.
3. **Format Pengiriman:** Azi bisa mengirimkan berupa:
   * File per frame PNG: misal \`budi_down_0.png\`, \`budi_down_1.png\`, dst.
   * ATAU satu gambar spritesheet per karakter (3 kolom x 4 baris berukuran \`48 x 96 px\`).
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'PANDUAN_ASSET_KARAKTER_AZI.md'), readmeContent, 'utf8');

  console.log('✅ Ekspor berhasil tuntas 100%!');
  console.log(`Semua file tersimpan rapi di: ${OUTPUT_DIR}`);
}

runExport().catch((err) => {
  console.error('Error saat ekspor:', err);
  process.exit(1);
});
