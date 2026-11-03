import * as THREE from 'three';
import { ITEMS, CROPS, RECIPES, NPCS, SCENE_META, CUSTOMIZATION_OPTIONS } from './data.js';
import {
  getTileTexture,
  buildCharacterFrames,
  getTreeTexture,
  getRockTexture,
  getCropTexture,
  getPlacedTexture,
  getHouseTexture,
  getShopTexture,
  getBinTexture,
  getPropTexture,
  createSpritePlane,
  createLabel2D
} from './sprites2d.js';

const SAVE_KEY = 'cozy_valley_multiscene_v3';

// =========================================================
// 1. GLOBAL STATE (DIMULAI DI DALAM RUMAH SESUAI GOOGLE DOCS)
// =========================================================
const state = {
  day: 1,
  minutes: 6 * 60, // 06:00 pagi
  weather: 'sunny',
  tomorrowWeather: 'sunny',
  gold: 150,
  energy: 100,
  maxEnergy: 100,
  activeSlot: 0,
  currentScene: 'house', // Mulai di Dalam Rumah Petani!
  isTransitioning: false,
  dailyQuest: {
    itemId: 'crop_turnip',
    need: 2,
    reward: 130,
    completed: false
  },
  player: {
    name: 'Bayu',
    x: -2.2, // Bangun di samping tempat tidur dalam rumah
    y: 1.0,
    dir: 'down',
    facingX: 0,
    facingY: -1,
    swingTimer: 0,
    appearance: {
      skin: '#f1c27d',
      shirt: '#457b9d',
      pants: '#1d3557',
      hat: 'straw',
      hatColor: '#e9c46a'
    }
  },
  slots: [
    { id: 'hoe', qty: 1 },
    { id: 'watercan', qty: 1 },
    { id: 'pickaxe', qty: 1 },
    { id: 'axe', qty: 1 },
    { id: 'fishing_rod', qty: 1 },
    { id: 'seed_turnip', qty: 6 },
    { id: 'seed_tomato', qty: 2 },
    null,
    null, null, null, null, null, null, null, null, null, null, null, null
  ]
};

try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  if (saved && saved.appearance) {
    state.player.name = saved.name || state.player.name;
    Object.assign(state.player.appearance, saved.appearance);
    if (typeof saved.gold === 'number') state.gold = saved.gold;
    if (typeof saved.day === 'number') state.day = saved.day;
  }
} catch (_) {}

function persistLightSave() {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        name: state.player.name,
        appearance: state.player.appearance,
        gold: state.gold,
        day: state.day
      })
    );
  } catch (_) {}
}

// =========================================================
// 2. THREE.JS 2D ORTHOGRAPHIC RENDERER
// =========================================================
const container = document.getElementById('game-container');
const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const VIEW_TILES_Y = 12.0;
const camera = new THREE.OrthographicCamera(-10, 10, 6, -6, 0.1, 100);
camera.position.set(0, 0, 20);

function updateCameraFrustum() {
  const aspect = window.innerWidth / window.innerHeight;
  const halfH = VIEW_TILES_Y / 2;
  const halfW = halfH * aspect;
  camera.left = -halfW;
  camera.right = halfW;
  camera.top = halfH;
  camera.bottom = -halfH;
  camera.updateProjectionMatrix();
}
updateCameraFrustum();

const nightOverlay = new THREE.Mesh(
  new THREE.PlaneGeometry(90, 90),
  new THREE.MeshBasicMaterial({ color: 0x0c1638, transparent: true, opacity: 0.0, depthTest: false })
);
nightOverlay.position.z = 12;
nightOverlay.renderOrder = 900;
scene.add(nightOverlay);

function applyYSort(obj, footY, layerOffset = 0) {
  obj.position.z = 1 + (20 - footY) * 0.05 + layerOffset * 0.01;
  obj.renderOrder = Math.round((40 - footY) * 10 + layerOffset);
}

// =========================================================
// 3. MATERIAL SHARED TILESET 2D
// =========================================================
const tileGeo = new THREE.PlaneGeometry(1.005, 1.005);
const makeTileMat = (tex) => new THREE.MeshBasicMaterial({ map: tex });

const MATS = {
  grass: [0, 1, 2, 3].map((v) => makeTileMat(getTileTexture('grass', v))),
  dirt: makeTileMat(getTileTexture('dirt')),
  wet_dirt: makeTileMat(getTileTexture('wet_dirt')),
  water: [makeTileMat(getTileTexture('water', 0)), makeTileMat(getTileTexture('water', 1))],
  quarry: makeTileMat(getTileTexture('quarry')),
  plaza: makeTileMat(getTileTexture('plaza')),
  wood_floor: makeTileMat(getTileTexture('wood_floor')),
  wall_indoor: makeTileMat(getTileTexture('wall_indoor')),
  sand: [makeTileMat(getTileTexture('sand', 0)), makeTileMat(getTileTexture('sand', 1))],
  cave_floor: makeTileMat(getTileTexture('cave_floor')),
  cave_wall: makeTileMat(getTileTexture('cave_wall'))
};

// =========================================================
// 4. PERSISTENT MULTI-SCENE WORLD STORAGE (5 SCENE TERPISAH!)
// =========================================================
// Hanya `worlds[state.currentScene].group` yang ditampilkan!
const worlds = {};

function tileKey(x, y) {
  return `${x},${y}`;
}

function getTileIn(sceneId, x, y) {
  return worlds[sceneId]?.tiles.get(tileKey(x, y)) || null;
}

function getTile(x, y) {
  return getTileIn(state.currentScene, x, y);
}

function getGroundMaterial(groundType, grassIdx, waterFrame = 0) {
  if (groundType === 'grass') return MATS.grass[grassIdx];
  if (groundType === 'dirt') return MATS.dirt;
  if (groundType === 'wet_dirt') return MATS.wet_dirt;
  if (groundType === 'water') return MATS.water[waterFrame];
  if (groundType === 'sand') return MATS.sand[grassIdx % 2];
  return MATS[groundType] || MATS.grass[0];
}

function createEmptySceneWorld(meta, defaultGroundFn) {
  const group = new THREE.Group();
  const tilesMap = new Map();
  const portals = []; // { x, y, radius, label, actionType, targetScene, targetX, targetY, targetDir }
  const npcs = [];

  for (let x = -meta.halfW; x <= meta.halfW; x++) {
    for (let y = -meta.halfH; y <= meta.halfH; y++) {
      const groundType = defaultGroundFn(x, y, meta);
      const grassIdx = Math.abs(x * 7 + y * 13) % 4;
      const mesh = new THREE.Mesh(tileGeo, getGroundMaterial(groundType, grassIdx));
      mesh.position.set(x, y, 0);
      group.add(mesh);

      const blockedByWall = groundType === 'wall_indoor' || groundType === 'cave_wall';
      tilesMap.set(tileKey(x, y), {
        sceneId: meta.id,
        x,
        y,
        grassIdx,
        groundType,
        watered: false,
        crop: null,
        obstacle: blockedByWall ? { kind: 'wall' } : null,
        placed: null,
        forage: null, // { itemId, mesh }
        cropMesh: null,
        mesh
      });
    }
  }

  return { meta, group, tiles: tilesMap, portals, npcs };
}

function addStaticProp(world, tex, w, h, x, y, footY, blockTiles = [], labelText = '', labelColor = '#ffd166') {
  const sp = createSpritePlane(tex, w, h);
  sp.position.set(x, y, 1);
  applyYSort(sp, footY);
  world.group.add(sp);

  if (labelText) {
    const lb = createLabel2D(labelText, labelColor);
    lb.position.set(x, y + h * 0.54, 11);
    world.group.add(lb);
  }

  for (const [bx, by] of blockTiles) {
    const t = world.tiles.get(tileKey(bx, by));
    if (t) t.obstacle = { kind: 'building' };
  }
  return sp;
}

// ---------------------------------------------------------
// SCENE 1: HOUSE (DALAM RUMAH PETANI — TEMPAT MULAI GAME)
// ---------------------------------------------------------
function buildHouseScene() {
  const meta = SCENE_META.house;
  const w = createEmptySceneWorld(meta, (x, y, m) => {
    if (Math.abs(x) === m.halfW || y === m.halfH || (y === -m.halfH && Math.abs(x) > 1)) {
      return 'wall_indoor';
    }
    return 'wood_floor';
  });

  // Karpet tengah
  const rug = createSpritePlane(getPropTexture('rug'), 3.2, 2.4);
  rug.position.set(0, -0.3, 0.05);
  rug.renderOrder = 3;
  w.group.add(rug);

  // Keset pintu keluar di selatan (0, -4.5)
  const mat = createSpritePlane(getPropTexture('door_mat'), 1.8, 0.9);
  mat.position.set(0, -4.4, 0.06);
  mat.renderOrder = 4;
  w.group.add(mat);
  const exitLbl = createLabel2D('🚪 Pintu Keluar ke Pekarangan', '#9de070');
  exitLbl.position.set(0, -4.9, 11);
  w.group.add(exitLbl);

  // Kasur di Kiri Atas (-4, 2.5)
  addStaticProp(w, getPropTexture('bed'), 1.8, 2.4, -4, 2.5, 1.8, [[-4, 2], [-4, 3]], '🛏️ Kasur (Tidur)', '#ffadad');

  // TV Ramalan Cuaca di Tengah Atas (0, 3.6)
  addStaticProp(w, getPropTexture('tv'), 1.5, 1.5, 0, 3.6, 3.2, [[0, 4]], '📺 TV Cuaca', '#90e0ef');

  // Meja Dapur Memasak di Kanan Atas (3.5, 3.5)
  addStaticProp(w, getPropTexture('kitchen'), 2.8, 1.7, 3.5, 3.5, 3.1, [[3, 4], [4, 4]], '🍳 Dapur Masak', '#ffd166');

  // Portal & Titik Interaksi Dalam Rumah
  w.portals.push({
    x: 0,
    y: -4.2,
    radius: 1.6,
    label: '🚪 Keluar ke Pekarangan Rumah',
    actionType: 'warp',
    targetScene: 'farm',
    targetX: 0,
    targetY: 2.6,
    targetDir: 'down'
  });
  w.portals.push({
    x: -3.2,
    y: 2.2,
    radius: 1.7,
    label: '🛏️ Tidur ke Hari Berikutnya',
    actionType: 'sleep'
  });
  w.portals.push({
    x: 0,
    y: 2.7,
    radius: 1.5,
    label: '📺 Tonton TV (Ramalan Cuaca)',
    actionType: 'tv'
  });
  w.portals.push({
    x: 3.5,
    y: 2.6,
    radius: 1.6,
    label: '🍳 Buka Dapur & Memasak',
    actionType: 'cook'
  });

  worlds.house = w;
}

// ---------------------------------------------------------
// SCENE 2: FARM (HANYA PEKARANGAN & KEBUN RUMAH)
// ---------------------------------------------------------
function buildFarmScene() {
  const meta = SCENE_META.farm;
  const w = createEmptySceneWorld(meta, (x, y, m) => {
    // Jalan setapak dari depan pintu rumah ke Gerbang Pagar Timur & Jalur Selatan
    if ((x >= 0 && x <= m.halfW && y === 2) || (x === 0 && y >= -m.halfH && y <= 3)) {
      return 'plaza';
    }
    // Kolam kecil penyiraman di sudut barat daya kebun
    if (x >= -9 && x <= -7 && y <= -5 && y >= -7) {
      return 'water';
    }
    return 'grass';
  });

  // Pagar pembatas keliling pekarangan rumah (kecuali mulut gerbang timur & selatan)
  for (let x = -meta.halfW; x <= meta.halfW; x++) {
    for (const y of [meta.halfH, -meta.halfH]) {
      if (y === -meta.halfH && Math.abs(x) <= 1) continue; // celah ke hutan selatan
      const f = createSpritePlane(getPlacedTexture('fence'), 1.0, 1.0);
      f.position.set(x, y + 0.12, 1);
      applyYSort(f, y - 0.1);
      w.group.add(f);
      w.tiles.get(tileKey(x, y)).obstacle = { kind: 'wall' };
    }
  }
  for (let y = -meta.halfH + 1; y <= meta.halfH - 1; y++) {
    for (const x of [-meta.halfW, meta.halfW]) {
      if (x === meta.halfW && Math.abs(y - 2) <= 1) continue; // celah gerbang timur ke Desa!
      const f = createSpritePlane(getPlacedTexture('fence'), 1.0, 1.0);
      f.position.set(x, y + 0.12, 1);
      applyYSort(f, y - 0.1);
      w.group.add(f);
      w.tiles.get(tileKey(x, y)).obstacle = { kind: 'wall' };
    }
  }

  // Rumah Petani Eksterior (Utara Pekarangan)
  addStaticProp(
    w,
    getHouseTexture(),
    3.4,
    3.4,
    0,
    5.0,
    3.6,
    [[-1, 4], [0, 4], [1, 4], [-1, 5], [0, 5], [1, 5]],
    '🏠 Rumahku',
    '#9de070'
  );

  // Kotak Jual (Shipping Bin) di samping rumah
  addStaticProp(w, getBinTexture(), 1.15, 1.15, 2.5, 3.6, 3.2, [[2, 4], [3, 4]], '📦 Kotak Jual', '#ffd166');

  // Gapura Gerbang Pagar Timur menuju Peta Desa!
  addStaticProp(w, getPropTexture('gate_arch'), 2.2, 2.2, meta.halfW - 0.3, 2.3, 1.4, [], '➡️ Gerbang ke Desa', '#ffd166');

  // Gapura Selatan menuju Hutan & Pantai
  addStaticProp(w, getPropTexture('gate_arch'), 2.2, 2.0, 0, -meta.halfH + 0.5, -meta.halfH, [], '⬇️ Jalur ke Hutan & Pantai', '#90e0ef');

  // Petak tanah awal siap tanam di pekarangan
  for (let fx = -4; fx <= -1; fx++) {
    for (let fy = -1; fy <= 1; fy++) {
      const t = w.tiles.get(tileKey(fx, fy));
      if (t) {
        t.groundType = 'dirt';
        t.mesh.material = MATS.dirt;
      }
    }
  }

  // Beberapa pohon & batu liar di pekarangan untuk dibersihkan sesuai Bagian 2A Google Docs
  worlds.farm = w;
  spawnTreeIn('farm', -7, 5);
  spawnTreeIn('farm', -8, 1);
  spawnTreeIn('farm', 6, -4);
  spawnTreeIn('farm', 8, -6);
  spawnRockIn('farm', -6, -2, 'stone');
  spawnRockIn('farm', 4, -2, 'stone');
  spawnRockIn('farm', 5, -5, 'stone');

  // Portals Pekarangan Rumah
  w.portals.push({
    x: 0,
    y: 3.2,
    radius: 1.5,
    label: '🚪 Masuk ke Dalam Rumah',
    actionType: 'warp',
    targetScene: 'house',
    targetX: 0,
    targetY: -3.4,
    targetDir: 'up'
  });
  w.portals.push({
    x: 2.5,
    y: 2.8,
    radius: 1.6,
    label: '📦 Buka Kotak Jual (Shipping Bin)',
    actionType: 'bin'
  });
  w.portals.push({
    x: meta.halfW - 0.8,
    y: 2,
    radius: 1.85,
    label: '🏘️ Pergi ke Peta Desa Asri',
    actionType: 'warp',
    targetScene: 'village',
    targetX: -SCENE_META.village.halfW + 1.6,
    targetY: 0,
    targetDir: 'right'
  });
  w.portals.push({
    x: 0,
    y: -meta.halfH + 1.0,
    radius: 1.85,
    label: '🌲 Pergi ke Hutan & Pantai Selatan',
    actionType: 'warp',
    targetScene: 'forest_beach',
    targetX: 0,
    targetY: SCENE_META.forest_beach.halfH - 1.6,
    targetDir: 'down'
  });
}

// ---------------------------------------------------------
// SCENE 3: VILLAGE (ALUN-ALUN DESA, TOKO, PAPAN QUEST, AKSES TAMBANG)
// ---------------------------------------------------------
function buildVillageScene() {
  const meta = SCENE_META.village;
  const w = createEmptySceneWorld(meta, (x, y, m) => {
    // Jalan utama timur-barat & jalan ke mulut gua tambang di utara
    if (Math.abs(y) <= 1 || (Math.abs(x - 4) <= 1 && y >= 0 && y <= m.halfH) || (x >= -6 && x <= 5 && y >= -2 && y <= 3)) {
      return 'plaza';
    }
    return 'grass';
  });

  // Gapura Barat kembali ke Pekarangan Kebun
  addStaticProp(w, getPropTexture('gate_arch'), 2.2, 2.2, -meta.halfW + 0.4, 0.3, -0.5, [], '⬅️ Kembali ke Kebun', '#9de070');

  // Toko Bibit Pak Budi
  addStaticProp(
    w,
    getShopTexture(),
    3.4,
    2.5,
    -4,
    3.6,
    2.6,
    [[-5, 3], [-4, 3], [-3, 3], [-5, 4], [-4, 4], [-3, 4]],
    '🏪 Toko Bibit Pak Budi',
    '#ffd166'
  );

  // Papan Permintaan Penduduk (Help Wanted Quest Board — Bagian 8 Docs)
  addStaticProp(w, getPropTexture('quest_board'), 1.5, 1.5, -0.5, 2.8, 2.2, [[0, 3]], '📋 Papan Misi Desa', '#90e0ef');

  // Rumah Warga Desa
  addStaticProp(
    w,
    getPropTexture('npc_house'),
    3.0,
    3.0,
    -7.5,
    5.2,
    4.0,
    [[-8, 5], [-7, 5]],
    '🏡 Rumah Kek Wiryo',
    '#ffe082'
  );
  addStaticProp(
    w,
    getPropTexture('npc_house'),
    3.0,
    3.0,
    8.0,
    2.8,
    1.6,
    [[7, 2], [8, 2], [9, 2]],
    '⚒️ Bengkel Mbak Sari',
    '#f4a261'
  );

  // Mulut Gua Tambang di Tebing Utara Desa (4, 7.6)
  addStaticProp(
    w,
    getPropTexture('cave_entrance'),
    3.8,
    2.8,
    4,
    7.6,
    6.4,
    [[3, 8], [4, 8], [5, 8]],
    '⛏️ Mulut Gua Tambang',
    '#ffbe0b'
  );

  // Pohon hias desa
  worlds.village = w;
  for (const [tx, ty] of [[-9, -5], [-6, -6], [2, -6], [8, -5], [10, 6], [-1, 7]]) {
    spawnTreeIn('village', tx, ty);
  }

  // Portals Desa
  w.portals.push({
    x: -meta.halfW + 1.0,
    y: 0,
    radius: 1.85,
    label: '🌾 Kembali ke Pekarangan Rumah',
    actionType: 'warp',
    targetScene: 'farm',
    targetX: SCENE_META.farm.halfW - 1.6,
    targetY: 2,
    targetDir: 'left'
  });
  w.portals.push({
    x: 4,
    y: 6.1,
    radius: 1.85,
    label: '⛏️ Masuk ke Gua Tambang',
    actionType: 'warp',
    targetScene: 'mine',
    targetX: 0,
    targetY: SCENE_META.mine.halfH - 2.0,
    targetDir: 'down'
  });
  w.portals.push({
    x: -0.5,
    y: 1.9,
    radius: 1.55,
    label: '📋 Cek Papan Misi (Help Wanted)',
    actionType: 'quest_board'
  });
  w.portals.push({
    x: -4,
    y: 2.1,
    radius: 1.7,
    label: '🏪 Belanja di Toko Pak Budi',
    actionType: 'shop_direct'
  });
}

// ---------------------------------------------------------
// SCENE 4: FOREST & BEACH (HUTAN FORAGING & PANTAI MEMANCING)
// ---------------------------------------------------------
function buildForestBeachScene() {
  const meta = SCENE_META.forest_beach;
  const w = createEmptySceneWorld(meta, (x, y, m) => {
    if (y <= -5) return 'water'; // Laut selatan
    if (y <= -2) return 'sand';  // Pasir pantai
    if (x === 0 && y >= -2 && y <= m.halfH) return 'plaza'; // Jalan setapak hutan
    return 'grass';
  });

  // Gapura Utara kembali ke Pekarangan Rumah
  addStaticProp(w, getPropTexture('gate_arch'), 2.2, 2.0, 0, meta.halfH - 0.3, meta.halfH - 0.8, [], '⬆️ Kembali ke Kebun', '#9de070');

  worlds.forest_beach = w;
  populateForestForage(true);

  w.portals.push({
    x: 0,
    y: meta.halfH - 1.0,
    radius: 1.85,
    label: '🌾 Kembali ke Pekarangan Rumah',
    actionType: 'warp',
    targetScene: 'farm',
    targetX: 0,
    targetY: -SCENE_META.farm.halfH + 1.6,
    targetDir: 'up'
  });
}

// ---------------------------------------------------------
// SCENE 5: MINE (GUA TAMBANG BAWAH TANAH)
// ---------------------------------------------------------
function buildMineScene() {
  const meta = SCENE_META.mine;
  const w = createEmptySceneWorld(meta, (x, y, m) => {
    if (Math.abs(x) === m.halfW || Math.abs(y) === m.halfH) return 'cave_wall';
    return 'cave_floor';
  });

  // Tangga Keluar Tambang di Utara (0, halfH - 1)
  addStaticProp(
    w,
    getPropTexture('ladder_up'),
    1.1,
    1.5,
    0,
    meta.halfH - 1.0,
    meta.halfH - 1.3,
    [],
    '🪜 Tangga Keluar Tambang',
    '#ffd166'
  );

  worlds.mine = w;
  populateMineRocks(true);

  w.portals.push({
    x: 0,
    y: meta.halfH - 1.5,
    radius: 1.75,
    label: '🪜 Naik Keluar ke Peta Desa',
    actionType: 'warp',
    targetScene: 'village',
    targetX: 4,
    targetY: 5.5,
    targetDir: 'down'
  });
}

// =========================================================
// 5. SPAWNER POHON, BATU TAMBANG, & FORAGING PER SCENE
// =========================================================
function spawnTreeIn(sceneId, x, y) {
  const w = worlds[sceneId];
  const t = getTileIn(sceneId, x, y);
  if (!w || !t || t.groundType !== 'grass' || t.obstacle || t.crop || t.placed || t.forage) return;
  const mesh = createSpritePlane(getTreeTexture(), 2.0, 2.5);
  mesh.position.set(x, y + 0.85, 1);
  applyYSort(mesh, y - 0.15);
  w.group.add(mesh);
  t.obstacle = { kind: 'tree', hp: 3, mesh };
}

function spawnRockIn(sceneId, x, y, subKind = 'stone') {
  const w = worlds[sceneId];
  const t = getTileIn(sceneId, x, y);
  if (!w || !t || t.obstacle || t.crop || t.placed || t.forage) return;
  if (t.groundType === 'water') return;
  const mesh = createSpritePlane(getRockTexture(subKind), 1.0, 1.0);
  mesh.position.set(x, y + 0.08, 1);
  applyYSort(mesh, y - 0.2);
  w.group.add(mesh);
  const hp = subKind === 'amethyst' ? 4 : subKind === 'gold' ? 4 : subKind === 'copper' ? 3 : 2;
  t.obstacle = { kind: 'rock', subKind, hp, mesh };
}

function spawnForageIn(sceneId, x, y, itemId, propName) {
  const w = worlds[sceneId];
  const t = getTileIn(sceneId, x, y);
  if (!w || !t || t.obstacle || t.crop || t.placed || t.forage) return;
  const mesh = createSpritePlane(getPropTexture(propName), 0.95, 0.95);
  mesh.position.set(x, y + 0.1, 1);
  applyYSort(mesh, y - 0.15);
  w.group.add(mesh);
  t.forage = { itemId, mesh };
}

function populateMineRocks(initial = false) {
  const meta = SCENE_META.mine;
  for (let x = -meta.halfW + 1; x <= meta.halfW - 1; x++) {
    for (let y = -meta.halfH + 1; y <= meta.halfH - 2; y++) {
      if (Math.abs(x) <= 1 && y >= meta.halfH - 3) continue; // area tangga masuk aman
      if (Math.random() < (initial ? 0.36 : 0.25)) {
        const r = Math.random();
        const kind = r > 0.9 ? 'amethyst' : r > 0.72 ? 'gold' : r > 0.38 ? 'copper' : 'stone';
        spawnRockIn('mine', x, y, kind);
      }
    }
  }
}

function populateForestForage(initial = false) {
  const trees = [
    [-8, 6], [-5, 5], [-8, 2], [-6, 0], [4, 6], [7, 5], [9, 2], [6, 0], [-3, 3], [3, 2]
  ];
  for (const [tx, ty] of trees) {
    if (initial || Math.random() < 0.4) spawnTreeIn('forest_beach', tx, ty);
  }
  // Semak Beri Liar di hutan & Kerang di pasir pantai
  const berrySpots = [[-4, 1], [-7, 4], [5, 3], [8, 1]];
  for (const [bx, by] of berrySpots) {
    if (initial || Math.random() < 0.5) spawnForageIn('forest_beach', bx, by, 'wild_berry', 'berry_bush');
  }
  const shellSpots = [[-6, -3], [-2, -4], [4, -3], [7, -4]];
  for (const [sx, sy] of shellSpots) {
    if (initial || Math.random() < 0.55) spawnForageIn('forest_beach', sx, sy, 'sea_shell', 'sea_shell');
  }
}

// Bangun kelima Scene Dunia!
buildHouseScene();
buildFarmScene();
buildVillageScene();
buildForestBeachScene();
buildMineScene();

// Pasang NPC hanya ke dalam Scene milik mereka masing-masing!
for (const npcDef of NPCS) {
  const w = worlds[npcDef.scene];
  if (!w) continue;
  const g = new THREE.Group();
  const frames = buildCharacterFrames(npcDef);
  const sprite = createSpritePlane(frames.down[0], 1.05, 1.55);
  sprite.position.set(0, 0.45, 0);
  g.add(sprite);

  const label = createLabel2D(npcDef.name, '#ffd166');
  label.scale.set(0.75, 0.75, 1);
  label.position.set(0, 1.42, 5);
  g.add(label);

  g.userData = { frames, sprite, label };
  g.position.set(npcDef.homeX, npcDef.homeY, 1);
  w.group.add(g);

  w.npcs.push({
    def: npcDef,
    group: g,
    x: npcDef.homeX,
    y: npcDef.homeY,
    homeX: npcDef.homeX,
    homeY: npcDef.homeY,
    targetX: npcDef.homeX,
    targetY: npcDef.homeY,
    dir: 'down',
    waitTimer: 2 + Math.random() * 2,
    talkIndex: 0
  });
}

// =========================================================
// 6. PLAYER SPRITE & SCENE SWITCHER (SEPERTI UNITY LOADSCENE)
// =========================================================
function createPlayer2D() {
  const group = new THREE.Group();
  const frames = buildCharacterFrames(state.player.appearance);
  const sprite = createSpritePlane(frames.down[0], 1.05, 1.55);
  sprite.position.set(0, 0.45, 0);
  group.add(sprite);

  const label = createLabel2D(state.player.name, '#9de070');
  label.scale.set(0.75, 0.75, 1);
  label.position.set(0, 1.42, 5);
  group.add(label);

  const toolCanvas = document.createElement('canvas');
  toolCanvas.width = 64;
  toolCanvas.height = 64;
  const toolTex = new THREE.CanvasTexture(toolCanvas);
  const toolMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.75, 0.75),
    new THREE.MeshBasicMaterial({ map: toolTex, transparent: true })
  );
  toolMesh.visible = false;
  group.add(toolMesh);

  group.userData = { frames, sprite, label, toolCanvas, toolTex, toolMesh };
  return group;
}

const playerGroup = createPlayer2D();
scene.add(playerGroup);

// Selector kotak petak kuning
const selCanvas = document.createElement('canvas');
selCanvas.width = 16;
selCanvas.height = 16;
const sctx = selCanvas.getContext('2d');
sctx.strokeStyle = '#ffe066';
sctx.lineWidth = 2;
sctx.strokeRect(1, 1, 14, 14);
const selTex = new THREE.CanvasTexture(selCanvas);
selTex.magFilter = THREE.NearestFilter;
const tileSelector = new THREE.Mesh(
  new THREE.PlaneGeometry(1.02, 1.02),
  new THREE.MeshBasicMaterial({ map: selTex, transparent: true, opacity: 0.85 })
);
tileSelector.position.z = 0.2;
tileSelector.renderOrder = 15;
scene.add(tileSelector);

// Efek Hujan 2D (hanya terlihat saat scene Outdoor + cuaca hujan)
const rainLines = [];
const rainGroup = new THREE.Group();
rainGroup.visible = false;
rainGroup.position.z = 11;
scene.add(rainGroup);
const rainMat = new THREE.MeshBasicMaterial({ color: 0x90e0ef, transparent: true, opacity: 0.65 });
const rainDropGeo = new THREE.PlaneGeometry(0.04, 0.42);
for (let i = 0; i < 90; i++) {
  const drop = new THREE.Mesh(rainDropGeo, rainMat);
  drop.rotation.z = -0.22;
  drop.position.set((Math.random() - 0.5) * 26, (Math.random() - 0.5) * 18, 0);
  rainGroup.add(drop);
  rainLines.push(drop);
}

let activeWorldGroup = null;

function mountSceneImmediate(sceneId, spawnX, spawnY, dir = 'down') {
  if (activeWorldGroup) {
    scene.remove(activeWorldGroup);
  }
  state.currentScene = sceneId;
  const w = worlds[sceneId];
  activeWorldGroup = w.group;
  scene.add(activeWorldGroup);
  scene.background = new THREE.Color(w.meta.bgColor);

  state.player.x = spawnX;
  state.player.y = spawnY;
  setDirectionName(dir);

  playerGroup.position.set(spawnX, spawnY, 1);
  camera.position.x = spawnX;
  camera.position.y = spawnY;

  rainGroup.visible = !w.meta.isIndoor && state.weather === 'rain';
  document.getElementById('hud-location').textContent = w.meta.title;
}

function switchSceneWithFade(targetScene, targetX, targetY, targetDir = 'down') {
  if (state.isTransitioning) return;
  state.isTransitioning = true;
  const fadeEl = document.getElementById('scene-fade');
  fadeEl.classList.add('active');

  setTimeout(() => {
    mountSceneImmediate(targetScene, targetX, targetY, targetDir);
    showToast(`📍 ${SCENE_META[targetScene].title}`);
    setTimeout(() => {
      fadeEl.classList.remove('active');
      state.isTransitioning = false;
    }, 180);
  }, 250);
}

function setDirectionName(dir) {
  state.player.dir = dir;
  if (dir === 'up') { state.player.facingX = 0; state.player.facingY = 1; }
  else if (dir === 'down') { state.player.facingX = 0; state.player.facingY = -1; }
  else if (dir === 'left') { state.player.facingX = -1; state.player.facingY = 0; }
  else if (dir === 'right') { state.player.facingX = 1; state.player.facingY = 0; }
}

function setDirectionFromVector(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) setDirectionName(dx >= 0 ? 'right' : 'left');
  else setDirectionName(dy >= 0 ? 'up' : 'down');
}

// =========================================================
// 7. PARTIKEL, INVENTORY & HELPER
// =========================================================
const particles = [];
function spawnBurst2D(x, y, colorHex, count = 7) {
  const mat = new THREE.MeshBasicMaterial({ color: colorHex });
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), mat);
    m.position.set(x, y + 0.25, 9);
    scene.add(m);
    particles.push({
      mesh: m,
      vx: (Math.random() - 0.5) * 3.2,
      vy: 1.5 + Math.random() * 2.5,
      life: 0.4
    });
  }
}

function showToast(msg) {
  const wrap = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function countItem(itemId) {
  return state.slots.reduce((acc, s) => (s && s.id === itemId ? acc + s.qty : acc), 0);
}

function addItem(itemId, qty = 1) {
  const def = ITEMS[itemId];
  if (!def) return false;
  if (def.stackable) {
    for (const s of state.slots) {
      if (s && s.id === itemId) {
        s.qty += qty;
        renderHotbar();
        return true;
      }
    }
  }
  for (let i = 0; i < state.slots.length; i++) {
    if (!state.slots[i]) {
      state.slots[i] = { id: itemId, qty };
      renderHotbar();
      return true;
    }
  }
  showToast('⚠️ Tas penuh! Jual barang dulu di Kotak Jual.');
  return false;
}

function removeItem(itemId, qty = 1) {
  let rem = qty;
  for (let i = 0; i < state.slots.length && rem > 0; i++) {
    const s = state.slots[i];
    if (s && s.id === itemId) {
      const take = Math.min(s.qty, rem);
      s.qty -= take;
      rem -= take;
      if (s.qty <= 0) state.slots[i] = null;
    }
  }
  renderHotbar();
  return rem === 0;
}

function consumeEnergy(amount) {
  if (state.energy < amount) {
    showToast('🥵 Energi habis! Makan masakan/hasil panen atau pulang tidur di Kasur Rumah.');
    return false;
  }
  state.energy = Math.max(0, state.energy - amount);
  updateHUD();
  return true;
}

// =========================================================
// 8. MEKANIK AKSI PER SCENE (FARMING, MINING, FORAGING, FISHING, CRAFTING)
// =========================================================
function refreshTileVisual(tile) {
  const w = worlds[tile.sceneId];
  if (tile.groundType === 'dirt') {
    tile.mesh.material = tile.watered ? MATS.wet_dirt : MATS.dirt;
  } else if (tile.groundType === 'grass') {
    tile.mesh.material = MATS.grass[tile.grassIdx];
  }

  if (tile.cropMesh) {
    w.group.remove(tile.cropMesh);
    tile.cropMesh = null;
  }
  if (tile.crop) {
    const cropDef = CROPS[tile.crop.id];
    const ratio = tile.crop.age / cropDef.daysToGrow;
    const stageIdx = ratio >= 1 ? 2 : ratio >= 0.45 ? 1 : 0;
    tile.cropMesh = createSpritePlane(getCropTexture(tile.crop.id, stageIdx), 0.92, 0.92);
    tile.cropMesh.position.set(tile.x, tile.y + 0.14, 1);
    applyYSort(tile.cropMesh, tile.y - 0.1);
    w.group.add(tile.cropMesh);
  }
}

function getTargetTileCoord() {
  const meta = SCENE_META[state.currentScene];
  const tx = Math.round(state.player.x + state.player.facingX);
  const ty = Math.round(state.player.y + state.player.facingY);
  return {
    tx: Math.max(-meta.halfW, Math.min(meta.halfW, tx)),
    ty: Math.max(-meta.halfH, Math.min(meta.halfH, ty))
  };
}

function tryHarvestOrForageTile(tile) {
  if (!tile) return false;
  const w = worlds[tile.sceneId];

  // Pungut barang Foraging (Beri Hutan / Kerang Pantai)
  if (tile.forage) {
    const itemDef = ITEMS[tile.forage.itemId];
    if (addItem(tile.forage.itemId, 1)) {
      w.group.remove(tile.forage.mesh);
      tile.forage = null;
      spawnBurst2D(tile.x, tile.y, 0x9d4edd, 7);
      showToast(`🌿 Memungut +1 ${itemDef.name}!`);
      return true;
    }
  }

  // Panen tanaman matang
  if (tile.crop) {
    const cropDef = CROPS[tile.crop.id];
    if (tile.crop.age >= cropDef.daysToGrow) {
      addItem(cropDef.harvestItem, 1);
      spawnBurst2D(tile.x, tile.y, cropDef.color, 9);
      showToast(`🧺 Panen +1 ${ITEMS[cropDef.harvestItem].name}!`);
      tile.crop = null;
      refreshTileVisual(tile);
      return true;
    }
  }
  return false;
}

function showToolSwingEmoji(iconChar) {
  const { toolCanvas, toolTex, toolMesh } = playerGroup.userData;
  const ctx = toolCanvas.getContext('2d');
  ctx.clearRect(0, 0, 64, 64);
  ctx.font = '44px Segoe UI Emoji, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(iconChar, 32, 34);
  toolTex.needsUpdate = true;
  toolMesh.visible = true;
}

function useActiveItemOnTile(tx, ty) {
  const dist = Math.hypot(tx - state.player.x, ty - state.player.y);
  if (dist > 2.4) {
    showToast('Dekati petak tersebut terlebih dahulu.');
    return;
  }

  const tile = getTile(tx, ty);
  if (!tile) return;
  const w = worlds[state.currentScene];

  const dx = tx - state.player.x;
  const dy = ty - state.player.y;
  if (Math.abs(dx) > 0.08 || Math.abs(dy) > 0.08) setDirectionFromVector(dx, dy);

  if (tryHarvestOrForageTile(tile)) return;

  const slot = state.slots[state.activeSlot];
  if (!slot) {
    if (tile.placed) {
      w.group.remove(tile.placed.mesh);
      if (tile.placed.glow) w.group.remove(tile.placed.glow);
      addItem(tile.placed.itemId, 1);
      tile.placed = null;
    }
    return;
  }

  const item = ITEMS[slot.id];
  state.player.swingTimer = 0.22;
  showToolSwingEmoji(item.icon);

  // 1) CANGKUL (Khusus di Pekarangan Kebun!)
  if (item.toolType === 'hoe') {
    if (state.currentScene !== 'farm') {
      showToast('🌾 Mencangkul lahan hanya bisa dilakukan di Pekarangan Kebunmu!');
      return;
    }
    if (tile.obstacle || tile.placed || tile.forage) {
      showToast('Petak terhalang objek.');
      return;
    }
    if (tile.groundType === 'grass') {
      if (!consumeEnergy(3)) return;
      tile.groundType = 'dirt';
      if (state.weather === 'rain') tile.watered = true;
      refreshTileVisual(tile);
      spawnBurst2D(tx, ty, 0x9c6635, 6);
    } else {
      showToast('Pilih rumput kosong di kebun untuk dicangkul.');
    }
    return;
  }

  // 2) PENYIRAM
  if (item.toolType === 'water') {
    if (tile.groundType === 'dirt') {
      if (!consumeEnergy(2)) return;
      tile.watered = true;
      refreshTileVisual(tile);
      spawnBurst2D(tx, ty, 0x4cc9f0, 6);
    } else {
      showToast('Siram pada tanah garapan di kebun!');
    }
    return;
  }

  // 3) PANCINGAN BAMBU (Memancing di tepi air Hutan/Pantai atau Kolam!)
  if (item.toolType === 'rod') {
    if (tile.groundType !== 'water') {
      showToast('🎣 Arahkan kail ke permukaan air (Kolam atau Laut Pantai Selatan)!');
      return;
    }
    if (!consumeEnergy(5)) return;
    spawnBurst2D(tx, ty, 0x72efdd, 8);
    const isSea = state.currentScene === 'forest_beach';
    const roll = Math.random();
    if (roll < 0.78) {
      const fishId = isSea && Math.random() < 0.45 ? 'fish_snapper' : 'fish_carp';
      addItem(fishId, 1);
      showToast(`🎣 Strike! Berhasil menangkap ${ITEMS[fishId].name}!`);
    } else {
      showToast('💦 Ikan lolos menyambar umpan... Coba lempar lagi!');
    }
    return;
  }

  // 4) BELIUNG (MINING BATU & MINERAL)
  if (item.toolType === 'pickaxe') {
    if (tile.placed) {
      w.group.remove(tile.placed.mesh);
      if (tile.placed.glow) w.group.remove(tile.placed.glow);
      addItem(tile.placed.itemId, 1);
      tile.placed = null;
      return;
    }
    if (tile.obstacle && tile.obstacle.kind === 'rock') {
      if (!consumeEnergy(4)) return;
      tile.obstacle.hp -= 1;
      spawnBurst2D(tx, ty, 0xadb5bd, 6);
      if (tile.obstacle.hp <= 0) {
        const sub = tile.obstacle.subKind;
        w.group.remove(tile.obstacle.mesh);
        tile.obstacle = null;
        addItem('stone', 1 + Math.floor(Math.random() * 2));
        if (sub === 'copper') {
          addItem('copper_ore', 1 + (Math.random() < 0.4 ? 1 : 0));
          showToast('⛏️ Dapat Batu & Bijih Tembaga!');
        } else if (sub === 'gold') {
          addItem('gold_ore', 1);
          showToast('✨ Dapat Bijih Emas!');
        } else if (sub === 'amethyst') {
          addItem('amethyst', 1);
          showToast('💎 Luar biasa! Menemukan Permata Kecubung!');
        } else {
          showToast('🪨 Dapat Batu');
        }
      }
      return;
    }
    if (tile.groundType === 'dirt' && !tile.crop) {
      tile.groundType = 'grass';
      tile.watered = false;
      refreshTileVisual(tile);
    }
    return;
  }

  // 5) KAPAK (TEBANG POHON)
  if (item.toolType === 'axe') {
    if (tile.obstacle && tile.obstacle.kind === 'tree') {
      if (!consumeEnergy(4)) return;
      tile.obstacle.hp -= 1;
      spawnBurst2D(tx, ty, 0x7f4f24, 6);
      if (tile.obstacle.hp <= 0) {
        w.group.remove(tile.obstacle.mesh);
        tile.obstacle = null;
        const woodGain = 3 + Math.floor(Math.random() * 2);
        addItem('wood', woodGain);
        showToast(`🪵 Pohon tumbang! +${woodGain} Kayu`);
      }
    } else {
      showToast('Arahkan kapak ke pohon.');
    }
    return;
  }

  // 6) TANAM BIBIT
  if (item.type === 'seed') {
    if (state.currentScene !== 'farm' || tile.groundType !== 'dirt') {
      showToast('Tanam bibit pada tanah cangkulan di Pekarangan Kebun!');
      return;
    }
    if (tile.crop || tile.obstacle || tile.placed) {
      showToast('Petak ini sudah terisi.');
      return;
    }
    tile.crop = { id: item.cropId, age: 0 };
    removeItem(item.id, 1);
    refreshTileVisual(tile);
    spawnBurst2D(tx, ty, 0x80ed99, 5);
    return;
  }

  // 7) PASANG DEKORASI CRAFTING
  if (item.type === 'placeable') {
    if (state.currentScene !== 'farm') {
      showToast('Pasang fasilitas/dekorasi di Pekarangan Kebunmu!');
      return;
    }
    if (tile.groundType === 'water' || tile.obstacle || tile.placed || tile.crop) {
      showToast('Tidak bisa menaruh objek di petak ini.');
      return;
    }
    const mesh = createSpritePlane(getPlacedTexture(item.placeType), 0.98, 0.98);
    mesh.position.set(tx, ty + (item.placeType === 'path' ? 0 : 0.14), 1);
    if (item.placeType === 'path') {
      mesh.position.z = 0.05;
      mesh.renderOrder = 5;
    } else {
      applyYSort(mesh, ty - 0.15);
    }
    w.group.add(mesh);

    let glow = null;
    if (item.placeType === 'lamp') {
      const gCanvas = document.createElement('canvas');
      gCanvas.width = 64;
      gCanvas.height = 64;
      const gctx = gCanvas.getContext('2d');
      const grad = gctx.createRadialGradient(32, 32, 2, 32, 32, 30);
      grad.addColorStop(0, 'rgba(255, 214, 102, 0.55)');
      grad.addColorStop(1, 'rgba(255, 183, 3, 0)');
      gctx.fillStyle = grad;
      gctx.fillRect(0, 0, 64, 64);
      glow = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 3.4),
        new THREE.MeshBasicMaterial({
          map: new THREE.CanvasTexture(gCanvas),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthTest: false
        })
      );
      glow.position.set(tx, ty + 0.3, 13);
      glow.renderOrder = 920;
      w.group.add(glow);
    }

    tile.placed = { type: item.placeType, itemId: item.id, mesh, glow };
    removeItem(item.id, 1);
    showToast(`🔨 Memasang ${item.name}`);
    return;
  }

  // 8) MAKANAN PEMULIH ENERGI
  if (item.energy) {
    if (state.energy >= state.maxEnergy) {
      showToast('⚡ Energimu masih penuh!');
      return;
    }
    state.energy = Math.min(state.maxEnergy, state.energy + item.energy);
    removeItem(item.id, 1);
    updateHUD();
    showToast(`😋 Makan ${item.name} (+${item.energy}⚡ Energi)`);
  }
}

// =========================================================
// 9. SISTEM INTERAKSI TOMBOL KONTEKSTUAL & PORTAL ANTAR-SCENE
// =========================================================
function getActiveContextAction() {
  const w = worlds[state.currentScene];
  const px = state.player.x;
  const py = state.player.y;

  // 1. Cek Portal Pindah Peta / Objek Interaktif Scene (Pintu, Gerbang Pagar, Mulut Gua, Kasur, TV, Dapur, Bin)
  for (const p of w.portals) {
    if (Math.hypot(p.x - px, p.y - py) <= p.radius) {
      return { kind: 'portal', portal: p, label: p.label };
    }
  }

  // 2. Cek NPC di Scene saat ini
  for (const npc of w.npcs) {
    if (Math.hypot(npc.x - px, npc.y - py) <= 1.75) {
      return { kind: 'npc', npc, label: `💬 Bicara dengan ${npc.def.name}` };
    }
  }

  // 3. Cek Foraging / Panen di depan kaki
  const { tx, ty } = getTargetTileCoord();
  const frontTile = getTile(tx, ty);
  if (frontTile?.forage) {
    return { kind: 'forage', tile: frontTile, label: `🌿 Ambil ${ITEMS[frontTile.forage.itemId].name}` };
  }
  if (frontTile?.crop && frontTile.crop.age >= CROPS[frontTile.crop.id].daysToGrow) {
    return { kind: 'harvest', tile: frontTile, label: `🧺 Panen ${CROPS[frontTile.crop.id].name}` };
  }

  return null;
}

function executeContextAction() {
  if (state.isTransitioning) return;
  const act = getActiveContextAction();
  if (!act) {
    showToast('Dekati Pintu, Gerbang Pagar, Mulut Tambang, atau Warga lalu klik tombol yang muncul!');
    return;
  }

  if (act.kind === 'forage' || act.kind === 'harvest') {
    tryHarvestOrForageTile(act.tile);
    return;
  }

  if (act.kind === 'npc') {
    openNpcDialog(act.npc);
    return;
  }

  if (act.kind === 'portal') {
    const p = act.portal;
    if (p.actionType === 'warp') {
      switchSceneWithFade(p.targetScene, p.targetX, p.targetY, p.targetDir);
    } else if (p.actionType === 'sleep') {
      advanceNextDay();
    } else if (p.actionType === 'tv') {
      openTvDialog();
    } else if (p.actionType === 'cook') {
      closeAllModals();
      renderInventoryAndCrafting();
      document.getElementById('inv-modal').classList.remove('hidden');
    } else if (p.actionType === 'bin') {
      openShippingDialog();
    } else if (p.actionType === 'quest_board') {
      openQuestBoardDialog();
    } else if (p.actionType === 'shop_direct') {
      const budi = worlds.village.npcs.find((n) => n.def.id === 'budi');
      if (budi) openNpcDialog(budi);
    }
  }
}

// =========================================================
// 10. SIKLUS TIDUR & PERGANTIAN HARI (TETAP UPDATE KEBUN WALAU DARI DALAM RUMAH!)
// =========================================================
function applyFarmSprinklers() {
  const farmTiles = worlds.farm.tiles;
  for (const t of farmTiles.values()) {
    if (t.placed && t.placed.type === 'sprinkler') {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nb = getTileIn('farm', t.x + dx, t.y + dy);
          if (nb && nb.groundType === 'dirt') nb.watered = true;
        }
      }
    }
  }
}

function rollNewDailyQuest() {
  const pool = [
    { itemId: 'crop_turnip', need: 2, reward: 130 },
    { itemId: 'wood', need: 6, reward: 95 },
    { itemId: 'copper_ore', need: 2, reward: 110 },
    { itemId: 'fish_carp', need: 1, reward: 105 },
    { itemId: 'wild_berry', need: 2, reward: 90 }
  ];
  const pick = pool[state.day % pool.length];
  state.dailyQuest = { ...pick, completed: false };
}

function advanceNextDay(passedOut = false) {
  closeAllModals();
  state.day += 1;
  state.minutes = 6 * 60;
  state.energy = passedOut ? Math.round(state.maxEnergy * 0.75) : state.maxEnergy;
  state.weather = state.tomorrowWeather;
  state.tomorrowWeather = Math.random() < 0.3 ? 'rain' : 'sunny';

  // Tanaman di Scene Kebun (`farm`) tumbuh setiap ganti hari!
  for (const t of worlds.farm.tiles.values()) {
    if (t.crop && t.watered) {
      const def = CROPS[t.crop.id];
      t.crop.age = Math.min(def.daysToGrow, t.crop.age + 1);
    }
    t.watered = state.weather === 'rain' && t.groundType === 'dirt';
  }
  applyFarmSprinklers();
  for (const t of worlds.farm.tiles.values()) {
    if (t.groundType === 'dirt' || t.crop) refreshTileVisual(t);
  }

  // Respawn mineral di Gua Tambang & Foraging di Hutan/Pantai
  populateMineRocks(false);
  populateForestForage(false);
  rollNewDailyQuest();

  // Bangun pagi selalu kembali di samping kasur Dalam Rumah!
  switchSceneWithFade('house', -2.2, 1.0, 'down');
  persistLightSave();
  updateHUD();

  setTimeout(() => {
    showToast(
      passedOut
        ? `😴 Kamu ketiduran kemalaman dan diantar pulang ke rumah! Hari ke-${state.day}.`
        : `🌅 Selamat pagi Hari ke-${state.day}! Cek TV atau keluar ke pekarangan.`
    );
  }, 350);
}

// =========================================================
// 11. DIALOG TV, PAPAN QUEST DESA, NPC, & SHIPPING BIN
// =========================================================
function openTvDialog() {
  const modal = document.getElementById('dialog-modal');
  modal.classList.remove('hidden');
  document.getElementById('dialog-portrait').textContent = '📺';
  document.getElementById('dialog-name').textContent = 'Siaran TV Lembah';
  document.getElementById('dialog-role').textContent = 'Ramalan Cuaca & Info Harian';
  document.getElementById('dialog-text').textContent =
    `Cuaca hari ini: ${state.weather === 'rain' ? '🌧️ Hujan (Kebun otomatis tersiram!)' : '☀️ Cerah'}. ` +
    `Prakiraan cuaca besok: ${state.tomorrowWeather === 'rain' ? '🌧️ Akan turun Hujan' : '☀️ Cerah Berawan'}.`;

  const actions = document.getElementById('dialog-actions');
  actions.innerHTML = '';
  const closeB = document.createElement('button');
  closeB.className = 'hud-btn primary-btn';
  closeB.textContent = 'Matikan TV';
  closeB.addEventListener('click', closeAllModals);
  actions.appendChild(closeB);
}

function openQuestBoardDialog() {
  const modal = document.getElementById('dialog-modal');
  modal.classList.remove('hidden');
  const q = state.dailyQuest;
  const itemDef = ITEMS[q.itemId];
  const have = countItem(q.itemId);

  document.getElementById('dialog-portrait').textContent = '📋';
  document.getElementById('dialog-name').textContent = 'Papan Permintaan Warga (Help Wanted)';
  document.getElementById('dialog-role').textContent = `Misi Hari ${state.day}`;

  const actions = document.getElementById('dialog-actions');
  actions.innerHTML = '';

  if (q.completed) {
    document.getElementById('dialog-text').textContent =
      '✅ Semua permintaan warga hari ini sudah kamu selesaikan! Cek lagi besok pagi.';
  } else {
    document.getElementById('dialog-text').textContent =
      `Warga membutuhkan ${q.need}x ${itemDef.icon} ${itemDef.name} (Kamu punya: ${have}/${q.need}). Imbalan: 🪙 ${q.reward}G!`;
    if (have >= q.need) {
      const doneBtn = document.createElement('button');
      doneBtn.className = 'hud-btn primary-btn';
      doneBtn.textContent = `✅ Serahkan ${q.need}x ${itemDef.name} (+${q.reward}G)`;
      doneBtn.addEventListener('click', () => {
        removeItem(q.itemId, q.need);
        state.gold += q.reward;
        q.completed = true;
        persistLightSave();
        updateHUD();
        showToast(`🎉 Misi selesai! Menerima +${q.reward}G`);
        openQuestBoardDialog();
      });
      actions.appendChild(doneBtn);
    }
  }

  const closeB = document.createElement('button');
  closeB.className = 'hud-btn';
  closeB.textContent = 'Tutup';
  closeB.addEventListener('click', closeAllModals);
  actions.appendChild(closeB);
}

function openNpcDialog(npc) {
  const modal = document.getElementById('dialog-modal');
  modal.classList.remove('hidden');
  document.getElementById('dialog-portrait').textContent = npc.def.portrait;
  document.getElementById('dialog-name').textContent = npc.def.name;
  document.getElementById('dialog-role').textContent = npc.def.role;
  document.getElementById('dialog-text').textContent = npc.def.lines[npc.talkIndex % npc.def.lines.length];
  npc.talkIndex += 1;

  const actions = document.getElementById('dialog-actions');
  actions.innerHTML = '';

  if (npc.def.isMerchant) {
    for (const sid of ['seed_turnip', 'seed_tomato', 'seed_pumpkin']) {
      const def = ITEMS[sid];
      const b = document.createElement('button');
      b.className = 'hud-btn primary-btn';
      b.textContent = `Beli ${def.icon} ${def.name} (${def.buyPrice}G)`;
      b.addEventListener('click', () => {
        if (state.gold < def.buyPrice) {
          showToast('🪙 Koin tidak cukup!');
          return;
        }
        if (addItem(sid, 1)) {
          state.gold -= def.buyPrice;
          persistLightSave();
          updateHUD();
          showToast(`🌱 Membeli 1 ${def.name}`);
        }
      });
      actions.appendChild(b);
    }
  }

  const closeB = document.createElement('button');
  closeB.className = 'hud-btn';
  closeB.textContent = 'Sampai jumpa!';
  closeB.addEventListener('click', closeAllModals);
  actions.appendChild(closeB);
}

function openShippingDialog() {
  const modal = document.getElementById('dialog-modal');
  modal.classList.remove('hidden');
  document.getElementById('dialog-portrait').textContent = '📦';
  document.getElementById('dialog-name').textContent = 'Kotak Jual (Shipping Bin)';
  document.getElementById('dialog-role').textContent = 'Pekarangan Kebun';
  document.getElementById('dialog-text').textContent =
    'Pilih hasil panen, ikan, beri liar, atau mineral tambang untuk dijual:';

  const actions = document.getElementById('dialog-actions');
  actions.innerHTML = '';

  let hasSellable = false;
  state.slots.forEach((slot) => {
    if (!slot) return;
    const def = ITEMS[slot.id];
    if (!def.sellPrice || def.type === 'seed') return;
    hasSellable = true;
    const btn = document.createElement('button');
    btn.className = 'hud-btn primary-btn';
    const totalVal = def.sellPrice * slot.qty;
    btn.textContent = `Jual ${slot.qty}x ${def.icon} ${def.name} (+${totalVal}G)`;
    btn.addEventListener('click', () => {
      const qtyNow = slot.qty;
      removeItem(slot.id, qtyNow);
      state.gold += def.sellPrice * qtyNow;
      persistLightSave();
      updateHUD();
      showToast(`🪙 Terjual +${def.sellPrice * qtyNow}G!`);
      openShippingDialog();
    });
    actions.appendChild(btn);
  });

  if (!hasSellable) {
    document.getElementById('dialog-text').textContent =
      'Belum ada barang hasil kebun/hutan/tambang di tasmu untuk dijual.';
  }

  const closeB = document.createElement('button');
  closeB.className = 'hud-btn';
  closeB.textContent = 'Tutup';
  closeB.addEventListener('click', closeAllModals);
  actions.appendChild(closeB);
}

// =========================================================
// 12. HUD, INVENTORY, CRAFTING, & KUSTOMISASI PLAYER
// =========================================================
function updateHUD() {
  document.getElementById('hud-day').textContent = `Hari ${state.day}`;
  const hh = String(Math.floor(state.minutes / 60)).padStart(2, '0');
  const mm = String(Math.floor(state.minutes % 60) - (Math.floor(state.minutes % 60) % 10)).padStart(2, '0');
  document.getElementById('hud-clock').textContent = `${hh}:${mm}`;
  document.getElementById('hud-weather').textContent = state.weather === 'rain' ? '🌧️ Hujan' : '☀️ Cerah';
  document.getElementById('hud-gold').textContent = state.gold;

  const pct = Math.round((state.energy / state.maxEnergy) * 100);
  document.getElementById('hud-energy-fill').style.width = `${pct}%`;
  document.getElementById('hud-energy-text').textContent = `${state.energy}/${state.maxEnergy}`;
}

function renderHotbar() {
  const hb = document.getElementById('hotbar');
  hb.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const slot = state.slots[i];
    const div = document.createElement('div');
    div.className = `slot ${state.activeSlot === i ? 'active' : ''}`;
    div.innerHTML = `<span class="slot-key">${i + 1}</span>`;
    if (slot) {
      const def = ITEMS[slot.id];
      div.innerHTML += `<span class="slot-icon">${def.icon}</span>`;
      if (def.stackable && slot.qty > 1) div.innerHTML += `<span class="slot-qty">${slot.qty}</span>`;
      div.title = `${def.name}: ${def.desc}`;
    }
    div.addEventListener('click', () => {
      state.activeSlot = i;
      renderHotbar();
    });
    hb.appendChild(div);
  }

  const active = state.slots[state.activeSlot];
  const label = document.getElementById('active-item-label');
  if (active) {
    const d = ITEMS[active.id];
    label.textContent = `${d.icon} ${d.name} — ${d.desc}`;
  } else {
    label.textContent = 'Tangan Kosong — Dekati pintu/gerbang lalu klik tombol untuk pindah scene';
  }
}

function renderInventoryAndCrafting() {
  const grid = document.getElementById('inventory-grid');
  grid.innerHTML = '';
  state.slots.forEach((slot, idx) => {
    const div = document.createElement('div');
    div.className = `slot ${idx === state.activeSlot ? 'active' : ''}`;
    div.innerHTML = `<span class="slot-key">${idx < 8 ? idx + 1 : 'Tas'}</span>`;
    if (slot) {
      const def = ITEMS[slot.id];
      div.innerHTML += `<span class="slot-icon">${def.icon}</span>`;
      if (def.stackable) div.innerHTML += `<span class="slot-qty">${slot.qty}</span>`;
      div.title = `${def.name} (Klik untuk tukar ke Slot Aktif #${state.activeSlot + 1})`;
    }
    div.addEventListener('click', () => {
      if (idx !== state.activeSlot) {
        const tmp = state.slots[state.activeSlot];
        state.slots[state.activeSlot] = state.slots[idx];
        state.slots[idx] = tmp;
        renderHotbar();
        renderInventoryAndCrafting();
      }
    });
    grid.appendChild(div);
  });

  const cList = document.getElementById('crafting-list');
  cList.innerHTML = '';
  for (const r of RECIPES) {
    const outDef = ITEMS[r.output];
    const reqParts = [];
    let canCraft = true;
    for (const [ingId, needQty] of Object.entries(r.ingredients)) {
      const have = countItem(ingId);
      if (have < needQty) canCraft = false;
      reqParts.push(`${ITEMS[ingId].icon} ${ITEMS[ingId].name} (${have}/${needQty})`);
    }

    const row = document.createElement('div');
    row.className = 'craft-item';
    row.innerHTML = `
      <div class="craft-info">
        <strong>${outDef.icon} ${outDef.name} ${r.outQty > 1 ? `x${r.outQty}` : ''}</strong>
        <small>${reqParts.join(' · ')}</small><br/>
        <small>${r.desc}</small>
      </div>
    `;
    const btn = document.createElement('button');
    btn.className = `hud-btn ${canCraft ? 'primary-btn' : ''}`;
    btn.disabled = !canCraft;
    btn.style.opacity = canCraft ? '1' : '0.45';
    btn.textContent = '🔨 Buat';
    btn.addEventListener('click', () => {
      for (const [ingId, needQty] of Object.entries(r.ingredients)) removeItem(ingId, needQty);
      addItem(r.output, r.outQty);
      showToast(`✅ Berhasil membuat ${outDef.name}!`);
      renderInventoryAndCrafting();
    });
    row.appendChild(btn);
    cList.appendChild(row);
  }
}

function rebuildPlayerCharacterVisual() {
  playerGroup.userData.frames = buildCharacterFrames(state.player.appearance);
  playerGroup.userData.sprite.material.map = playerGroup.userData.frames[state.player.dir][0];
  playerGroup.userData.sprite.material.needsUpdate = true;

  playerGroup.remove(playerGroup.userData.label);
  const newLabel = createLabel2D(state.player.name, '#9de070');
  newLabel.scale.set(0.75, 0.75, 1);
  newLabel.position.set(0, 1.42, 5);
  playerGroup.add(newLabel);
  playerGroup.userData.label = newLabel;
}

function renderSwatchRow(containerId, colors, propName) {
  const row = document.getElementById(containerId);
  row.innerHTML = '';
  for (const c of colors) {
    const sw = document.createElement('div');
    sw.className = `swatch ${state.player.appearance[propName] === c ? 'selected' : ''}`;
    sw.style.background = c;
    sw.addEventListener('click', () => {
      state.player.appearance[propName] = c;
      rebuildPlayerCharacterVisual();
      renderCustomizationModal();
    });
    row.appendChild(sw);
  }
}

function renderCustomizationModal() {
  document.getElementById('cust-name').value = state.player.name;
  renderSwatchRow('swatches-skin', CUSTOMIZATION_OPTIONS.skins, 'skin');
  renderSwatchRow('swatches-shirt', CUSTOMIZATION_OPTIONS.shirts, 'shirt');
  renderSwatchRow('swatches-pants', CUSTOMIZATION_OPTIONS.pants, 'pants');
  renderSwatchRow('swatches-hat', CUSTOMIZATION_OPTIONS.hatColors, 'hatColor');

  const hatGroup = document.getElementById('hat-options');
  hatGroup.innerHTML = '';
  for (const h of CUSTOMIZATION_OPTIONS.hats) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `hud-btn ${state.player.appearance.hat === h.id ? 'primary-btn' : ''}`;
    b.textContent = h.label;
    b.addEventListener('click', () => {
      state.player.appearance.hat = h.id;
      rebuildPlayerCharacterVisual();
      renderCustomizationModal();
    });
    hatGroup.appendChild(b);
  }
}

document.getElementById('btn-random-cust').addEventListener('click', () => {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.player.appearance.skin = pick(CUSTOMIZATION_OPTIONS.skins);
  state.player.appearance.shirt = pick(CUSTOMIZATION_OPTIONS.shirts);
  state.player.appearance.pants = pick(CUSTOMIZATION_OPTIONS.pants);
  state.player.appearance.hat = pick(CUSTOMIZATION_OPTIONS.hats).id;
  state.player.appearance.hatColor = pick(CUSTOMIZATION_OPTIONS.hatColors);
  rebuildPlayerCharacterVisual();
  renderCustomizationModal();
});

document.getElementById('btn-save-cust').addEventListener('click', () => {
  const val = document.getElementById('cust-name').value.trim() || 'Petani';
  state.player.name = val;
  rebuildPlayerCharacterVisual();
  persistLightSave();
  closeAllModals();
  showToast(`👕 Sprite Pixel ${state.player.name} disimpan!`);
});

// =========================================================
// 13. EVENT LISTENERS (KLIK TOMBOL PORTAL, KEYBOARD, MOUSE, MOBILE)
// =========================================================
function closeAllModals() {
  document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden'));
}

function isAnyModalOpen() {
  return Array.from(document.querySelectorAll('.modal')).some((m) => !m.classList.contains('hidden'));
}

document.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', closeAllModals));

// Tombol Klik Pindah Scene / Interaksi!
document.getElementById('btn-context-interact').addEventListener('click', executeContextAction);

document.getElementById('btn-open-inv').addEventListener('click', () => {
  closeAllModals();
  renderInventoryAndCrafting();
  document.getElementById('inv-modal').classList.remove('hidden');
});

document.getElementById('btn-open-cust').addEventListener('click', () => {
  closeAllModals();
  renderCustomizationModal();
  document.getElementById('cust-modal').classList.remove('hidden');
});

document.getElementById('btn-help').addEventListener('click', () => {
  closeAllModals();
  document.getElementById('help-modal').classList.remove('hidden');
});

const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;

  if (e.key === 'Escape') {
    closeAllModals();
    return;
  }
  if (e.key === 'i' || e.key === 'I' || e.key === 'c' || e.key === 'C') {
    const m = document.getElementById('inv-modal');
    const open = !m.classList.contains('hidden');
    closeAllModals();
    if (!open) {
      renderInventoryAndCrafting();
      m.classList.remove('hidden');
    }
    return;
  }
  if (e.key === 'p' || e.key === 'P') {
    const m = document.getElementById('cust-modal');
    const open = !m.classList.contains('hidden');
    closeAllModals();
    if (!open) {
      renderCustomizationModal();
      m.classList.remove('hidden');
    }
    return;
  }

  if (isAnyModalOpen() || state.isTransitioning) return;

  if (e.key >= '1' && e.key <= '8') {
    state.activeSlot = Number(e.key) - 1;
    renderHotbar();
    return;
  }
  if (e.code === 'Space') {
    e.preventDefault();
    const { tx, ty } = getTargetTileCoord();
    useActiveItemOnTile(tx, ty);
    return;
  }
  if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
    executeContextAction();
    return;
  }
  keys.add(e.key.toLowerCase());
});

window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (isAnyModalOpen() || state.isTransitioning || e.button !== 0) return;
  const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
  const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
  const worldX = camera.position.x + ndcX * camera.right;
  const worldY = camera.position.y + ndcY * camera.top;
  useActiveItemOnTile(Math.round(worldX), Math.round(worldY));
});

const touchDirs = { up: false, down: false, left: false, right: false };
document.querySelectorAll('.dpad-btn').forEach((btn) => {
  const dir = btn.dataset.dir;
  const start = (ev) => { ev.preventDefault(); touchDirs[dir] = true; };
  const end = (ev) => { ev.preventDefault(); touchDirs[dir] = false; };
  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointerleave', end);
});
document.getElementById('mob-action').addEventListener('click', () => {
  const { tx, ty } = getTargetTileCoord();
  useActiveItemOnTile(tx, ty);
});
document.getElementById('mob-interact').addEventListener('click', executeContextAction);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateCameraFrustum();
});

// =========================================================
// 14. MAIN GAME LOOP (MULTI-SCENE COLLISION, CAMERA CLAMP, NPC AI)
// =========================================================
function isBlockedInCurrentScene(nx, ny) {
  const meta = SCENE_META[state.currentScene];
  if (nx < -meta.halfW + 0.35 || nx > meta.halfW - 0.35 || ny < -meta.halfH + 0.35 || ny > meta.halfH - 0.35) {
    return true;
  }
  const t = getTile(Math.round(nx), Math.round(ny));
  if (!t) return true;
  if (t.groundType === 'water') return true;
  if (t.obstacle) return true;
  if (t.placed && t.placed.type !== 'path') return true;
  return false;
}

const clock = new THREE.Clock();
let waterAnimTimer = 0;
let waterFrame = 0;

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  const curWorld = worlds[state.currentScene];

  // Animasi air hanya di scene aktif
  waterAnimTimer += dt;
  if (waterAnimTimer > 0.65) {
    waterAnimTimer = 0;
    waterFrame = (waterFrame + 1) % 2;
    for (const t of curWorld.tiles.values()) {
      if (t.groundType === 'water') t.mesh.material = MATS.water[waterFrame];
    }
  }

  if (!isAnyModalOpen() && !state.isTransitioning) {
    // 1. Siklus Jam Harian (06:00 -> 24:00 pingsan/pulang otomatis)
    state.minutes += dt * 2.6;
    if (state.minutes >= 24 * 60) {
      advanceNextDay(true);
      return;
    }
    updateHUD();

    // 2. Pencahayaan Malam / Gua / Dalam Rumah
    const hour = state.minutes / 60;
    let nightAlpha = 0;
    if (state.currentScene === 'mine') {
      nightAlpha = 0.28; // Suasana redup gua bawah tanah
    } else if (!curWorld.meta.isIndoor) {
      if (hour >= 17.5) nightAlpha = Math.min(0.55, ((hour - 17.5) / 4.5) * 0.55);
      if (state.weather === 'rain') nightAlpha = Math.max(nightAlpha, 0.18);
    }
    nightOverlay.material.opacity = nightAlpha;

    for (const t of curWorld.tiles.values()) {
      if (t.placed && t.placed.glow) {
        t.placed.glow.visible = hour >= 17 || state.weather === 'rain';
      }
    }

    // 3. Gerak Player
    let mx = 0;
    let my = 0;
    if (keys.has('w') || keys.has('arrowup') || touchDirs.up) my += 1;
    if (keys.has('s') || keys.has('arrowdown') || touchDirs.down) my -= 1;
    if (keys.has('a') || keys.has('arrowleft') || touchDirs.left) mx -= 1;
    if (keys.has('d') || keys.has('arrowright') || touchDirs.right) mx += 1;

    const moving = mx !== 0 || my !== 0;
    if (moving) {
      setDirectionFromVector(mx, my);
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;

      const speed = 4.35 * dt;
      const tryX = state.player.x + mx * speed;
      const tryY = state.player.y + my * speed;
      if (!isBlockedInCurrentScene(tryX, state.player.y)) state.player.x = tryX;
      if (!isBlockedInCurrentScene(state.player.x, tryY)) state.player.y = tryY;
    }

    const pData = playerGroup.userData;
    const stepFrame = moving ? (Math.floor(elapsed * 8) % 2 === 0 ? 1 : 2) : 0;
    pData.sprite.material.map = pData.frames[state.player.dir][stepFrame];

    if (state.player.swingTimer > 0) {
      state.player.swingTimer = Math.max(0, state.player.swingTimer - dt);
      pData.toolMesh.position.set(state.player.facingX * 0.55, 0.38 + state.player.facingY * 0.35, 0.5);
      pData.toolMesh.rotation.z = Math.sin(state.player.swingTimer * 20) * 0.7;
      if (state.player.swingTimer <= 0) pData.toolMesh.visible = false;
    }

    playerGroup.position.x = state.player.x;
    playerGroup.position.y = state.player.y;
    applyYSort(playerGroup, state.player.y);

    // 4. Selector Petak (sembunyikan di dalam rumah agar bersih)
    const { tx, ty } = getTargetTileCoord();
    tileSelector.visible = state.currentScene !== 'house' && state.currentScene !== 'village';
    tileSelector.position.set(tx, ty, 0.2);

    // 5. Tombol Klik Pindah Scene / Interaksi Kontekstual
    const ctxAct = getActiveContextAction();
    const banner = document.getElementById('portal-banner');
    const btnCtx = document.getElementById('btn-context-interact');
    if (ctxAct) {
      banner.classList.remove('hidden');
      btnCtx.innerHTML = `${ctxAct.label} <kbd>E</kbd>`;
    } else {
      banner.classList.add('hidden');
    }

    // 6. AI Jalan Santai NPC di Scene Aktif
    for (const npc of curWorld.npcs) {
      const dx = npc.targetX - npc.x;
      const dy = npc.targetY - npc.y;
      const d = Math.hypot(dx, dy);
      const nData = npc.group.userData;
      if (d > 0.08) {
        const step = Math.min(d, 1.2 * dt);
        const nx = npc.x + (dx / d) * step;
        const ny = npc.y + (dy / d) * step;
        if (!isBlockedInCurrentScene(nx, ny)) {
          npc.x = nx;
          npc.y = ny;
        } else {
          npc.targetX = npc.x;
          npc.targetY = npc.y;
        }
        if (Math.abs(dx) > Math.abs(dy)) npc.dir = dx >= 0 ? 'right' : 'left';
        else npc.dir = dy >= 0 ? 'up' : 'down';

        const f = Math.floor(elapsed * 6) % 2 === 0 ? 1 : 2;
        nData.sprite.material.map = nData.frames[npc.dir][f];
        npc.group.position.x = npc.x;
        npc.group.position.y = npc.y;
        applyYSort(npc.group, npc.y);
      } else {
        nData.sprite.material.map = nData.frames[npc.dir][0];
        npc.waitTimer -= dt;
        if (npc.waitTimer <= 0) {
          npc.waitTimer = 3 + Math.random() * 4;
          npc.targetX = npc.homeX + (Math.random() * 3.2 - 1.6);
          npc.targetY = npc.homeY + (Math.random() * 2.2 - 1.1);
        }
      }
    }
  }

  // Hujan Outdoor
  if (rainGroup.visible) {
    rainGroup.position.x = camera.position.x;
    rainGroup.position.y = camera.position.y;
    for (const drop of rainLines) {
      drop.position.y -= dt * 14;
      drop.position.x -= dt * 3;
      if (drop.position.y < -9) {
        drop.position.y = 9;
        drop.position.x = (Math.random() - 0.5) * 26;
      }
    }
  }

  // Partikel
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.vy -= 8.5 * dt;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
    }
  }

  // Kamera Follow khusus ukuran Scene Aktif (Ruangan kecil seperti Rumah otomatis di-center!)
  const meta = curWorld.meta;
  const maxCamX = Math.max(0, meta.halfW + 0.5 - camera.right);
  const maxCamY = Math.max(0, meta.halfH + 0.5 - camera.top);
  const targetCamX = maxCamX === 0 ? 0 : Math.max(-maxCamX, Math.min(maxCamX, state.player.x));
  const targetCamY = maxCamY === 0 ? 0 : Math.max(-maxCamY, Math.min(maxCamY, state.player.y));

  camera.position.x += (targetCamX - camera.position.x) * 0.14;
  camera.position.y += (targetCamY - camera.position.y) * 0.14;
  nightOverlay.position.x = camera.position.x;
  nightOverlay.position.y = camera.position.y;

  renderer.render(scene, camera);
}

// Mulai Permainan di Dalam Rumah Petani!
mountSceneImmediate('house', -2.2, 1.0, 'down');
updateHUD();
renderHotbar();
showToast('🏠 Pagi pukul 06:00! Kamu bangun di Dalam Rumah. Dekati Pintu Bawah & Klik Tombol untuk ke Pekarangan.');
tick();
