import * as THREE from 'three';

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
      customTexCache.set(url, null);
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
// 1. TILESET 16x16 PIXEL ART (UNTUK SEMUA SCENE)
// =========================================================
const tileTexCache = new Map();

export function getTileTexture(kind, variant = 0) {
  const key = `${kind}_${variant}`;
  if (tileTexCache.has(key)) return tileTexCache.get(key);

  const { c, ctx } = createCanvas(16, 16);

  if (kind === 'grass') {
    px(ctx, 0, 0, 16, 16, variant % 2 === 0 ? '#68b044' : '#61a83e');
    px(ctx, 2, 3, 1, 2, '#4d8c30');
    px(ctx, 3, 4, 1, 1, '#82cc58');
    px(ctx, 11, 10, 1, 2, '#4d8c30');
    px(ctx, 12, 11, 1, 1, '#82cc58');
    if (variant === 2) {
      px(ctx, 6, 7, 2, 2, '#fff3b0');
      px(ctx, 7, 8, 1, 1, '#f4a261');
    } else if (variant === 3) {
      px(ctx, 9, 4, 1, 2, '#4d8c30');
      px(ctx, 5, 12, 2, 1, '#7bc452');
    }
  } else if (kind === 'dirt') {
    px(ctx, 0, 0, 16, 16, '#c48f52');
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
    px(ctx, 0, 0, 16, 16, '#e0b379');
    px(ctx, 1, 1, 6, 6, '#d4a36a');
    px(ctx, 9, 1, 6, 6, '#d9aa71');
    px(ctx, 1, 9, 6, 6, '#d9aa71');
    px(ctx, 9, 9, 6, 6, '#d4a36a');
    px(ctx, 0, 7, 16, 1, '#bd8c53');
    px(ctx, 7, 0, 1, 16, '#bd8c53');
  } else if (kind === 'wood_floor') {
    px(ctx, 0, 0, 16, 16, '#9c6644');
    px(ctx, 0, 3, 16, 1, '#7f4f24');
    px(ctx, 0, 7, 16, 1, '#7f4f24');
    px(ctx, 0, 11, 16, 1, '#7f4f24');
    px(ctx, 0, 15, 16, 1, '#7f4f24');
    px(ctx, 6, 0, 1, 3, '#7f4f24');
    px(ctx, 12, 4, 1, 3, '#7f4f24');
    px(ctx, 4, 8, 1, 3, '#7f4f24');
  } else if (kind === 'wall_indoor') {
    px(ctx, 0, 0, 16, 16, '#582f0e');
    px(ctx, 1, 2, 14, 12, '#ddb892');
    px(ctx, 0, 14, 16, 2, '#7f4f24');
  } else if (kind === 'sand') {
    px(ctx, 0, 0, 16, 16, variant % 2 === 0 ? '#f4d58d' : '#efcc7a');
    px(ctx, 3, 5, 2, 1, '#d4a373');
    px(ctx, 11, 12, 2, 1, '#fff3b0');
  } else if (kind === 'cave_floor') {
    px(ctx, 0, 0, 16, 16, '#3b3842');
    px(ctx, 2, 3, 4, 3, '#2f2c36');
    px(ctx, 10, 9, 4, 4, '#494552');
  } else if (kind === 'cave_wall') {
    px(ctx, 0, 0, 16, 16, '#1f1d24');
    px(ctx, 2, 2, 12, 12, '#2b2833');
    px(ctx, 4, 4, 8, 5, '#3a3645');
  }

  const tex = makeNearestTexture(c);
  tileTexCache.set(key, tex);

  loadOptionalPixelTexture(`/assets/tiles/${kind}.png`, (customTex) => {
    tex.image = customTex.image;
    tex.needsUpdate = true;
  });

  return tex;
}

// =========================================================
// 2. CHARACTER SPRITE GENERATOR 16x24 PIXEL ART (4 ARAH)
// =========================================================
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

      const bob = step === 0 ? 0 : 1;
      px(ctx, 4, 22, 8, 2, 'rgba(0,0,0,0.32)');

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

      px(ctx, 3, 11 + bob, 10, 7, '#221812');
      px(ctx, 4, 12 + bob, 8, 5, shirt);
      px(ctx, 5, 14 + bob, 1, 3, pants);
      px(ctx, 10, 14 + bob, 1, 3, pants);
      px(ctx, 5, 16 + bob, 6, 1, pants);

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

      px(ctx, 3, 3 + bob, 10, 9, '#221812');
      px(ctx, 4, 4 + bob, 8, 7, skin);

      const hairBase = hat === 'hair' ? hatColor : '#4a3222';
      if (dir === 'up') {
        px(ctx, 4, 4 + bob, 8, 6, hairBase);
      } else if (dir === 'down') {
        px(ctx, 4, 4 + bob, 8, 2, hairBase);
        px(ctx, 5, 7 + bob, 2, 2, '#1b1b1b');
        px(ctx, 9, 7 + bob, 2, 2, '#1b1b1b');
        px(ctx, 5, 7 + bob, 1, 1, '#ffffff');
        px(ctx, 9, 7 + bob, 1, 1, '#ffffff');
        px(ctx, 4, 9 + bob, 1, 1, '#e5989b');
        px(ctx, 11, 9 + bob, 1, 1, '#e5989b');
      } else if (dir === 'left') {
        px(ctx, 7, 4 + bob, 5, 5, hairBase);
        px(ctx, 5, 7 + bob, 2, 2, '#1b1b1b');
      } else if (dir === 'right') {
        px(ctx, 4, 4 + bob, 5, 5, hairBase);
        px(ctx, 9, 7 + bob, 2, 2, '#1b1b1b');
      }

      if (hat === 'straw') {
        px(ctx, 1, 3 + bob, 14, 2, '#8c5e2a');
        px(ctx, 2, 3 + bob, 12, 1, hatColor);
        px(ctx, 4, 1 + bob, 8, 2, hatColor);
        px(ctx, 4, 2 + bob, 8, 1, '#d94e4e');
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
// 3. SPRITE OBJEK, BANGUNAN, FURNITUR RUMAH, & PORTAL SCENE
// =========================================================
const objTexCache = new Map();

export function getTreeTexture() {
  if (objTexCache.has('tree')) return objTexCache.get('tree');
  const { c, ctx } = createCanvas(32, 40);
  px(ctx, 8, 36, 16, 3, 'rgba(0,0,0,0.28)');
  px(ctx, 12, 23, 8, 14, '#4a2c18');
  px(ctx, 13, 23, 6, 13, '#7f4f24');
  px(ctx, 14, 25, 2, 10, '#9c6644');
  px(ctx, 4, 6, 24, 19, '#1e4620');
  px(ctx, 6, 3, 20, 20, '#2d6a4f');
  px(ctx, 3, 9, 26, 13, '#2d6a4f');
  px(ctx, 7, 5, 18, 14, '#40916c');
  px(ctx, 9, 6, 12, 9, '#52b788');
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
  } else if (subKind === 'amethyst') {
    px(ctx, 4, 5, 3, 4, '#9d4edd');
    px(ctx, 9, 6, 3, 4, '#c77dff');
    px(ctx, 6, 9, 4, 3, '#e0aaff');
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
    px(ctx, 4, 2, 8, 5, '#2d6a4f');
    px(ctx, 5, 1, 6, 4, '#52b788');
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
  px(ctx, 2, 6, 44, 18, '#6a1b1a');
  px(ctx, 4, 8, 40, 15, '#bc4749');
  for (let y = 10; y <= 20; y += 3) px(ctx, 5, y, 38, 1, '#9e2a2b');
  px(ctx, 34, 1, 6, 9, '#6c757d');
  px(ctx, 33, 1, 8, 2, '#495057');
  px(ctx, 6, 23, 36, 23, '#582f0e');
  px(ctx, 8, 24, 32, 21, '#f3d5b5');
  px(ctx, 8, 24, 3, 21, '#8b5e34');
  px(ctx, 37, 24, 3, 21, '#8b5e34');
  px(ctx, 20, 31, 8, 14, '#582f0e');
  px(ctx, 21, 32, 6, 13, '#8b5e34');
  px(ctx, 25, 38, 1, 1, '#ffd166');
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
  px(ctx, 2, 4, 44, 12, '#3d2512');
  for (let x = 4; x < 44; x += 8) {
    px(ctx, x, 5, 4, 10, '#e63946');
    px(ctx, x + 4, 5, 4, 10, '#fff8eb');
  }
  px(ctx, 6, 16, 3, 18, '#7f4f24');
  px(ctx, 39, 16, 3, 18, '#7f4f24');
  px(ctx, 4, 23, 40, 11, '#582f0e');
  px(ctx, 6, 24, 36, 9, '#b08968');
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

export function getTownHallTexture() {
  if (objTexCache.has('town_hall')) return objTexCache.get('town_hall');
  const { c, ctx } = createCanvas(64, 48);

  // Atap bertingkat Balai Desa (merah bata terakota + lis emas)
  px(ctx, 2, 10, 60, 12, '#540b0e');
  px(ctx, 4, 8, 56, 13, '#9e2a2b');
  px(ctx, 8, 4, 48, 8, '#b23a48');
  px(ctx, 20, 1, 24, 6, '#540b0e');
  px(ctx, 22, 2, 20, 5, '#e09f3e'); // Puncak mahkota atap emas
  px(ctx, 3, 21, 58, 2, '#ffd166'); // Lis emas bawah atap

  // Menara Jam Bundar di Tengah Atap Balai Desa
  px(ctx, 26, 7, 12, 12, '#582f0e');
  px(ctx, 28, 9, 8, 8, '#fff8eb');
  px(ctx, 31, 10, 2, 4, '#1d3557'); // Jarum jam vertikal
  px(ctx, 31, 12, 3, 2, '#e63946'); // Jarum jam horizontal

  // Dinding Utama Krem & Kayu Jati
  px(ctx, 6, 23, 52, 21, '#582f0e');
  px(ctx, 8, 24, 48, 19, '#fefae0');

  // 4 Pilar Putih Alun-Alun
  for (const colX of [9, 21, 40, 52]) {
    px(ctx, colX, 23, 3, 20, '#ced4da');
    px(ctx, colX + 1, 23, 1, 20, '#ffffff');
  }

  // Pintu Ganda Kayu Balai Desa di Tengah
  px(ctx, 26, 28, 12, 15, '#3d2512');
  px(ctx, 27, 29, 5, 14, '#8b5e34');
  px(ctx, 32, 29, 5, 14, '#7f4f24');
  px(ctx, 30, 36, 1, 2, '#ffd166');
  px(ctx, 33, 36, 1, 2, '#ffd166');

  // Jendela Kiri & Kanan + Pot Bunga
  for (const winX of [13, 44]) {
    px(ctx, winX, 27, 7, 8, '#582f0e');
    px(ctx, winX + 1, 28, 5, 6, '#ade8f4');
    px(ctx, winX, 35, 7, 3, '#2d6a4f');
    px(ctx, winX + 1, 34, 2, 2, '#e63946');
    px(ctx, winX + 4, 34, 2, 2, '#ffd166');
  }

  // Tangga Batu Depan Pintu
  px(ctx, 22, 43, 20, 3, '#adb5bd');
  px(ctx, 20, 45, 24, 3, '#6c757d');

  const tex = makeNearestTexture(c);
  objTexCache.set('town_hall', tex);
  loadOptionalPixelTexture('/assets/buildings/town_hall.png', (t) => {
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
  px(ctx, 3, 10, 14, 2, '#495057');
  px(ctx, 8, 9, 4, 3, '#ffd166');

  const tex = makeNearestTexture(c);
  objTexCache.set('bin', tex);
  loadOptionalPixelTexture('/assets/buildings/shipping_bin.png', (t) => {
    tex.image = t.image;
    tex.needsUpdate = true;
  });
  return tex;
}

export function getPropTexture(propKind) {
  const key = `prop_${propKind}`;
  if (objTexCache.has(key)) return objTexCache.get(key);

  let c, ctx;
  if (propKind === 'bed') {
    ({ c, ctx } = createCanvas(24, 32));
    px(ctx, 2, 2, 20, 28, '#582f0e');
    px(ctx, 4, 4, 16, 8, '#ffffff');
    px(ctx, 4, 11, 16, 17, '#e63946');
    px(ctx, 4, 11, 16, 3, '#ffb4a2');
  } else if (propKind === 'tv') {
    ({ c, ctx } = createCanvas(20, 20));
    px(ctx, 3, 13, 14, 6, '#7f4f24');
    px(ctx, 2, 3, 16, 11, '#343a40');
    px(ctx, 4, 5, 12, 7, '#4cc9f0');
    px(ctx, 6, 6, 4, 3, '#ffffff');
  } else if (propKind === 'kitchen') {
    ({ c, ctx } = createCanvas(32, 20));
    px(ctx, 1, 5, 30, 14, '#7f4f24');
    px(ctx, 2, 4, 28, 4, '#dee2e6');
    px(ctx, 5, 4, 8, 3, '#343a40');
    px(ctx, 6, 2, 6, 3, '#e63946');
    px(ctx, 19, 4, 8, 3, '#adb5bd');
  } else if (propKind === 'rug') {
    ({ c, ctx } = createCanvas(32, 24));
    px(ctx, 0, 0, 32, 24, '#bc4749');
    px(ctx, 2, 2, 28, 20, '#f2e8cf');
    px(ctx, 5, 5, 22, 14, '#e09f3e');
  } else if (propKind === 'door_mat') {
    ({ c, ctx } = createCanvas(24, 14));
    px(ctx, 0, 0, 24, 14, '#582f0e');
    px(ctx, 2, 2, 20, 10, '#ca6702');
  } else if (propKind === 'gate_arch') {
    ({ c, ctx } = createCanvas(32, 28));
    px(ctx, 2, 4, 5, 24, '#582f0e');
    px(ctx, 3, 5, 3, 22, '#9c6644');
    px(ctx, 25, 4, 5, 24, '#582f0e');
    px(ctx, 26, 5, 3, 22, '#9c6644');
    px(ctx, 0, 2, 32, 6, '#7f4f24');
    px(ctx, 2, 3, 28, 4, '#b08968');
  } else if (propKind === 'cave_entrance') {
    ({ c, ctx } = createCanvas(48, 36));
    px(ctx, 2, 6, 44, 28, '#343a40');
    px(ctx, 6, 2, 36, 32, '#495057');
    px(ctx, 10, 5, 28, 28, '#6c757d');
    px(ctx, 14, 14, 20, 20, '#100e14');
    px(ctx, 12, 12, 3, 22, '#7f4f24');
    px(ctx, 33, 12, 3, 22, '#7f4f24');
    px(ctx, 11, 11, 26, 3, '#9c6644');
  } else if (propKind === 'ladder_up') {
    ({ c, ctx } = createCanvas(16, 22));
    px(ctx, 3, 1, 2, 20, '#9c6644');
    px(ctx, 11, 1, 2, 20, '#9c6644');
    for (let y = 3; y <= 18; y += 4) px(ctx, 4, y, 8, 2, '#ddb892');
  } else if (propKind === 'npc_house') {
    ({ c, ctx } = createCanvas(40, 40));
    px(ctx, 2, 5, 36, 15, '#1d3557');
    px(ctx, 4, 7, 32, 12, '#457b9d');
    px(ctx, 5, 19, 30, 19, '#582f0e');
    px(ctx, 7, 20, 26, 17, '#fefae0');
    px(ctx, 17, 26, 6, 11, '#7f4f24');
    px(ctx, 9, 24, 5, 5, '#ffd166');
    px(ctx, 26, 24, 5, 5, '#ffd166');
  } else if (propKind === 'quest_board') {
    ({ c, ctx } = createCanvas(24, 24));
    px(ctx, 3, 12, 3, 11, '#582f0e');
    px(ctx, 18, 12, 3, 11, '#582f0e');
    px(ctx, 2, 3, 20, 12, '#7f4f24');
    px(ctx, 4, 5, 16, 8, '#ddb892');
    px(ctx, 6, 6, 4, 5, '#ffffff');
    px(ctx, 12, 6, 5, 4, '#fff3b0');
  } else if (propKind === 'hall_desk') {
    ({ c, ctx } = createCanvas(40, 20));
    px(ctx, 1, 5, 38, 14, '#582f0e');
    px(ctx, 3, 6, 34, 11, '#8b5e34');
    px(ctx, 0, 3, 40, 4, '#ddb892');
    px(ctx, 6, 1, 8, 4, '#ffffff'); // Buku tamu desa
    px(ctx, 30, 1, 5, 4, '#ffd166'); // Lonceng meja pelayanan
  } else if (propKind === 'bundle_table') {
    ({ c, ctx } = createCanvas(28, 24));
    px(ctx, 2, 7, 24, 15, '#582f0e');
    px(ctx, 4, 5, 20, 14, '#9c6644');
    px(ctx, 6, 6, 16, 9, '#bc4749'); // Taplak merah Balai Desa
    px(ctx, 8, 3, 5, 5, '#ffd166'); // Kotak sumbangan emas
    px(ctx, 15, 4, 5, 4, '#80ed99'); // Gulungan piagam desa
  } else if (propKind === 'berry_bush') {
    ({ c, ctx } = createCanvas(16, 16));
    px(ctx, 2, 4, 12, 10, '#2d6a4f');
    px(ctx, 3, 3, 10, 9, '#40916c');
    px(ctx, 5, 6, 2, 2, '#9d4edd');
    px(ctx, 10, 5, 2, 2, '#c77dff');
    px(ctx, 8, 9, 2, 2, '#9d4edd');
  } else if (propKind === 'sea_shell') {
    ({ c, ctx } = createCanvas(16, 16));
    px(ctx, 4, 6, 8, 6, '#ffcad4');
    px(ctx, 5, 5, 6, 6, '#fff0f3');
    px(ctx, 6, 11, 4, 2, '#f4acb7');
  } else {
    ({ c } = createCanvas(16, 16));
  }

  const tex = makeNearestTexture(c);
  objTexCache.set(key, tex);
  loadOptionalPixelTexture(`/assets/objects/${propKind}.png`, (t) => {
    tex.image = t.image;
    tex.needsUpdate = true;
  });
  return tex;
}

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
  const { c, ctx } = createCanvas(250, 38);
  ctx.fillStyle = 'rgba(24, 16, 10, 0.82)';
  ctx.beginPath();
  ctx.roundRect(4, 4, 242, 30, 8);
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = 'bold 15px Segoe UI, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 125, 19);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.35, 0.36),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false })
  );
  mesh.renderOrder = 950;
  return mesh;
}
