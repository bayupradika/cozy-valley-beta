import * as THREE from 'three';

// Loader tekstur PNG dengan filter NearestFilter (tajam ala Pixel Art Stardew Valley)
const textureLoader = new THREE.TextureLoader();
const customTexCache = new Map();

export function makeNearestTexture(canvasOrTex) {
  const tex = canvasOrTex.isTexture ? canvasOrTex : new THREE.CanvasTexture(canvasOrTex);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  return tex;
}

/**
 * Mencoba memuat file PNG buatan Azi di folder public/assets/...
 * Jika file PNG belum dibuat, otomatis memakai Pixel Art Placeholder bawaan!
 */
export function loadOptionalPixelTexture(url, onLoaded) {
  if (customTexCache.has(url)) {
    const cached = customTexCache.get(url);
    if (cached) onLoaded(cached);
    return;
  }
  textureLoader.load(
    url,
    (tex) => {
      makeNearestTexture(tex);
      customTexCache.set(url, tex);
      onLoaded(tex);
    },
    undefined,
    () => {
      customTexCache.set(url, null); // Tidak masalah jika belum ada file PNG
    }
  );
}

function createCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// =========================================================
// 1. TILESET 16x16 PIXEL ART (RUMPUT, TANAH GARAPAN, BASAH, AIR, BATU, PLAZA)
// =========================================================
const tileTexCache = new Map();

export function getTileTexture(kind, variant = 0) {
  const key = `${kind}_${variant}`;
  if (tileTexCache.has(key)) return tileTexCache.get(key);

  const { c, ctx } = createCanvas(16, 16);

  if (kind === 'grass') {
    px(ctx, 0, 0, 16, 16, variant % 2 === 0 ? '#68b044' : '#61a83e');
    // Detail helai rumput & bintik bunga ala Stardew
    px(ctx, 2, 3, 1, 2, '#4d8c30');
    px(ctx, 3, 4, 1, 1, '#82cc58');
    px(ctx, 11, 10, 1, 2, '#4d8c30');
    px(ctx, 12, 11, 1, 1, '#82cc58');
    if (variant === 2) {
      // Bunga kecil putih/kuning
      px(ctx, 6, 7, 2, 2, '#fff3b0');
      px(ctx, 7, 8, 1, 1, '#f4a261');
    } else if (variant === 3) {
      px(ctx, 9, 4, 1, 2, '#4d8c30');
      px(ctx, 5, 12, 2, 1, '#7bc452');
    }
  } else if (kind === 'dirt') {
    px(ctx, 0, 0, 16, 16, '#c48f52');
    // Border & alur cangkulan (hoed soil Stardew)
    px(ctx, 1, 1, 14, 14, '#9c6635');
    px(ctx, 2, 2, 12, 12, '#ab733e');
    for (let y = 4; y <= 12; y += 4) {
      px(ctx, 3, y, 10, 1, '#7f4f24');
      px(ctx, 3, y + 1, 10, 1, '#be874e');
    }
  } else if (kind === 'wet_dirt') {
    px(ctx, 0, 0, 16, 16, '#7f5330');
    px(ctx, 1, 1, 14, 14, '#54351c');
    px(ctx, 2, 2, 12, 12, '#633f22');
    for (let y = 4; y <= 12; y += 4) {
      px(ctx, 3, y, 10, 1, '#3d2512');
      px(ctx, 3, y + 1, 10, 1, '#754c2b');
    }
  } else if (kind === 'water') {
    px(ctx, 0, 0, 16, 16, '#3a86ff');
    px(ctx, 2, variant % 2 === 0 ? 4 : 5, 5, 1, '#72efdd');
    px(ctx, 9, variant % 2 === 0 ? 11 : 10, 5, 1, '#72efdd');
    px(ctx, 4, 13, 3, 1, '#2667ff');
  } else if (kind === 'quarry') {
    px(ctx, 0, 0, 16, 16, '#8d8273');
    px(ctx, 2, 2, 4, 3, '#7a6f61');
    px(ctx, 10, 8, 4, 4, '#9e9282');
    px(ctx, 4, 11, 3, 2, '#6b6154');
  } else if (kind === 'plaza') {
    // Jalan tanah berpasir / cobblestone hangat ala Pelican Town
    px(ctx, 0, 0, 16, 16, '#e0b379');
    px(ctx, 1, 1, 6, 6, '#d4a36a');
    px(ctx, 9, 1, 6, 6, '#d9aa71');
    px(ctx, 1, 9, 6, 6, '#d9aa71');
    px(ctx, 9, 9, 6, 6, '#d4a36a');
    px(ctx, 0, 7, 16, 1, '#bd8c53');
    px(ctx, 7, 0, 1, 16, '#bd8c53');
  }

  const tex = makeNearestTexture(c);
  tileTexCache.set(key, tex);

  // Opsional override PNG dari Azi: public/assets/tiles/<kind>.png
  loadOptionalPixelTexture(`/assets/tiles/${kind}.png`, (customTex) => {
    tex.image = customTex.image;
    tex.needsUpdate = true;
  });

  return tex;
}

// =========================================================
// 2. CHARACTER SPRITE GENERATOR 16x24 PIXEL ART (4 ARAH + ANIMASI JALAN)
// =========================================================
/**
 * Menghasilkan 12 tekstur pixel-art (4 arah: down, up, left, right x 3 frame: idle, stepL, stepR)
 * Persis proporsi karakter RPG 2D Stardew Valley!
 */
export function buildCharacterFrames(appearance) {
  const dirs = ['down', 'up', 'left', 'right'];
  const frames = {};

  for (const dir of dirs) {
    frames[dir] = [0, 1, 2].map((step) => {
      const { c, ctx } = createCanvas(16, 24);
      const skin = appearance.skin || '#f1c27d';
      const shirt = appearance.shirt || '#457b9d';
      const pants = appearance.pants || '#1d3557';
      const hat = appearance.hat || 'straw';
      const hatColor = appearance.hatColor || '#e9c46a';

      const bob = step === 0 ? 0 : 1; // Kepala sedikit naik-turun saat melangkah

      // Bayangan oval tipis di tanah
      px(ctx, 4, 22, 8, 2, 'rgba(0,0,0,0.32)');

      // Kaki & Sepatu
      const legL = step === 1 ? -1 : step === 2 ? 1 : 0;
      const legR = step === 1 ? 1 : step === 2 ? -1 : 0;
      if (dir === 'left' || dir === 'right') {
        px(ctx, 6 + legL, 17, 4, 4, pants);
        px(ctx, 6 + legL, 21, 4, 2, '#3d2616');
        px(ctx, 6 + legR, 17, 3, 4, pants);
        px(ctx, 6 + legR, 21, 3, 2, '#2b1a0e');
      } else {
        px(ctx, 5, 17 + Math.max(0, legL), 3, 4 - Math.max(0, legL), pants);
        px(ctx, 5, 21 + Math.min(0, legL), 3, 2, '#3d2616');
        px(ctx, 8, 17 + Math.max(0, legR), 3, 4 - Math.max(0, legR), pants);
        px(ctx, 8, 21 + Math.min(0, legR), 3, 2, '#3d2616');
      }

      // Badan / Baju + Outline gelap ala pixel art
      px(ctx, 3, 11 + bob, 10, 7, '#221812');
      px(ctx, 4, 12 + bob, 8, 5, shirt);
      // Strap overall petani
      px(ctx, 5, 14 + bob, 1, 3, pants);
      px(ctx, 10, 14 + bob, 1, 3, pants);
      px(ctx, 5, 16 + bob, 6, 1, pants);

      // Lengan mengayun
      const armOffset = step === 1 ? 1 : step === 2 ? -1 : 0;
      if (dir === 'down' || dir === 'up') {
        px(ctx, 2, 12 + bob + armOffset, 2, 4, shirt);
        px(ctx, 2, 15 + bob + armOffset, 2, 2, skin);
        px(ctx, 12, 12 + bob - armOffset, 2, 4, shirt);
        px(ctx, 12, 15 + bob - armOffset, 2, 2, skin);
      } else {
        const sideX = dir === 'right' ? 7 : 6;
        px(ctx, sideX + armOffset, 13 + bob, 3, 4, shirt);
        px(ctx, sideX + armOffset, 16 + bob, 3, 2, skin);
      }

      // Kepala (Outline + Wajah)
      px(ctx, 3, 3 + bob, 10, 9, '#221812');
      px(ctx, 4, 4 + bob, 8, 7, skin);

      // Rambut dasar belakang/samping
      const hairBase = hat === 'hair' ? hatColor : '#4a3222';
      if (dir === 'up') {
        px(ctx, 4, 4 + bob, 8, 6, hairBase);
      } else if (dir === 'down') {
        px(ctx, 4, 4 + bob, 8, 2, hairBase);
        // Mata pixel art
        px(ctx, 5, 7 + bob, 2, 2, '#1b1b1b');
        px(ctx, 9, 7 + bob, 2, 2, '#1b1b1b');
        px(ctx, 5, 7 + bob, 1, 1, '#ffffff');
        px(ctx, 9, 7 + bob, 1, 1, '#ffffff');
        // Pipi rona hangat
        px(ctx, 4, 9 + bob, 1, 1, '#e5989b');
        px(ctx, 11, 9 + bob, 1, 1, '#e5989b');
      } else if (dir === 'left') {
        px(ctx, 7, 4 + bob, 5, 5, hairBase);
        px(ctx, 5, 7 + bob, 2, 2, '#1b1b1b');
      } else if (dir === 'right') {
        px(ctx, 4, 4 + bob, 5, 5, hairBase);
        px(ctx, 9, 7 + bob, 2, 2, '#1b1b1b');
      }

      // Topi / Gaya Rambut
      if (hat === 'straw') {
        px(ctx, 1, 3 + bob, 14, 2, '#8c5e2a');
        px(ctx, 2, 3 + bob, 12, 1, hatColor);
        px(ctx, 4, 1 + bob, 8, 2, hatColor);
        px(ctx, 4, 2 + bob, 8, 1, '#d94e4e'); // pita topi merah
      } else if (hat === 'cap') {
        px(ctx, 3, 2 + bob, 10, 3, hatColor);
        if (dir === 'down') px(ctx, 3, 4 + bob, 10, 1, '#221812');
        if (dir === 'right') px(ctx, 10, 4 + bob, 5, 1, hatColor);
        if (dir === 'left') px(ctx, 1, 4 + bob, 5, 1, hatColor);
      } else if (hat === 'hair') {
        px(ctx, 3, 2 + bob, 10, 3, hatColor);
        px(ctx, 6, 0 + bob, 3, 2, hatColor);
      }

      return makeNearestTexture(c);
    });
  }

  return frames;
}

// =========================================================
// 3. SPRITE OBJEK DUNIA 2D PIXEL ART (POHON, BATU, TANAMAN, RUMAH, KIOS, BIN)
// =========================================================
const objTexCache = new Map();

export function getTreeTexture() {
  if (objTexCache.has('tree')) return objTexCache.get('tree');
  const { c, ctx } = createCanvas(32, 40);
  // Bayangan bawah
  px(ctx, 8, 36, 16, 3, 'rgba(0,0,0,0.28)');
  // Batang pohon kayu
  px(ctx, 12, 23, 8, 14, '#4a2c18');
  px(ctx, 13, 23, 6, 13, '#7f4f24');
  px(ctx, 14, 25, 2, 10, '#9c6644');
  // Rimbun daun bulat berlapis ala Stardew Valley
  px(ctx, 4, 6, 24, 19, '#1e4620');
  px(ctx, 6, 3, 20, 20, '#2d6a4f');
  px(ctx, 3, 9, 26, 13, '#2d6a4f');
  px(ctx, 7, 5, 18, 14, '#40916c');
  px(ctx, 9, 6, 12, 9, '#52b788');
  // Highlight daun
  px(ctx, 10, 7, 4, 3, '#74c69d');
  px(ctx, 18, 10, 4, 3, '#74c69d');

  const tex = makeNearestTexture(c);
  objTexCache.set('tree', tex);
  loadOptionalPixelTexture('/assets/objects/tree.png', (t) => {
    tex.image = t.image;
    tex.needsUpdate = true;
  });
  return tex;
}

export function getRockTexture(subKind = 'stone') {
  const key = `rock_${subKind}`;
  if (objTexCache.has(key)) return objTexCache.get(key);
  const { c, ctx } = createCanvas(16, 16);
  px(ctx, 2, 13, 12, 2, 'rgba(0,0,0,0.28)');
  px(ctx, 2, 5, 12, 9, '#343a40');
  px(ctx, 3, 4, 10, 9, '#6c757d');
  px(ctx, 4, 5, 7, 5, '#adb5bd');

  if (subKind === 'copper') {
    px(ctx, 4, 7, 3, 2, '#fb8500');
    px(ctx, 9, 6, 2, 3, '#ffb703');
    px(ctx, 7, 10, 3, 2, '#fb8500');
  } else if (subKind === 'gold') {
    px(ctx, 4, 6, 3, 3, '#ffd166');
    px(ctx, 9, 5, 3, 3, '#ffbe0b');
    px(ctx, 6, 10, 4, 2, '#fff3b0');
  }

  const tex = makeNearestTexture(c);
  objTexCache.set(key, tex);
  loadOptionalPixelTexture(`/assets/objects/${key}.png`, (t) => {
    tex.image = t.image;
    tex.needsUpdate = true;
  });
  return tex;
}

export function getCropTexture(cropId, stageIndex) {
  // stageIndex: 0 = benih, 1 = tunas, 2 = matang siap panen
  const key = `crop_${cropId}_${stageIndex}`;
  if (objTexCache.has(key)) return objTexCache.get(key);
  const { c, ctx } = createCanvas(16, 16);

  if (stageIndex === 0) {
    px(ctx, 4, 12, 2, 2, '#e6ccb2');
    px(ctx, 10, 11, 2, 2, '#ddb892');
    px(ctx, 7, 13, 2, 2, '#e6ccb2');
  } else if (stageIndex === 1) {
    px(ctx, 7, 9, 2, 6, '#38b000');
    px(ctx, 4, 8, 3, 2, '#70e000');
    px(ctx, 9, 7, 3, 2, '#70e000');
  } else {
    // Daun rimbun atas
    px(ctx, 4, 2, 8, 5, '#2d6a4f');
    px(ctx, 5, 1, 6, 4, '#52b788');
    // Buah sesuai jenis tanaman
    const colMain = cropId === 'tomato' ? '#e63946' : cropId === 'pumpkin' ? '#ff9f1c' : '#f8f9fa';
    const colSub = cropId === 'tomato' ? '#ff758f' : cropId === 'pumpkin' ? '#ffbf69' : '#e0aaff';
    px(ctx, 3, 6, 10, 8, '#221812');
    px(ctx, 4, 7, 8, 6, colMain);
    px(ctx, 5, 8, 3, 3, colSub);
  }

  const tex = makeNearestTexture(c);
  objTexCache.set(key, tex);
  loadOptionalPixelTexture(`/assets/crops/${key}.png`, (t) => {
    tex.image = t.image;
    tex.needsUpdate = true;
  });
  return tex;
}

export function getPlacedTexture(placeType) {
  const key = `placed_${placeType}`;
  if (objTexCache.has(key)) return objTexCache.get(key);
  const { c, ctx } = createCanvas(16, 16);

  if (placeType === 'fence') {
    px(ctx, 2, 2, 3, 13, '#582f0e');
    px(ctx, 3, 3, 1, 11, '#9c6644');
    px(ctx, 11, 2, 3, 13, '#582f0e');
    px(ctx, 12, 3, 1, 11, '#9c6644');
    px(ctx, 0, 5, 16, 3, '#7f4f24');
    px(ctx, 0, 10, 16, 3, '#7f4f24');
  } else if (placeType === 'lamp') {
    px(ctx, 6, 14, 4, 2, '#212529');
    px(ctx, 7, 6, 2, 8, '#343a40');
    px(ctx, 4, 2, 8, 5, '#ffb703');
    px(ctx, 5, 3, 6, 3, '#fff3b0');
    px(ctx, 3, 1, 10, 2, '#212529');
  } else if (placeType === 'sprinkler') {
    px(ctx, 4, 10, 8, 5, '#495057');
    px(ctx, 6, 6, 4, 5, '#adb5bd');
    px(ctx, 2, 5, 12, 2, '#ffbe0b');
    px(ctx, 1, 4, 2, 2, '#4cc9f0');
    px(ctx, 13, 4, 2, 2, '#4cc9f0');
  } else if (placeType === 'path') {
    px(ctx, 1, 1, 14, 14, '#6c757d');
    px(ctx, 2, 2, 5, 5, '#adb5bd');
    px(ctx, 8, 2, 6, 5, '#ced4da');
    px(ctx, 2, 8, 6, 6, '#ced4da');
    px(ctx, 9, 8, 5, 6, '#adb5bd');
  }

  const tex = makeNearestTexture(c);
  objTexCache.set(key, tex);
  loadOptionalPixelTexture(`/assets/objects/${placeType}.png`, (t) => {
    tex.image = t.image;
    tex.needsUpdate = true;
  });
  return tex;
}

export function getHouseTexture() {
  if (objTexCache.has('house')) return objTexCache.get('house');
  const { c, ctx } = createCanvas(48, 48);
  // Atap kayu merah bata ala Farmhouse Stardew
  px(ctx, 2, 6, 44, 18, '#6a1b1a');
  px(ctx, 4, 8, 40, 15, '#bc4749');
  for (let y = 10; y <= 20; y += 3) {
    px(ctx, 5, y, 38, 1, '#9e2a2b');
  }
  // Cerobong asap
  px(ctx, 34, 1, 6, 9, '#6c757d');
  px(ctx, 33, 1, 8, 2, '#495057');
  // Dinding kayu krem hangat
  px(ctx, 6, 23, 36, 23, '#582f0e');
  px(ctx, 8, 24, 32, 21, '#f3d5b5');
  // Balok kayu pinggir
  px(ctx, 8, 24, 3, 21, '#8b5e34');
  px(ctx, 37, 24, 3, 21, '#8b5e34');
  // Pintu kayu
  px(ctx, 20, 31, 8, 14, '#582f0e');
  px(ctx, 21, 32, 6, 13, '#8b5e34');
  px(ctx, 25, 38, 1, 1, '#ffd166');
  // Jendela menyala hangat
  px(ctx, 12, 29, 6, 6, '#582f0e');
  px(ctx, 13, 30, 4, 4, '#ade8f4');
  px(ctx, 30, 29, 6, 6, '#582f0e');
  px(ctx, 31, 30, 4, 4, '#ffd166');

  const tex = makeNearestTexture(c);
  objTexCache.set('house', tex);
  loadOptionalPixelTexture('/assets/buildings/house.png', (t) => {
    tex.image = t.image;
    tex.needsUpdate = true;
  });
  return tex;
}

export function getShopTexture() {
  if (objTexCache.has('shop')) return objTexCache.get('shop');
  const { c, ctx } = createCanvas(48, 36);
  // Tenda belang merah-putih ala kios pasar desa
  px(ctx, 2, 4, 44, 12, '#3d2512');
  for (let x = 4; x < 44; x += 8) {
    px(ctx, x, 5, 4, 10, '#e63946');
    px(ctx, x + 4, 5, 4, 10, '#fff8eb');
  }
  // Tiang & Meja Kayu
  px(ctx, 6, 16, 3, 18, '#7f4f24');
  px(ctx, 39, 16, 3, 18, '#7f4f24');
  px(ctx, 4, 23, 40, 11, '#582f0e');
  px(ctx, 6, 24, 36, 9, '#b08968');
  // Pajangan sayur di meja
  px(ctx, 11, 20, 5, 4, '#ff9f1c');
  px(ctx, 19, 20, 5, 4, '#e63946');
  px(ctx, 27, 20, 5, 4, '#70e000');

  const tex = makeNearestTexture(c);
  objTexCache.set('shop', tex);
  loadOptionalPixelTexture('/assets/buildings/shop.png', (t) => {
    tex.image = t.image;
    tex.needsUpdate = true;
  });
  return tex;
}

export function getBinTexture() {
  if (objTexCache.has('bin')) return objTexCache.get('bin');
  const { c, ctx } = createCanvas(20, 20);
  px(ctx, 2, 5, 16, 14, '#3d2512');
  px(ctx, 3, 6, 14, 12, '#9c6644');
  px(ctx, 2, 4, 16, 4, '#7f4f24');
  px(ctx, 3, 10, 14, 2, '#495057'); // sabuk besi kotak jual
  px(ctx, 8, 9, 4, 3, '#ffd166');

  const tex = makeNearestTexture(c);
  objTexCache.set('bin', tex);
  loadOptionalPixelTexture('/assets/buildings/shipping_bin.png', (t) => {
    tex.image = t.image;
    tex.needsUpdate = true;
  });
  return tex;
}

// =========================================================
// 4. HELPER PEMBUAT PLANE 2D MURNI + LABEL NAMA PIXEL
// =========================================================
export function createSpritePlane(texture, widthTiles, heightTiles) {
  const geo = new THREE.PlaneGeometry(widthTiles, heightTiles);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.05
  });
  return new THREE.Mesh(geo, mat);
}

export function createLabel2D(text, borderColor = '#ffd166') {
  const { c, ctx } = createCanvas(220, 38);
  ctx.fillStyle = 'rgba(24, 16, 10, 0.78)';
  ctx.beginPath();
  ctx.roundRect(6, 4, 208, 30, 8);
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = 'bold 16px Segoe UI, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 110, 19);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 0.36),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false })
  );
  mesh.renderOrder = 950;
  return mesh;
}
