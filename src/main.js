import * as THREE from 'three';
import {
  DAYS_OF_WEEK,
  TIME_PHASES,
  DAILY_LOGIN_REWARDS,
  ITEMS,
  CROPS,
  RECIPES,
  NPCS,
  VILLAGE_BUNDLES,
  SCENE_META,
  CUSTOMIZATION_OPTIONS,
  PROLOG_SLIDES,
  STORY_QUESTS
} from './data.js';
import {
  getTileTexture,
  buildCharacterFrames,
  buildAnimalFrames,
  getTreeTexture,
  getRockTexture,
  getCropTexture,
  getPlacedTexture,
  getHouseTexture,
  getShopTexture,
  getTownHallTexture,
  getBarnTexture,
  getPropTexture,
  createSpritePlane,
  createLabel2D
} from './sprites2d.js';

const SAVE_KEY = 'cozy_valley_phases_v4';
const LOGIN_SAVE_KEY = 'cozy_valley_daily_login_v1';

// Laju Stamina (% per detik):
// - Kondisi diam: 0.025% per detik (perbandingan 2x lebih lama/awet dari 0.05%/detik agar seimbang sepanjang hari)
// - Kondisi bergerak/berjalan, mining, memancing, buka lahan, bertani, menyiram: 2x lebih banyak dibanding saat diam (0.05%/detik)
const IDLE_STAMINA_DRAIN_PER_SEC = 0.025;
const ACTIVE_STAMINA_MULTIPLIER = 2.0;

// =========================================================
// 1. GLOBAL STATE (SENIN JAM 06:00 PAGI, 5 MENIT PER FASE, TANPA HARI 1,2,3)
// =========================================================
const state = {
  weekdayIndex: 0, // 0 = Senin, 1 = Selasa, ..., 6 = Minggu
  phaseIndex: 0, // 0 = Pagi (5m), 1 = Siang/Sore (5m), 2 = Malam (5m), 3 = Tengah Malam (Terkunci!)
  phaseElapsedSec: 0, // Berjalan 0 .. 300 detik (5 menit) per fase
  weather: 'sunny',
  tomorrowWeather: 'sunny',
  gold: 150,
  energy: 100,
  maxEnergy: 100,
  activeSlot: 0,
  currentScene: 'house',
  isTransitioning: false,
  // Quest aktif yang diambil saat berbicara dengan NPC
  activeNpcQuest: null, // { npcId, npcName, title, itemId, need, reward }
  npcQuestProgress: {}, // { budi: 0, kakek: 0, ... }
  completedBundles: {}, // { bundle_tani: true, ... }
  farmAnimals: [], // [{ id: 'cow_1', type: 'cow', name: 'Sapi', x: -5, y: -1, dir: 'down', fedDays: 0, isSick: false, ... }]
  MAX_FARM_ANIMALS: 12,
  barn: {
    cowFeed: 2,       // bak pakan rumput sapi (0..6)
    cowWater: 2,      // bak air minum sapi (0..6)
    chickenFeed: 2,   // bak pakan ayam (0..6)
    chickenWater: 2,  // bak air minum ayam (0..6)
    hasRooster: false // ada ayam jantan di kandang kecil pojok kanan atas
  },
  // Story Quest & Prolog (Berdasarkan dokumen referensi GDocs)
  story: {
    currentQuestId: 'story_1_1',
    completedQuests: {},
    hasSeenProlog: false,
    greetedNpcs: {},
    affPercent: {
      bohei: 1,
      dino: 0,
      blen: 0,
      rossi: 0,
      christaa: 0,
      rol: 0,
      billy: 0,
      donald: 0,
      vee: 0,
      roden: 0,
      nesta: 0,
      bayu_nelayan: 0
    }
  },
  player: {
    name: 'Ryu',
    x: -2.2,
    y: 1.0,
    dir: 'down',
    facingX: 0,
    facingY: -1,
    swingTimer: 0,
    workActivityTimer: 0,
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

// State terpisah untuk Daily Login Reward (Real-time Tanggal Kalender Dunia Nyata)
const dailyLogin = {
  streakCount: 0, // sudah berapa hari klaim (0..7)
  lastClaimDate: '' // format 'YYYY-MM-DD' lokal
};

function getRealWorldDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  if (saved && saved.appearance) {
    state.player.name = saved.name || state.player.name;
    Object.assign(state.player.appearance, saved.appearance);
    if (typeof saved.gold === 'number') state.gold = saved.gold;
    if (typeof saved.weekdayIndex === 'number') state.weekdayIndex = saved.weekdayIndex % 7;
    if (saved.completedBundles && typeof saved.completedBundles === 'object') {
      state.completedBundles = saved.completedBundles;
    }
    if (Array.isArray(saved.farmAnimals)) {
      state.farmAnimals = saved.farmAnimals;
    }
    if (saved.barn && typeof saved.barn === 'object') {
      Object.assign(state.barn, saved.barn);
    }
    if (saved.story && typeof saved.story === 'object') {
      Object.assign(state.story, saved.story);
    }
  }
  const savedLogin = JSON.parse(localStorage.getItem(LOGIN_SAVE_KEY) || 'null');
  if (savedLogin) {
    dailyLogin.streakCount = savedLogin.streakCount || 0;
    dailyLogin.lastClaimDate = savedLogin.lastClaimDate || '';
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
        weekdayIndex: state.weekdayIndex,
        completedBundles: state.completedBundles,
        farmAnimals: state.farmAnimals,
        barn: state.barn,
        story: state.story
      })
    );
  } catch (_) {}
}

function persistDailyLogin() {
  try {
    localStorage.setItem(LOGIN_SAVE_KEY, JSON.stringify(dailyLogin));
  } catch (_) {}
}

function isMidnight() {
  return state.phaseIndex === 3;
}

// Menghitung jam di dalam game sesuai progres detik pada fase aktif (06:00 -> 12:00 -> 18:00 -> 00:00)
function getCurrentGameHourFloat() {
  const phase = TIME_PHASES[state.phaseIndex];
  if (state.phaseIndex === 3 || !phase.durationSec) return 24;
  const ratio = Math.min(1, state.phaseElapsedSec / phase.durationSec);
  return phase.clockStart + ratio * (phase.clockEnd - phase.clockStart);
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
// 4. PERSISTENT MULTI-SCENE WORLD STORAGE (5 SCENE)
// =========================================================
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
  const portals = [];
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
        forage: null,
        cropMesh: null,
        mesh
      });
    }
  }

  return { meta, group, tiles: tilesMap, portals, npcs, animals: [] };
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
// SCENE 1: HOUSE (DALAM RUMAH PETANI)
// ---------------------------------------------------------
function buildHouseScene() {
  const meta = SCENE_META.house;
  const w = createEmptySceneWorld(meta, (x, y, m) => {
    if (Math.abs(x) === m.halfW || y === m.halfH || (y === -m.halfH && Math.abs(x) > 1)) {
      return 'wall_indoor';
    }
    return 'wood_floor';
  });

  const rug = createSpritePlane(getPropTexture('rug'), 3.2, 2.4);
  rug.position.set(0, -0.3, 0.05);
  rug.renderOrder = 3;
  w.group.add(rug);

  const mat = createSpritePlane(getPropTexture('door_mat'), 1.8, 0.9);
  mat.position.set(0, -4.4, 0.06);
  mat.renderOrder = 4;
  w.group.add(mat);
  const exitLbl = createLabel2D('🚪 Pintu Keluar ke Pekarangan', '#9de070');
  exitLbl.position.set(0, -4.9, 11);
  w.group.add(exitLbl);

  addStaticProp(w, getPropTexture('bed'), 1.8, 2.4, -4, 2.5, 1.8, [[-4, 2], [-4, 3]], '🛏️ Kasur (Tidur)', '#ffadad');
  addStaticProp(w, getPropTexture('tv'), 1.5, 1.5, 0, 3.6, 3.2, [[0, 4]], '📺 TV Cuaca', '#90e0ef');
  addStaticProp(w, getPropTexture('kitchen'), 2.8, 1.7, 3.5, 3.5, 3.1, [[3, 4], [4, 4]], '🍳 Dapur Masak', '#ffd166');

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
    label: '🛏️ Tidur ke Pagi Berikutnya',
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
// SCENE 2: FARM (PEKARANGAN & KEBUN RUMAH — KOTAK JUAL SUDAH DIHAPUS!)
// ---------------------------------------------------------
function buildFarmScene() {
  const meta = SCENE_META.farm;
  const w = createEmptySceneWorld(meta, (x, y, m) => {
    if ((x >= 0 && x <= m.halfW && y === 2) || (x === 0 && y >= -m.halfH && y <= 3)) {
      return 'plaza';
    }
    if (x >= -9 && x <= -7 && y <= -5 && y >= -7) {
      return 'water';
    }
    return 'grass';
  });

  for (let x = -meta.halfW; x <= meta.halfW; x++) {
    for (const y of [meta.halfH, -meta.halfH]) {
      if (y === -meta.halfH && Math.abs(x) <= 1) continue;
      const f = createSpritePlane(getPlacedTexture('fence'), 1.0, 1.0);
      f.position.set(x, y + 0.12, 1);
      applyYSort(f, y - 0.1);
      w.group.add(f);
      w.tiles.get(tileKey(x, y)).obstacle = { kind: 'wall' };
    }
  }
  for (let y = -meta.halfH + 1; y <= meta.halfH - 1; y++) {
    for (const x of [-meta.halfW, meta.halfW]) {
      if (x === meta.halfW && Math.abs(y - 2) <= 1) continue;
      const f = createSpritePlane(getPlacedTexture('fence'), 1.0, 1.0);
      f.position.set(x, y + 0.12, 1);
      applyYSort(f, y - 0.1);
      w.group.add(f);
      w.tiles.get(tileKey(x, y)).obstacle = { kind: 'wall' };
    }
  }

  // Rumah Petani Eksterior (Tanpa Kotak Jual!)
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

  // Gapura Gerbang Pagar Timur -> Desa & Selatan -> Hutan/Pantai
  addStaticProp(w, getPropTexture('gate_arch'), 2.2, 2.2, meta.halfW - 0.3, 2.3, 1.4, [], '➡️ Gerbang ke Desa', '#ffd166');
  addStaticProp(w, getPropTexture('gate_arch'), 2.2, 2.0, 0, -meta.halfH + 0.5, -meta.halfH, [], '⬇️ Jalur ke Hutan & Pantai', '#90e0ef');

  // 🏡 GUDANG TERNAK PEKARANGAN RUMAH (Diletakkan di sebelah kiri rumah player, tanpa pagar luar!)
  addStaticProp(
    w,
    getBarnTexture(),
    4.2,
    3.2,
    -5.5,
    5.0,
    3.6,
    [[-7, 4], [-6, 4], [-5, 4], [-4, 4], [-7, 5], [-6, 5], [-5, 5], [-4, 5]],
    '🛖 Gudang Ternak',
    '#ffd166'
  );

  for (let fx = -4; fx <= -1; fx++) {
    for (let fy = -1; fy <= 1; fy++) {
      const t = w.tiles.get(tileKey(fx, fy));
      if (t) {
        t.groundType = 'dirt';
        t.mesh.material = MATS.dirt;
      }
    }
  }

  worlds.farm = w;
  spawnTreeIn('farm', -8, -2);
  spawnTreeIn('farm', -8, 1);
  spawnTreeIn('farm', 6, -4);
  spawnTreeIn('farm', 8, -6);
  spawnRockIn('farm', -6, -2, 'stone');
  spawnRockIn('farm', 4, -2, 'stone');
  spawnRockIn('farm', 5, -5, 'stone');

  // Pintu masuk ke dalam map baru Gudang Ternak
  w.portals.push({
    x: -5.5,
    y: 3.2,
    radius: 1.6,
    label: '🛖 Masuk ke Dalam Gudang Ternak',
    actionType: 'warp',
    targetScene: 'barn_indoor',
    targetX: 0,
    targetY: -4.5,
    targetDir: 'up'
  });
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
// SCENE 3: VILLAGE (ALUN-ALUN DESA ASRI, BALAI DESA, TOKO BELI & JUAL, NPC, TAMBANG)
// ---------------------------------------------------------
function buildVillageScene() {
  const meta = SCENE_META.village;
  const w = createEmptySceneWorld(meta, (x, y, m) => {
    if (
      Math.abs(y) <= 1 ||
      (Math.abs(x - 6.5) <= 1.2 && y >= 0 && y <= m.halfH) ||
      (x >= -7 && x <= 6 && y >= -2 && y <= 3)
    ) {
      return 'plaza';
    }
    return 'grass';
  });

  addStaticProp(w, getPropTexture('gate_arch'), 2.2, 2.2, -meta.halfW + 0.4, 0.3, -0.5, [], '⬅️ Kembali ke Kebun', '#9de070');

  // 🏛️ BALAI DESA FORHEST (Bangunan Utama di Tengah Alun-Alun Desa Forhest)
  addStaticProp(
    w,
    getTownHallTexture(),
    4.8,
    3.6,
    0,
    4.7,
    3.2,
    [[-2, 4], [-1, 4], [0, 4], [1, 4], [2, 4], [-2, 5], [-1, 5], [0, 5], [1, 5], [2, 5]],
    '🏛️ Balai Desa Forhest',
    '#ffd166'
  );

  // Papan Pengumuman di Samping Tangga Balai Desa
  addStaticProp(
    w,
    getPropTexture('quest_board'),
    1.35,
    1.35,
    3.0,
    3.1,
    2.6,
    [[3, 3]],
    '📋 Papan Desa Forhest',
    '#fff3b0'
  );

  // Toko Pak Blen & Bu Rossi di Sisi Barat Alun-Alun
  addStaticProp(
    w,
    getShopTexture(),
    3.4,
    2.5,
    -6,
    3.6,
    2.6,
    [[-7, 3], [-6, 3], [-5, 3], [-7, 4], [-6, 4], [-5, 4]],
    '🏪 Toko Pak Blen & Bu Rossi',
    '#ffd166'
  );

  // Rumah Warga Forhest di Sisi Barat Daya Alun-Alun
  addStaticProp(
    w,
    getPropTexture('npc_house'),
    3.0,
    3.0,
    -7.5,
    -3.2,
    -4.4,
    [[-8, -3], [-7, -3], [-8, -4], [-7, -4]],
    '🏡 Kediaman Dino',
    '#ffe082'
  );

  // Bengkel Tempa Pak Rol di Sisi Timur Alun-Alun
  addStaticProp(
    w,
    getPropTexture('npc_house'),
    3.0,
    3.0,
    9.0,
    2.8,
    1.6,
    [[8, 2], [9, 2], [10, 2]],
    '⚒️ Bengkel Tempa Pak Rol',
    '#f4a261'
  );

  // Mulut Gua Tambang di Jalur Utara-Timur
  addStaticProp(
    w,
    getPropTexture('cave_entrance'),
    3.8,
    2.8,
    6.5,
    7.6,
    6.4,
    [[5, 8], [6, 8], [7, 8]],
    '⛏️ Mulut Gua Tambang',
    '#ffbe0b'
  );

  worlds.village = w;
  for (const [tx, ty] of [[-10, -5], [-4, -6], [2, -6], [8, -5], [10, 6], [-10, 5]]) {
    spawnTreeIn('village', tx, ty);
  }

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
    x: 0,
    y: 2.8,
    radius: 1.85,
    label: '🏛️ Masuk ke Balai Desa Asri',
    actionType: 'warp',
    targetScene: 'town_hall',
    targetX: 0,
    targetY: -SCENE_META.town_hall.halfH + 1.8,
    targetDir: 'up'
  });
  w.portals.push({
    x: 3.0,
    y: 2.3,
    radius: 1.5,
    label: '📋 Baca Papan Informasi Desa',
    actionType: 'village_board'
  });
  w.portals.push({
    x: 6.5,
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
    x: -6,
    y: 2.1,
    radius: 1.7,
    label: '🏪 Buka Toko Pak Budi (Beli/Jual)',
    actionType: 'shop_direct'
  });
}

// ---------------------------------------------------------
// SCENE 3B: TOWN HALL (DALAM BALAI DESA ASRI)
// ---------------------------------------------------------
function buildTownHallScene() {
  const meta = SCENE_META.town_hall;
  const w = createEmptySceneWorld(meta, (x, y, m) => {
    if (Math.abs(x) === m.halfW || y === m.halfH || (y === -m.halfH && Math.abs(x) > 1)) {
      return 'wall_indoor';
    }
    return 'wood_floor';
  });

  const rug = createSpritePlane(getPropTexture('rug'), 4.4, 3.0);
  rug.position.set(0, -0.2, 0.05);
  rug.renderOrder = 3;
  w.group.add(rug);

  const mat = createSpritePlane(getPropTexture('door_mat'), 2.0, 0.95);
  mat.position.set(0, -4.4, 0.06);
  mat.renderOrder = 4;
  w.group.add(mat);
  const exitLbl = createLabel2D('🚪 Pintu Keluar ke Alun-Alun Desa', '#ffd166');
  exitLbl.position.set(0, -4.9, 11);
  w.group.add(exitLbl);

  // Meja Pelayanan Utama Balai Desa
  addStaticProp(
    w,
    getPropTexture('hall_desk'),
    3.4,
    1.7,
    0,
    3.2,
    2.7,
    [[-1, 3], [0, 3], [1, 3]],
    '🏛️ Meja Pelayanan Balai Desa',
    '#ffd166'
  );

  // Papan Arsip & Statistik Desa di Kiri
  addStaticProp(
    w,
    getPropTexture('quest_board'),
    1.5,
    1.5,
    -4.5,
    2.8,
    2.3,
    [[-5, 3], [-4, 3]],
    '📋 Arsip & Info Desa',
    '#90e0ef'
  );

  // Meja Koleksi & Gotong Royong Desa di Kanan
  addStaticProp(
    w,
    getPropTexture('bundle_table'),
    2.2,
    1.9,
    4.3,
    2.7,
    2.1,
    [[4, 3], [5, 3]],
    '📦 Gotong Royong Desa',
    '#9de070'
  );

  w.portals.push({
    x: 0,
    y: -4.2,
    radius: 1.65,
    label: '🚪 Keluar ke Alun-Alun Desa Forhest',
    actionType: 'warp',
    targetScene: 'village',
    targetX: 0,
    targetY: 2.4,
    targetDir: 'down'
  });
  w.portals.push({
    x: -4.5,
    y: 1.9,
    radius: 1.65,
    label: '📋 Baca Informasi & Status Desa Forhest',
    actionType: 'village_board'
  });
  w.portals.push({
    x: 4.3,
    y: 1.8,
    radius: 1.75,
    label: '📦 Buka Program Gotong Royong Desa',
    actionType: 'village_bundles'
  });

  worlds.town_hall = w;
}

// ---------------------------------------------------------
// SCENE 4: FOREST & BEACH
// ---------------------------------------------------------
function buildForestBeachScene() {
  const meta = SCENE_META.forest_beach;
  const w = createEmptySceneWorld(meta, (x, y, m) => {
    if (y <= -5) return 'water';
    if (y <= -2) return 'sand';
    if (x === 0 && y >= -2 && y <= m.halfH) return 'plaza';
    return 'grass';
  });

  addStaticProp(w, getPropTexture('gate_arch'), 2.2, 2.0, 0, meta.halfH - 0.3, meta.halfH - 0.8, [], '⬆️ Kembali ke Kebun', '#9de070');

  // Landmark Lokasi Jatuhnya Benda dari Langit (Sesuai Prolog Dokumen GDocs)
  addStaticProp(
    w,
    getPropTexture('amethyst'),
    1.6,
    1.6,
    5.5,
    3.5,
    2.8,
    [[5, 3], [6, 3]],
    '🔮 Kawah Jatuh Benda Langit',
    '#9d4edd'
  );

  worlds.forest_beach = w;
  populateForestForage(true);

  // Portal interaksi dengan lokasi benda langit
  w.portals.push({
    x: 5.5,
    y: 3.5,
    radius: 1.8,
    label: '🔮 Periksa Lokasi Benda Jatuh dari Langit',
    actionType: 'meteor_crater_site'
  });

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
// SCENE 5: MINE (GUA TAMBANG)
// ---------------------------------------------------------
function buildMineScene() {
  const meta = SCENE_META.mine;
  const w = createEmptySceneWorld(meta, (x, y, m) => {
    if (Math.abs(x) === m.halfW || Math.abs(y) === m.halfH) return 'cave_wall';
    return 'cave_floor';
  });

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
    targetX: 6.5,
    targetY: 5.5,
    targetDir: 'down'
  });
}

// =========================================================
// 5. SPAWNER RESOURCES
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
  if (!w || !t || t.obstacle || t.crop || t.placed || t.forage || t.groundType === 'water') return;
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
      if (Math.abs(x) <= 1 && y >= meta.halfH - 3) continue;
      if (Math.random() < (initial ? 0.36 : 0.25)) {
        const r = Math.random();
        const kind = r > 0.9 ? 'amethyst' : r > 0.72 ? 'gold' : r > 0.38 ? 'copper' : 'stone';
        spawnRockIn('mine', x, y, kind);
      }
    }
  }
}

function populateForestForage(initial = false) {
  const trees = [[-8, 6], [-5, 5], [-8, 2], [-6, 0], [4, 6], [7, 5], [9, 2], [6, 0], [-3, 3], [3, 2]];
  for (const [tx, ty] of trees) {
    if (initial || Math.random() < 0.4) spawnTreeIn('forest_beach', tx, ty);
  }
  for (const [bx, by] of [[-4, 1], [-7, 4], [5, 3], [8, 1]]) {
    if (initial || Math.random() < 0.5) spawnForageIn('forest_beach', bx, by, 'wild_berry', 'berry_bush');
  }
  for (const [sx, sy] of [[-6, -3], [-2, -4], [4, -3], [7, -4]]) {
    if (initial || Math.random() < 0.55) spawnForageIn('forest_beach', sx, sy, 'sea_shell', 'sea_shell');
  }
}

// ---------------------------------------------------------
// SCENE 7: BARN INDOOR (DALAM GUDANG TERNAK SAPI & AYAM)
// ---------------------------------------------------------
function buildBarnIndoorScene() {
  const meta = SCENE_META.barn_indoor;
  const w = createEmptySceneWorld(meta, (x, y, m) => {
    if (Math.abs(x) === m.halfW || y === m.halfH || (y === -m.halfH && Math.abs(x) > 1)) {
      return 'wall_indoor';
    }
    // Sisi kiri (kandang sapi) lantai tanah/jerami 'dirt', sisi lorong & kanan 'wood_floor'
    if (x <= -3 && y >= -4 && y <= 4) {
      return 'dirt';
    }
    return 'wood_floor';
  });

  // Keset pintu masuk/keluar di bawah
  const mat = createSpritePlane(getPropTexture('door_mat'), 2.2, 1.0);
  mat.position.set(0, -5.2, 0.06);
  mat.renderOrder = 4;
  w.group.add(mat);
  const exitLbl = createLabel2D('🚪 Pintu Keluar ke Pekarangan', '#9de070');
  exitLbl.position.set(0, -5.7, 11);
  w.group.add(exitLbl);

  // 1. AREA KIRI: KANDANG SAPI DENGAN PAGAR PEMBATAS
  // Pagar pembatas di x = -2 (dari y = -4 sampai y = 4, dengan celah gerbang di y = -1)
  for (let py = -4; py <= 4; py++) {
    if (py === -1) continue; // Celah gerbang sapi
    const pf = createSpritePlane(getPlacedTexture('fence'), 1.0, 1.0);
    pf.position.set(-2, py + 0.12, 1);
    applyYSort(pf, py - 0.1);
    w.group.add(pf);
    const t = w.tiles.get(tileKey(-2, py));
    if (t) t.obstacle = { kind: 'fence' };
  }
  for (let px = -7; px <= -3; px++) {
    for (const py of [-4, 4]) {
      const pf = createSpritePlane(getPlacedTexture('fence'), 1.0, 1.0);
      pf.position.set(px, py + 0.12, 1);
      applyYSort(pf, py - 0.1);
      w.group.add(pf);
      const t = w.tiles.get(tileKey(px, py));
      if (t) t.obstacle = { kind: 'fence' };
    }
  }

  // Bak Pakan Rumput Sapi di (-5.5, 3.2)
  addStaticProp(w, getPropTexture('feed_trough'), 2.4, 1.2, -5.5, 3.2, 2.8, [[-6, 3], [-5, 3]], '🌾 Bak Pakan Sapi', '#9de070');

  // Bak Air Minum Sapi di (-3.5, 3.2)
  addStaticProp(w, getPropTexture('water_trough'), 2.0, 1.2, -3.5, 3.2, 2.8, [[-4, 3], [-3, 3]], '💧 Bak Air Sapi', '#90e0ef');

  // Tumpukan Jerami Dekorasi di (-6.5, 1.0)
  addStaticProp(w, getPropTexture('hay_bale'), 1.6, 1.4, -6.5, 1.0, 0.6, [[-6, 1]], '🌾 Jerami Sapi', '#ffd166');

  // 2. AREA KANAN: AREA AYAM
  // Deretan 4 Sarang Petelur Ayam di y = 1.2 (x = 3.2, 4.4, 5.6, 6.8)
  const nestPositions = [3.2, 4.4, 5.6, 6.8];
  nestPositions.forEach((nx, nIdx) => {
    addStaticProp(w, getPropTexture('nest_box'), 1.3, 1.3, nx, 1.2, 0.8, [[Math.round(nx), 1]], `🪺 Sarang #${nIdx + 1}`, '#ffd166');
    w.portals.push({
      x: nx,
      y: 0.2,
      radius: 1.2,
      label: `🪺 Kelola Sarang Petelur #${nIdx + 1}`,
      actionType: `nest_box_${nIdx}`,
      nestIndex: nIdx
    });
  });

  // Kandang Ayam Kecil (Tempat Kawin Pejantan & Betina) di ujung kanan atas deretan bak petelur (6.2, 4.2)
  addStaticProp(w, getPropTexture('small_coop'), 2.4, 2.4, 6.2, 4.2, 3.4, [[6, 4], [7, 4]], '🐓 Kandang Kawin Ayam', '#ff595e');

  // Bak Makan dan Minum Ayam di sebelah kiri deretan bak petelur ayam
  addStaticProp(w, getPropTexture('feed_trough'), 1.8, 1.1, 1.8, 2.2, 1.8, [[2, 2]], '🌾 Pakan Ayam', '#ffd166');
  addStaticProp(w, getPropTexture('water_trough'), 1.6, 1.1, 1.8, 0.4, 0.0, [[2, 0]], '💧 Minum Ayam', '#90e0ef');

  // Papan Status & Manajemen Gudang Ternak di (0, -2.8)
  addStaticProp(w, getPropTexture('quest_board'), 1.4, 1.4, 0, -2.8, -3.4, [[0, -3]], '📋 Papan Gudang Ternak', '#ffd166');

  // Portals
  w.portals.push({
    x: 0,
    y: -5.0,
    radius: 1.6,
    label: '🚪 Keluar ke Pekarangan Rumah',
    actionType: 'warp',
    targetScene: 'farm',
    targetX: -5.5,
    targetY: 2.6,
    targetDir: 'down'
  });

  w.portals.push({
    x: -5.5,
    y: 2.2,
    radius: 1.6,
    label: '🌾 Isi Bak Pakan Rumput Sapi',
    actionType: 'cow_feed_trough'
  });

  w.portals.push({
    x: -3.5,
    y: 2.2,
    radius: 1.6,
    label: '💧 Isi Bak Air Minum Sapi',
    actionType: 'cow_water_trough'
  });

  w.portals.push({
    x: 6.2,
    y: 3.2,
    radius: 1.6,
    label: '🐓 Kandang Kawin Ayam (Pejantan)',
    actionType: 'small_coop'
  });

  w.portals.push({
    x: 1.8,
    y: 2.2,
    radius: 1.4,
    label: '🌾 Isi Bak Pakan Ayam',
    actionType: 'chicken_feed_trough'
  });

  w.portals.push({
    x: 1.8,
    y: 0.4,
    radius: 1.4,
    label: '💧 Isi Bak Air Minum Ayam',
    actionType: 'chicken_water_trough'
  });

  w.portals.push({
    x: 0,
    y: -3.8,
    radius: 1.6,
    label: '📋 Status & Manajemen Gudang Ternak',
    actionType: 'barn_board'
  });

  w.portals.push({
    x: -2.0,
    y: -1.0,
    radius: 1.6,
    label: '🛖 Masukkan Sapi/Ayam ke Gudang',
    actionType: 'place_animal_barn'
  });

  worlds.barn_indoor = w;
}

// Inisialisasi seluruh scene & world map game
buildHouseScene();
buildFarmScene();
buildVillageScene();
buildTownHallScene();
buildForestBeachScene();
buildMineScene();
buildBarnIndoorScene();
populateMineRocks(true);
populateForestForage(true);

// =========================================================
// 5B. SISTEM HEWAN TERNAK (AYAM & SAPI LIAR & GUDANG TERNAK)
// =========================================================
const WILD_ANIMAL_DEFS = [
  // Di Alun-Alun Desa Asri
  { id: 'v_chicken_1', scene: 'village', type: 'chicken', name: 'Ayam Liar', homeX: -2, homeY: -4 },
  { id: 'v_cow_1',     scene: 'village', type: 'cow',     name: 'Sapi Liar', homeX: 2,  homeY: -4 },
  // Di Hutan Foraging & Pantai Selatan
  { id: 'f_chicken_1', scene: 'forest_beach', type: 'chicken', name: 'Ayam Hutan', homeX: -5, homeY: 3 },
  { id: 'f_cow_1',     scene: 'forest_beach', type: 'cow',     name: 'Sapi Padang', homeX: 4,  homeY: 1 }
];

function createAnimalEntity(def, isBarnIndoor = false) {
  const g = new THREE.Group();
  const animalType = def.type === 'sheep' ? 'cow' : def.type;
  const frames = buildAnimalFrames(animalType);
  const size = animalType === 'cow' ? 1.45 : 1.05;
  const initialTex = def.isDead ? getPropTexture('animal_carcass') : frames.down[0];
  const sprite = createSpritePlane(initialTex, size, size);
  sprite.position.set(0, size * 0.38, 0);
  g.add(sprite);

  const iconTag = animalType === 'cow' ? '🐄' : '🐔';
  let labelText = `${iconTag} ${def.name}`;
  let labelColor = animalType === 'cow' ? '#bbf7d0' : '#ffd166';

  if (def.isDead) {
    labelText = `🦴 Bangkai (${def.carcassDays || 0}/30h)`;
    labelColor = '#ef4444';
  } else if (def.isSick) {
    labelText = `💊 ${def.name} (Sakit!)`;
    labelColor = '#f59e0b';
  } else if (def.milkReady) {
    labelText = `🥛 ${def.name} (Siap Perah!)`;
    labelColor = '#60a5fa';
  } else if (def.eggReady) {
    labelText = `🥚 ${def.name} (Ada Telur!)`;
    labelColor = '#fde047';
  }

  const label = createLabel2D(labelText, labelColor);
  label.scale.set(0.68, 0.68, 1);
  label.position.set(0, size + 0.22, 5);
  g.add(label);

  g.userData = { frames, sprite, label, animalData: def };
  g.position.set(def.homeX, def.homeY, 1);

  return {
    id: def.id,
    type: animalType,
    name: def.name,
    isFarmPen: isBarnIndoor,
    isBarnIndoor,
    scene: def.scene,
    group: g,
    x: def.homeX,
    y: def.homeY,
    homeX: def.homeX,
    homeY: def.homeY,
    targetX: def.homeX,
    targetY: def.homeY,
    dir: 'down',
    waitTimer: 1 + Math.random() * 2,
    fleeTimer: 0,
    fleeStepsRemaining: 0,
    detectCooldown: 0,
    // Status ternak gudang
    isNesting: Boolean(def.isNesting),
    nestIndex: typeof def.nestIndex === 'number' ? def.nestIndex : -1,
    isMated: Boolean(def.isMated),
    isPregnant: Boolean(def.isPregnant),
    pregnantDays: def.pregnantDays || 0,
    fedToday: Boolean(def.fedToday),
    fedDays: def.fedDays || 0,
    waterToday: Boolean(def.waterToday),
    unfedDays: def.unfedDays || 0,
    isSick: Boolean(def.isSick),
    sickDays: def.sickDays || 0,
    isDead: Boolean(def.isDead),
    carcassDays: def.carcassDays || 0,
    milkReady: Boolean(def.milkReady),
    eggReady: Boolean(def.eggReady)
  };
}

// Inisialisasi Hewan Liar di Desa & Hutan
for (const aDef of WILD_ANIMAL_DEFS) {
  const w = worlds[aDef.scene];
  if (!w) continue;
  const ent = createAnimalEntity(aDef, false);
  w.group.add(ent.group);
  w.animals.push(ent);
}

// Inisialisasi / Sinkronkan Hewan di Dalam Gudang Ternak
function refreshBarnAnimals() {
  const w = worlds.barn_indoor;
  if (!w) return;

  // Hapus mesh hewan lama dari scene gudang ternak
  for (const a of w.animals) {
    w.group.remove(a.group);
  }
  w.animals = [];

  const nestPositions = [3.2, 4.4, 5.6, 6.8];

  // Render ulang hewan ternak yang tersimpan di state.farmAnimals
  state.farmAnimals.forEach((data, idx) => {
    let homeX = data.x;
    let homeY = data.y;

    if (data.type === 'cow' || data.type === 'sheep') {
      data.type = 'cow';
      if (typeof homeX !== 'number' || homeX > -2.5) {
        homeX = -6.0 + (idx % 2) * 2.2;
        homeY = -2.0 + Math.floor(idx / 2) * 1.8;
      }
    } else {
      if (data.isNesting && typeof data.nestIndex === 'number' && data.nestIndex >= 0) {
        homeX = nestPositions[data.nestIndex] || 3.2;
        homeY = 1.2;
      } else if (typeof homeX !== 'number' || homeX < -2.2) {
        homeX = 3.0 + (idx % 3) * 1.2;
        homeY = -2.0 + Math.floor(idx / 3) * 1.2;
      }
    }

    const animalDef = {
      ...data,
      scene: 'barn_indoor',
      homeX,
      homeY
    };

    const ent = createAnimalEntity(animalDef, true);
    ent.x = homeX;
    ent.y = homeY;
    ent.targetX = homeX;
    ent.targetY = homeY;
    w.group.add(ent.group);
    w.animals.push(ent);
  });
}
const refreshFarmPenAnimals = refreshBarnAnimals;
refreshBarnAnimals();

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
// 6. PLAYER SPRITE & SCENE SWITCHER
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

  const fishRigCanvas = document.createElement('canvas');
  fishRigCanvas.width = 96;
  fishRigCanvas.height = 96;
  const fishRigTex = new THREE.CanvasTexture(fishRigCanvas);
  fishRigTex.magFilter = THREE.NearestFilter;
  fishRigTex.minFilter = THREE.NearestFilter;
  fishRigTex.colorSpace = THREE.SRGBColorSpace;
  const fishRigMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.15, 2.15),
    new THREE.MeshBasicMaterial({ map: fishRigTex, transparent: true, depthTest: false })
  );
  fishRigMesh.visible = false;
  fishRigMesh.position.set(0.3, 0.48, 2);
  fishRigMesh.renderOrder = 910;
  group.add(fishRigMesh);

  group.userData = {
    frames,
    sprite,
    label,
    toolCanvas,
    toolTex,
    toolMesh,
    fishRigCanvas,
    fishRigTex,
    fishRigMesh
  };
  return group;
}

const playerGroup = createPlayer2D();
scene.add(playerGroup);

// Objek Visual Memancing di Dunia (Pelampung Umpan, Senar Kail, Indikator Strike, & Ikan Melompat)
const bobberCanvas = document.createElement('canvas');
bobberCanvas.width = 32;
bobberCanvas.height = 32;
const bobberTex = new THREE.CanvasTexture(bobberCanvas);
bobberTex.magFilter = THREE.NearestFilter;
bobberTex.minFilter = THREE.NearestFilter;
bobberTex.colorSpace = THREE.SRGBColorSpace;
const bobberMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(0.7, 0.7),
  new THREE.MeshBasicMaterial({ map: bobberTex, transparent: true, depthTest: false })
);
bobberMesh.visible = false;
bobberMesh.renderOrder = 895;
scene.add(bobberMesh);

const FISH_LINE_SEGMENTS = 16;
const fishLinePositions = new Float32Array((FISH_LINE_SEGMENTS + 1) * 3);
const fishLineGeo = new THREE.BufferGeometry();
fishLineGeo.setAttribute('position', new THREE.BufferAttribute(fishLinePositions, 3));
const fishingLine = new THREE.Line(
  fishLineGeo,
  new THREE.LineBasicMaterial({ color: 0xf8f9fa, transparent: true, opacity: 0.9, depthTest: false })
);
fishingLine.visible = false;
fishingLine.frustumCulled = false;
fishingLine.renderOrder = 892;
scene.add(fishingLine);

const strikeSprite = createLabel2D('❗ IKAN MENYAMBAR! KLIK!', '#ff595e');
strikeSprite.scale.set(0.85, 0.85, 1);
strikeSprite.visible = false;
strikeSprite.renderOrder = 960;
scene.add(strikeSprite);

const leapFishCanvas = document.createElement('canvas');
leapFishCanvas.width = 64;
leapFishCanvas.height = 64;
const leapFishTex = new THREE.CanvasTexture(leapFishCanvas);
leapFishTex.colorSpace = THREE.SRGBColorSpace;
const leapFishMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(0.85, 0.85),
  new THREE.MeshBasicMaterial({ map: leapFishTex, transparent: true, depthTest: false })
);
leapFishMesh.visible = false;
leapFishMesh.renderOrder = 935;
scene.add(leapFishMesh);

const fishingState = {
  mode: 'idle', // 'idle' | 'charging' | 'casting' | 'waiting' | 'reeling' | 'caught'
  chargeTime: 0,
  spinAngle: 0,
  castTimer: 0,
  castDuration: 0.3,
  dryCast: false,
  startX: 0,
  startY: 0,
  targetX: 0,
  targetY: 0,
  bobberX: 0,
  bobberY: 0,
  bobberZHeight: 0,
  waitTimer: 0, // Tepat 2.0 detik menunggu ikan menyambar
  reelProgress: 0,
  reelTimeout: 0,
  crankAngle: 0,
  crankBoostTimer: 0,
  rodPump: 0,
  splashCooldown: 0,
  caughtFishId: 'fish_carp',
  caughtTimer: 0,
  rodTipWorldX: 0,
  rodTipWorldY: 0
};

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
  cancelFishing();
  if (activeWorldGroup) scene.remove(activeWorldGroup);
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

  if (sceneId === 'barn_indoor') {
    refreshBarnAnimals();
  }

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
  }, 240);
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
// 7. MANAJEMEN PERGANTIAN FASE ZONA WAKTU (5 MENIT / SELESAI QUEST NPC)
// =========================================================
function advanceToNextTimePhase(reasonMsg = '') {
  if (state.phaseIndex < 3) {
    state.phaseIndex += 1;
    state.phaseElapsedSec = 0;
    const newPhase = TIME_PHASES[state.phaseIndex];
    updateHUD();

    if (state.phaseIndex === 3) {
      cancelFishing();
      closeAllModals();
      showToast('🌌 Waktu mencapai Tengah Malam (00:00)! Segera pulang ke Rumah & tidur di Kasur.');
    } else {
      showToast(reasonMsg || `⏰ Zona waktu berganti menjadi ${newPhase.label}!`);
    }
  }
}

// =========================================================
// 8. PARTIKEL, INVENTORY & HELPER
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
  setTimeout(() => el.remove(), 3100);
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
        updateQuestTrackerUI();
        return true;
      }
    }
  }
  for (let i = 0; i < state.slots.length; i++) {
    if (!state.slots[i]) {
      state.slots[i] = { id: itemId, qty };
      renderHotbar();
      updateQuestTrackerUI();
      return true;
    }
  }
  showToast('⚠️ Tas penuh! Jual barang ke Toko Pak Budi di Desa.');
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
  updateQuestTrackerUI();
  return rem === 0;
}

function triggerActiveWork(durationSec = 1.0) {
  state.player.workActivityTimer = Math.max(state.player.workActivityTimer, durationSec);
}

function consumeEnergy(amount) {
  if (state.energy < amount) {
    showToast('🥵 Stamina habis (0%)! Makan masakan/hasil panen atau pulang tidur di Kasur Rumah.');
    return false;
  }
  state.energy = Math.max(0, state.energy - amount);
  triggerActiveWork(1.0);
  updateHUD();
  return true;
}

// =========================================================
// 9. AKSI ALAT & PENGECEKAN BATAS TENGAH MALAM (00:00)
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
  if (isMidnight()) {
    showToast('🌌 Sudah Tengah Malam! Pulanglah ke Rumah dan tidur di Kasur.');
    return true;
  }
  const w = worlds[tile.sceneId];

  if (tile.forage) {
    const itemDef = ITEMS[tile.forage.itemId];
    if (addItem(tile.forage.itemId, 1)) {
      state.energy = Math.max(0, state.energy - 0.3);
      triggerActiveWork(1.0);
      w.group.remove(tile.forage.mesh);
      tile.forage = null;
      spawnBurst2D(tile.x, tile.y, 0x9d4edd, 7);
      showToast(`🌿 Memungut +1 ${itemDef.name}!`);
      updateHUD();
      return true;
    }
  }

  if (tile.crop) {
    const cropDef = CROPS[tile.crop.id];
    if (tile.crop.age >= cropDef.daysToGrow) {
      state.energy = Math.max(0, state.energy - 0.4);
      triggerActiveWork(1.0);
      addItem(cropDef.harvestItem, 1);
      spawnBurst2D(tile.x, tile.y, cropDef.color, 9);
      showToast(`🧺 Panen +1 ${ITEMS[cropDef.harvestItem].name}!`);
      tile.crop = null;
      refreshTileVisual(tile);
      updateHUD();
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

// =========================================================
// 9B. SISTEM MEMANCING INTERAKTIF:
//     1) Klik Tahan -> Player memutar-mutar joran sebelah tangan
//     2) Lepas Klik -> Umpan terlempar ke depan sesuai arah pandangan
//     3) Tunggu 2 Detik -> Ikan menyambar (Strike!)
//     4) Klik Berkali-kali -> Efek player menggulung kail -> Ikan tertangkap!
// =========================================================
function isFishingActive() {
  return fishingState.mode !== 'idle';
}

function isFishingRodSelected() {
  const slot = state.slots[state.activeSlot];
  return Boolean(slot && ITEMS[slot.id] && ITEMS[slot.id].toolType === 'rod');
}

function updateFishingHudUI() {
  const hud = document.getElementById('fishing-hud');
  const titleEl = document.getElementById('fishing-hud-title');
  const fillEl = document.getElementById('fishing-bar-fill');
  const subEl = document.getElementById('fishing-hud-sub');
  if (!hud) return;

  if (fishingState.mode === 'idle' || fishingState.mode === 'caught') {
    hud.classList.add('hidden');
    hud.classList.remove('strike');
    return;
  }

  hud.classList.remove('hidden');
  if (fishingState.mode === 'charging') {
    hud.classList.remove('strike');
    const pct = Math.min(100, Math.round((fishingState.chargeTime / 0.85) * 100));
    titleEl.textContent = '🌀 Memutar Joran Sebelah Tangan...';
    fillEl.style.width = `${pct}%`;
    fillEl.style.background = 'linear-gradient(90deg, #ffd166, #80ed99)';
    subEl.textContent = 'Lepas klik untuk melempar umpan ke depan sesuai pandangan!';
  } else if (fishingState.mode === 'casting') {
    hud.classList.remove('strike');
    titleEl.textContent = '🎣 Melempar Umpan ke Depan...';
    fillEl.style.width = '100%';
    fillEl.style.background = 'linear-gradient(90deg, #4cc9f0, #90e0ef)';
    subEl.textContent = 'Umpan melayang ke arah pandanganmu...';
  } else if (fishingState.mode === 'waiting') {
    hud.classList.remove('strike');
    const ratio = Math.max(0, Math.min(1, (2.0 - fishingState.waitTimer) / 2.0));
    titleEl.textContent = '🌊 Umpan Mengapung di Air...';
    fillEl.style.width = `${Math.round(ratio * 100)}%`;
    fillEl.style.background = 'linear-gradient(90deg, #48cae4, #ade8f4)';
    subEl.textContent = 'Tunggu sebentar hingga ikan menyambar kail!';
  } else if (fishingState.mode === 'reeling') {
    hud.classList.add('strike');
    const pct = Math.max(0, Math.min(100, Math.round(fishingState.reelProgress * 100)));
    titleEl.textContent = '🐟 IKAN MENYAMBAR! KLIK MOUSE BERKALI-KALI!';
    fillEl.style.width = `${pct}%`;
    fillEl.style.background = 'linear-gradient(90deg, #ff595e, #ffca3a, #8ac926)';
    subEl.textContent = `Menggulung Kail: ${pct}% — Terus klik cepat sampai terangkat!`;
  }
}

function cancelFishing() {
  fishingState.mode = 'idle';
  fishingState.chargeTime = 0;
  fishingState.reelProgress = 0;
  fishingState.crankBoostTimer = 0;
  fishingState.rodPump = 0;

  if (playerGroup?.userData) {
    playerGroup.userData.fishRigMesh.visible = false;
    playerGroup.userData.sprite.position.set(0, 0.45, 0);
  }
  bobberMesh.visible = false;
  fishingLine.visible = false;
  strikeSprite.visible = false;
  leapFishMesh.visible = false;
  updateFishingHudUI();
}

function startFishingCharge() {
  if (isMidnight()) {
    showToast('🌌 Sudah Tengah Malam (00:00)! Pulanglah ke Rumah & tidur di Kasur.');
    return;
  }
  if (state.energy < 2.0) {
    showToast('🥵 Stamina tidak cukup untuk memancing! Makan makanan atau tidur dulu.');
    return;
  }
  if (fishingState.mode !== 'idle') return;

  resetMovementInputs();
  playerGroup.userData.toolMesh.visible = false;
  state.player.swingTimer = 0;

  fishingState.mode = 'charging';
  fishingState.chargeTime = 0;
  fishingState.spinAngle = 0;
  triggerActiveWork(0.5);
  updateFishingHudUI();
}

function releaseFishingCast() {
  if (fishingState.mode !== 'charging') return;

  const px = state.player.x;
  const py = state.player.y;
  const fx = state.player.facingX;
  const fy = state.player.facingY;
  const power = Math.min(1, fishingState.chargeTime / 0.85);

  // Cari petak air di depan sesuai arah pandangan (jarak 1..4 petak di depan karakter)
  const distOrder = power >= 0.5 ? [3, 2, 1, 4] : [2, 3, 1, 4];
  let waterTile = null;
  for (const d of distOrder) {
    const cand = getTile(Math.round(px + fx * d), Math.round(py + fy * d));
    if (cand && cand.groundType === 'water') {
      waterTile = cand;
      break;
    }
  }

  const handSideX = state.player.dir === 'left' ? -0.32 : 0.32;
  fishingState.startX = px + handSideX + fx * 0.45;
  fishingState.startY = py + 0.65 + fy * 0.35;

  if (waterTile) {
    if (!consumeEnergy(2.0)) {
      cancelFishing();
      return;
    }
    fishingState.dryCast = false;
    fishingState.targetX = waterTile.x;
    fishingState.targetY = waterTile.y;
  } else {
    // Tetap lempar umpan ke depan sesuai pandangan agar efek lemparan terlihat jelas walau belum menghadap air
    const meta = SCENE_META[state.currentScene];
    const landDist = 1.6 + power * 0.9;
    fishingState.dryCast = true;
    fishingState.targetX = Math.max(-meta.halfW + 0.6, Math.min(meta.halfW - 0.6, px + fx * landDist));
    fishingState.targetY = Math.max(-meta.halfH + 0.6, Math.min(meta.halfH - 0.6, py + fy * landDist));
  }

  fishingState.mode = 'casting';
  fishingState.castTimer = 0;
  fishingState.castDuration = 0.3;
  fishingState.bobberX = fishingState.startX;
  fishingState.bobberY = fishingState.startY;
  fishingState.bobberZHeight = 0.55;
  updateFishingHudUI();
}

function handleFishingReelClick() {
  if (fishingState.mode !== 'reeling') return;

  triggerActiveWork(0.75);
  fishingState.reelProgress = Math.min(1.0, fishingState.reelProgress + 0.165);
  fishingState.crankBoostTimer = 0.3;
  fishingState.crankAngle += 2.1;
  fishingState.rodPump = 1.0;

  spawnBurst2D(fishingState.bobberX, fishingState.bobberY, 0x90e0ef, 5);

  if (fishingState.reelProgress >= 1.0) {
    const isSea = state.currentScene === 'forest_beach';
    fishingState.caughtFishId = isSea && Math.random() < 0.45 ? 'fish_snapper' : 'fish_carp';

    // Gambar ikan yang melompat dari air menuju tangan player
    const lctx = leapFishCanvas.getContext('2d');
    lctx.clearRect(0, 0, 64, 64);
    lctx.font = '46px Segoe UI Emoji, sans-serif';
    lctx.textAlign = 'center';
    lctx.textBaseline = 'middle';
    lctx.fillText(ITEMS[fishingState.caughtFishId].icon, 32, 34);
    leapFishTex.needsUpdate = true;

    fishingState.mode = 'caught';
    fishingState.caughtTimer = 0;
    fishingState.startX = fishingState.bobberX;
    fishingState.startY = fishingState.bobberY;

    bobberMesh.visible = false;
    fishingLine.visible = false;
    strikeSprite.visible = false;
    leapFishMesh.visible = true;
    spawnBurst2D(fishingState.bobberX, fishingState.bobberY, 0x72efdd, 11);
  }
  updateFishingHudUI();
}

function drawBobberCanvas(mode, elapsed) {
  const ctx = bobberCanvas.getContext('2d');
  ctx.clearRect(0, 0, 32, 32);

  // Riak air bundar saat mengapung / ditarik ikan
  if (mode === 'waiting' || mode === 'reeling') {
    const r = mode === 'reeling' ? 8 + ((elapsed * 18) % 7) : 7 + Math.sin(elapsed * 4) * 2.5;
    ctx.strokeStyle = mode === 'reeling' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(173, 232, 244, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(16, 20, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Pelampung pancing pixel-art merah-putih
  const jitterX = mode === 'reeling' ? Math.round(Math.sin(elapsed * 42) * 2) : 0;
  const jitterY = mode === 'reeling' ? Math.round(Math.cos(elapsed * 35) * 2) : 0;
  ctx.fillStyle = '#222222';
  ctx.fillRect(15 + jitterX, 6 + jitterY, 2, 4);
  ctx.fillStyle = '#e63946';
  ctx.fillRect(12 + jitterX, 10 + jitterY, 8, 5);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(12 + jitterX, 15 + jitterY, 8, 4);
}

function updateFishingLineGeometry(x0, y0, x1, y1, sagAmount, vibrateAmt, elapsed) {
  for (let i = 0; i <= FISH_LINE_SEGMENTS; i++) {
    const t = i / FISH_LINE_SEGMENTS;
    let lx = x0 + (x1 - x0) * t;
    let ly = y0 + (y1 - y0) * t;
    // Lengkungan gravitasi senar (atau getaran saat menggulung kail)
    const parabola = Math.sin(t * Math.PI);
    ly -= parabola * sagAmount;
    if (vibrateAmt > 0) {
      const vib = Math.sin(elapsed * 58 + i * 1.7) * vibrateAmt * parabola;
      lx += vib;
      ly += vib * 0.6;
    }
    fishLinePositions[i * 3] = lx;
    fishLinePositions[i * 3 + 1] = ly;
    fishLinePositions[i * 3 + 2] = 10.5;
  }
  fishLineGeo.attributes.position.needsUpdate = true;
}

function updateAndRenderFishing(dt, elapsed) {
  if (fishingState.mode === 'idle') return;

  const pData = playerGroup.userData;
  const rigMesh = pData.fishRigMesh;
  const rigCanvas = pData.fishRigCanvas;
  const rigCtx = rigCanvas.getContext('2d');
  const dir = state.player.dir;
  const fx = state.player.facingX;
  const fy = state.player.facingY;

  // Posisi bahu/tangan sebelah (satu tangan di sisi badan karakter)
  const handLocalX = dir === 'left' ? -0.28 : 0.28;
  const handLocalY = dir === 'up' ? 0.56 : 0.48;
  rigMesh.position.set(handLocalX, handLocalY, 2.2);
  rigMesh.visible = true;
  rigCtx.clearRect(0, 0, 96, 96);

  const cx = 48;
  const cy = 48;
  const pxScale = 96 / 2.15; // piksel per unit dunia pada kanvas rig

  // 1) FASE CHARGING: Klik Tahan -> Memutar-mutar Joran Sebelah Tangan
  if (fishingState.mode === 'charging') {
    fishingState.chargeTime += dt;
    fishingState.spinAngle += dt * 16.5;
    triggerActiveWork(0.25);

    const ang = fishingState.spinAngle;
    // Efek putaran angin melingkar pada joran sebelah tangan
    rigCtx.save();
    rigCtx.lineCap = 'round';
    rigCtx.strokeStyle = 'rgba(255, 243, 176, 0.78)';
    rigCtx.lineWidth = 4;
    rigCtx.beginPath();
    rigCtx.arc(cx, cy, 34, ang - 1.9, ang - 0.08);
    rigCtx.stroke();

    rigCtx.strokeStyle = 'rgba(144, 224, 239, 0.65)';
    rigCtx.lineWidth = 2.5;
    rigCtx.beginPath();
    rigCtx.arc(cx, cy, 23, ang - 1.5, ang - 0.1);
    rigCtx.stroke();

    // Lengan & Tangan Sebelah yang Memegang Pangkal Joran
    rigCtx.fillStyle = state.player.appearance.shirt;
    rigCtx.fillRect(cx - 5, cy - 4, 9, 8);
    rigCtx.fillStyle = state.player.appearance.skin;
    rigCtx.fillRect(cx - 3, cy - 3, 6, 6);

    // Batang Joran Bambu Berputar 360 Derajat
    const tipX = cx + Math.cos(ang) * 35;
    const tipY = cy - Math.sin(ang) * 35;
    rigCtx.strokeStyle = '#582f0e';
    rigCtx.lineWidth = 5;
    rigCtx.beginPath();
    rigCtx.moveTo(cx, cy);
    rigCtx.lineTo(cx + Math.cos(ang) * 10, cy - Math.sin(ang) * 10);
    rigCtx.stroke();

    rigCtx.strokeStyle = '#d4a373';
    rigCtx.lineWidth = 3.2;
    rigCtx.beginPath();
    rigCtx.moveTo(cx + Math.cos(ang) * 8, cy - Math.sin(ang) * 8);
    rigCtx.lineTo(tipX, tipY);
    rigCtx.stroke();

    // Umpan Merah-Putih ikut Terayun di Ujung Joran
    const baitX = tipX + Math.cos(ang - 0.45) * 7;
    const baitY = tipY - Math.sin(ang - 0.45) * 7;
    rigCtx.strokeStyle = '#ffffff';
    rigCtx.lineWidth = 1.2;
    rigCtx.beginPath();
    rigCtx.moveTo(tipX, tipY);
    rigCtx.lineTo(baitX, baitY);
    rigCtx.stroke();
    rigCtx.fillStyle = '#e63946';
    rigCtx.fillRect(baitX - 2.5, baitY - 2.5, 5, 3);
    rigCtx.fillStyle = '#ffffff';
    rigCtx.fillRect(baitX - 2.5, baitY + 0.5, 5, 2.5);
    rigCtx.restore();

    pData.fishRigTex.needsUpdate = true;
    pData.sprite.position.set(0, 0.45 + Math.sin(ang) * 0.025, 0);
    bobberMesh.visible = false;
    fishingLine.visible = false;
    strikeSprite.visible = false;
    updateFishingHudUI();
    return;
  }

  // Hitung arah visual joran saat terlempar ke depan sesuai arah pandangan (left / right / up / down)
  let aimDx = fx * 32;
  let aimDy = -fy * 28 - 10; // sedikit terangkat di layar (kanvas Y negatif = ke atas)
  if (dir === 'down') {
    aimDx = 12;
    aimDy = 26;
  } else if (dir === 'up') {
    aimDx = 10;
    aimDy = -32;
  }

  // Efek pompa tarikan joran saat menggulung kail
  if (fishingState.rodPump > 0) {
    fishingState.rodPump = Math.max(0, fishingState.rodPump - dt * 4.5);
  }
  const pumpLift = fishingState.rodPump * 7;
  const rodTipCanvasX = cx + aimDx;
  const rodTipCanvasY = cy + aimDy - pumpLift;

  // Gambar Lengan Satu Tangan + Joran (+ Efek Menggulung Kail saat 'reeling')
  rigCtx.save();
  rigCtx.lineCap = 'round';
  rigCtx.fillStyle = state.player.appearance.shirt;
  rigCtx.fillRect(cx - 5, cy - 4, 9, 8);
  rigCtx.fillStyle = state.player.appearance.skin;
  rigCtx.fillRect(cx - 3, cy - 3, 6, 6);

  if (fishingState.mode === 'reeling') {
    // Joran melengkung kuat menahan tarikan ikan!
    const ctrlX = cx + aimDx * 0.45;
    const ctrlY = cy + aimDy * 0.2 - 14 - pumpLift;
    rigCtx.strokeStyle = '#7f4f24';
    rigCtx.lineWidth = 4.5;
    rigCtx.beginPath();
    rigCtx.moveTo(cx, cy);
    rigCtx.quadraticCurveTo(ctrlX, ctrlY, rodTipCanvasX, rodTipCanvasY);
    rigCtx.stroke();

    rigCtx.strokeStyle = '#e9c46a';
    rigCtx.lineWidth = 2.5;
    rigCtx.beginPath();
    rigCtx.moveTo(cx + aimDx * 0.15, cy + aimDy * 0.15);
    rigCtx.quadraticCurveTo(ctrlX, ctrlY, rodTipCanvasX, rodTipCanvasY);
    rigCtx.stroke();

    // Gulungan Kail (Reel Drum) & Tangan Kedua Memutar Engkol Cepat!
    const reelCx = cx + aimDx * 0.24;
    const reelCy = cy + aimDy * 0.2 + 3;
    if (fishingState.crankBoostTimer > 0) {
      fishingState.crankBoostTimer = Math.max(0, fishingState.crankBoostTimer - dt);
      fishingState.crankAngle += dt * 28;
    } else {
      fishingState.crankAngle += dt * 7;
    }

    // Garis putaran cepat engkol gulungan kail
    rigCtx.strokeStyle =
      fishingState.crankBoostTimer > 0 ? 'rgba(255, 209, 102, 0.92)' : 'rgba(255, 255, 255, 0.45)';
    rigCtx.lineWidth = 2.2;
    rigCtx.beginPath();
    rigCtx.arc(reelCx, reelCy, 9.5, fishingState.crankAngle - 2.1, fishingState.crankAngle);
    rigCtx.stroke();

    // Rumah gulungan kail perak-emas
    rigCtx.fillStyle = '#495057';
    rigCtx.beginPath();
    rigCtx.arc(reelCx, reelCy, 5.5, 0, Math.PI * 2);
    rigCtx.fill();
    rigCtx.fillStyle = '#ffd166';
    rigCtx.beginPath();
    rigCtx.arc(reelCx, reelCy, 2.5, 0, Math.PI * 2);
    rigCtx.fill();

    // Gagang engkol + tangan player yang memutar gulungan kail
    const handleX = reelCx + Math.cos(fishingState.crankAngle) * 8.5;
    const handleY = reelCy - Math.sin(fishingState.crankAngle) * 8.5;
    rigCtx.strokeStyle = '#dee2e6';
    rigCtx.lineWidth = 2;
    rigCtx.beginPath();
    rigCtx.moveTo(reelCx, reelCy);
    rigCtx.lineTo(handleX, handleY);
    rigCtx.stroke();
    rigCtx.fillStyle = state.player.appearance.skin;
    rigCtx.fillRect(handleX - 2.5, handleY - 2.5, 5, 5);

    // Efek badan karakter sedikit condong ke belakang menahan & menggulung kail
    pData.sprite.position.set(
      -fx * (0.05 + fishingState.rodPump * 0.05),
      0.45 + fishingState.rodPump * 0.04,
      0
    );
  } else {
    // Joran lurus terarah ke depan saat melempar / menunggu 2 detik / menangkap
    rigCtx.strokeStyle = '#582f0e';
    rigCtx.lineWidth = 4.5;
    rigCtx.beginPath();
    rigCtx.moveTo(cx, cy);
    rigCtx.lineTo(cx + aimDx * 0.28, cy + aimDy * 0.28);
    rigCtx.stroke();

    rigCtx.strokeStyle = '#d4a373';
    rigCtx.lineWidth = 3;
    rigCtx.beginPath();
    rigCtx.moveTo(cx + aimDx * 0.22, cy + aimDy * 0.22);
    rigCtx.lineTo(rodTipCanvasX, rodTipCanvasY);
    rigCtx.stroke();
    pData.sprite.position.set(0, 0.45, 0);
  }
  rigCtx.restore();
  pData.fishRigTex.needsUpdate = true;

  // Konversi titik ujung joran pada kanvas ke koordinat dunia 2D untuk pangkal senar pancing
  const tipWorldX = state.player.x + handLocalX + (rodTipCanvasX - cx) / pxScale;
  const tipWorldY = state.player.y + handLocalY - (rodTipCanvasY - cy) / pxScale;
  fishingState.rodTipWorldX = tipWorldX;
  fishingState.rodTipWorldY = tipWorldY;

  // 2) FASE CASTING: Umpan Melayang ke Depan Sesuai Arah Pandangan
  if (fishingState.mode === 'casting') {
    fishingState.castTimer += dt;
    const t = Math.min(1, fishingState.castTimer / fishingState.castDuration);
    const arcLift = Math.sin(t * Math.PI) * 1.25;
    fishingState.bobberX = fishingState.startX + (fishingState.targetX - fishingState.startX) * t;
    fishingState.bobberY = fishingState.startY + (fishingState.targetY - fishingState.startY) * t + arcLift;

    drawBobberCanvas('casting', elapsed);
    bobberTex.needsUpdate = true;
    bobberMesh.visible = true;
    bobberMesh.position.set(fishingState.bobberX, fishingState.bobberY, 9.5);

    fishingLine.visible = true;
    updateFishingLineGeometry(tipWorldX, tipWorldY, fishingState.bobberX, fishingState.bobberY + 0.08, 0.12, 0, elapsed);

    if (t >= 1) {
      if (fishingState.dryCast) {
        spawnBurst2D(fishingState.targetX, fishingState.targetY, 0xddb892, 5);
        showToast('🎣 Umpan jatuh di darat! Hadapkan pandangan ke arah Air (Kolam / Laut Pantai) lalu klik tahan.');
        cancelFishing();
        return;
      }
      // Masuk air -> Tunggu tepat 2.0 detik hingga ikan menyambar!
      spawnBurst2D(fishingState.targetX, fishingState.targetY, 0x90e0ef, 8);
      fishingState.mode = 'waiting';
      fishingState.waitTimer = 2.0;
      fishingState.bobberX = fishingState.targetX;
      fishingState.bobberY = fishingState.targetY;
      updateFishingHudUI();
    }
    return;
  }

  // 3) FASE WAITING: Tepat 2.0 Detik Menunggu Ikan Menyambar
  if (fishingState.mode === 'waiting') {
    fishingState.waitTimer -= dt;
    triggerActiveWork(0.2);

    const bobOffset = Math.sin(elapsed * 5.2) * 0.05;
    drawBobberCanvas('waiting', elapsed);
    bobberTex.needsUpdate = true;
    bobberMesh.visible = true;
    bobberMesh.position.set(fishingState.targetX, fishingState.targetY + bobOffset, 9.5);

    fishingLine.visible = true;
    updateFishingLineGeometry(
      tipWorldX,
      tipWorldY,
      fishingState.targetX,
      fishingState.targetY + bobOffset + 0.08,
      0.24,
      0,
      elapsed
    );
    updateFishingHudUI();

    if (fishingState.waitTimer <= 0) {
      // STRIKE! Ikan menyambar setelah 2 detik!
      fishingState.mode = 'reeling';
      fishingState.reelProgress = 0.14;
      fishingState.reelTimeout = 6.5;
      fishingState.crankAngle = 0;
      fishingState.crankBoostTimer = 0.2;
      spawnBurst2D(fishingState.targetX, fishingState.targetY, 0x4cc9f0, 10);
      showToast('❗ Ikan menyambar kail! Klik mouse berkali-kali untuk menggulung kail!');
      updateFishingHudUI();
    }
    return;
  }

  // 4) FASE REELING: Ikan Tersambar -> Klik Berkali-kali Menggulung Kail
  if (fishingState.mode === 'reeling') {
    triggerActiveWork(0.25);
    fishingState.reelTimeout -= dt;
    // Tarikan perlawanan ringan dari ikan agar terasa hidup
    fishingState.reelProgress = Math.max(0.02, fishingState.reelProgress - dt * 0.045);

    if (fishingState.reelTimeout <= 0) {
      showToast('💦 Ikan berhasil melepaskan diri karena terlambat digulung!');
      cancelFishing();
      return;
    }

    // Pelampung tertarik makin dekat ke player seiring progres menggulung kail
    const pullRatio = fishingState.reelProgress * 0.68;
    const shoreStopX = state.player.x + fx * 0.95;
    const shoreStopY = state.player.y + fy * 0.95;
    fishingState.bobberX = fishingState.targetX + (shoreStopX - fishingState.targetX) * pullRatio;
    fishingState.bobberY = fishingState.targetY + (shoreStopY - fishingState.targetY) * pullRatio;

    fishingState.splashCooldown -= dt;
    if (fishingState.splashCooldown <= 0) {
      fishingState.splashCooldown = 0.24;
      spawnBurst2D(fishingState.bobberX, fishingState.bobberY, 0xade8f4, 3);
    }

    drawBobberCanvas('reeling', elapsed);
    bobberTex.needsUpdate = true;
    bobberMesh.visible = true;
    bobberMesh.position.set(fishingState.bobberX, fishingState.bobberY, 9.5);

    strikeSprite.visible = true;
    strikeSprite.position.set(
      fishingState.bobberX,
      fishingState.bobberY + 0.62 + Math.abs(Math.sin(elapsed * 12)) * 0.14,
      12
    );

    fishingLine.visible = true;
    updateFishingLineGeometry(
      tipWorldX,
      tipWorldY,
      fishingState.bobberX,
      fishingState.bobberY + 0.08,
      0.02,
      0.035,
      elapsed
    );
    updateFishingHudUI();
    return;
  }

  // 5) FASE CAUGHT: Ikan Terangkat Melompat ke Tangan Player -> Masuk Tas!
  if (fishingState.mode === 'caught') {
    fishingState.caughtTimer += dt;
    const t = Math.min(1, fishingState.caughtTimer / 0.45);
    const arc = Math.sin(t * Math.PI) * 1.35;
    const destX = state.player.x;
    const destY = state.player.y + 0.68;
    leapFishMesh.position.set(
      fishingState.startX + (destX - fishingState.startX) * t,
      fishingState.startY + (destY - fishingState.startY) * t + arc,
      11.5
    );
    leapFishMesh.rotation.z = t * Math.PI * 2;

    if (t >= 1) {
      const fishId = fishingState.caughtFishId;
      addItem(fishId, 1);
      spawnBurst2D(state.player.x, state.player.y + 0.5, 0xffd166, 10);
      showToast(`🎣 Berhasil menggulung kail & menangkap +1 ${ITEMS[fishId].name}!`);
      cancelFishing();
    }
  }
}

function useActiveItemOnTile(tx, ty) {
  // Saat Tengah Malam (00:00): karakter tidak bisa melakukan aksi apa pun selain jalan pulang & tidur!
  if (isMidnight()) {
    showToast('🌌 Sudah Tengah Malam (00:00)! Kamu tidak bisa beraktivitas lagi — pulanglah ke Rumah & tidur di Kasur.');
    return;
  }

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

  if (item.toolType === 'hoe') {
    if (state.currentScene !== 'farm') {
      showToast('🌾 Mencangkul lahan hanya bisa di Pekarangan Kebunmu!');
      return;
    }
    if (tile.obstacle || tile.placed || tile.forage) {
      showToast('Petak terhalang objek.');
      return;
    }
    if (tile.groundType === 'grass') {
      if (!consumeEnergy(1.2)) return;
      tile.groundType = 'dirt';
      if (state.weather === 'rain') tile.watered = true;
      refreshTileVisual(tile);
      spawnBurst2D(tx, ty, 0x9c6635, 6);
    } else {
      showToast('Pilih rumput kosong di kebun untuk dicangkul.');
    }
    return;
  }

  if (item.toolType === 'water') {
    if (tile.groundType === 'dirt') {
      if (!consumeEnergy(0.8)) return;
      tile.watered = true;
      refreshTileVisual(tile);
      spawnBurst2D(tx, ty, 0x4cc9f0, 6);
    } else {
      showToast('Siram pada tanah garapan di kebun!');
    }
    return;
  }

  if (item.toolType === 'rod') {
    startFishingCharge();
    return;
  }

  if (item.toolType === 'pickaxe') {
    if (tile.placed) {
      w.group.remove(tile.placed.mesh);
      if (tile.placed.glow) w.group.remove(tile.placed.glow);
      addItem(tile.placed.itemId, 1);
      tile.placed = null;
      return;
    }
    if (tile.obstacle && tile.obstacle.kind === 'rock') {
      if (!consumeEnergy(1.5)) return;
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
          showToast('💎 Menemukan Permata Kecubung!');
        } else {
          showToast('🪨 Dapat Batu');
        }
      }
      return;
    }
    if (tile.groundType === 'dirt' && !tile.crop) {
      triggerActiveWork(0.8);
      tile.groundType = 'grass';
      tile.watered = false;
      refreshTileVisual(tile);
    }
    return;
  }

  if (item.toolType === 'axe') {
    if (tile.obstacle && tile.obstacle.kind === 'tree') {
      if (!consumeEnergy(1.5)) return;
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

  if (item.type === 'seed') {
    if (state.currentScene !== 'farm' || tile.groundType !== 'dirt') {
      showToast('Tanam bibit pada tanah cangkulan di Pekarangan Kebun!');
      return;
    }
    if (tile.crop || tile.obstacle || tile.placed) {
      showToast('Petak ini sudah terisi.');
      return;
    }
    if (!consumeEnergy(0.4)) return;
    tile.crop = { id: item.cropId, age: 0 };
    removeItem(item.id, 1);
    refreshTileVisual(tile);
    spawnBurst2D(tx, ty, 0x80ed99, 5);
    return;
  }

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

  if (item.energy) {
    if (state.energy >= state.maxEnergy) {
      showToast('⚡ Staminamu masih penuh (100%)!');
      return;
    }
    state.energy = Math.min(state.maxEnergy, state.energy + item.energy);
    removeItem(item.id, 1);
    updateHUD();
    showToast(`😋 Makan ${item.name} (+${item.energy}% Stamina)`);
  }
}

// =========================================================
// 10. INTERAKSI PORTAL & NPC (TERMASUK KUNCI TENGAH MALAM)
// =========================================================
function getActiveContextAction() {
  const w = worlds[state.currentScene];
  const px = state.player.x;
  const py = state.player.y;

  // Saat Tengah Malam: HANYA izinkan portal pindah peta (warp) untuk jalan pulang & Kasur untuk tidur!
  for (const p of w.portals) {
    if (Math.hypot(p.x - px, p.y - py) <= p.radius) {
      if (isMidnight() && p.actionType !== 'warp' && p.actionType !== 'sleep') {
        continue;
      }
      return { kind: 'portal', portal: p, label: p.label };
    }
  }

  if (!isMidnight()) {
    for (const npc of w.npcs) {
      if (Math.hypot(npc.x - px, npc.y - py) <= 1.75) {
        const hasReport =
          state.activeNpcQuest &&
          state.activeNpcQuest.npcId === npc.def.id &&
          countItem(state.activeNpcQuest.itemId) >= state.activeNpcQuest.need;
        const prefix = hasReport ? '✅ Lapor Quest ke' : '💬 Bicara dengan';
        return { kind: 'npc', npc, label: `${prefix} ${npc.def.name}` };
      }
    }

    const { tx, ty } = getTargetTileCoord();
    const frontTile = getTile(tx, ty);
    if (frontTile?.forage) {
      return { kind: 'forage', tile: frontTile, label: `🌿 Ambil ${ITEMS[frontTile.forage.itemId].name}` };
    }
    if (frontTile?.crop && frontTile.crop.age >= CROPS[frontTile.crop.id].daysToGrow) {
      return { kind: 'harvest', tile: frontTile, label: `🧺 Panen ${CROPS[frontTile.crop.id].name}` };
    }

    // Deteksi interaksi dengan Hewan Ternak / Liar
    for (const anim of w.animals) {
      const dist = Math.hypot(anim.x - px, anim.y - py);
      if (dist <= 1.6) {
        if (!anim.isFarmPen) {
          const icon = anim.type === 'cow' ? '🐄' : anim.type === 'sheep' ? '🐑' : '🐔';
          return { kind: 'catch_animal', animal: anim, label: `🖐️ Tangkap ${icon} ${anim.name}` };
        } else {
          const icon = anim.type === 'cow' ? '🐄' : '🐔';
          if (anim.isDead) {
            return { kind: 'animal_care', animal: anim, label: `🦴 Periksa Bangkai ${icon} (${anim.carcassDays || 0}/30h)` };
          } else if (anim.isSick) {
            return { kind: 'animal_care', animal: anim, label: `💊 Obati ${icon} ${anim.name} (Sakit!)` };
          } else if (anim.milkReady) {
            return { kind: 'animal_care', animal: anim, label: `🥛 Perah Susu ${icon} ${anim.name}` };
          } else if (anim.eggReady) {
            return { kind: 'animal_care', animal: anim, label: `🥚 Panen Telur ${icon} ${anim.name}` };
          } else {
            return { kind: 'animal_care', animal: anim, label: `🔍 Periksa ${icon} ${anim.name}` };
          }
        }
      }
    }
  }

  return null;
}

function executeContextAction() {
  if (state.isTransitioning) return;
  const act = getActiveContextAction();
  if (!act) {
    if (isMidnight()) {
      showToast('🌌 Sudah Tengah Malam! Jalan pulang ke Rumah lalu klik Kasur untuk tidur.');
    } else {
      showToast('Dekati Pintu, Gerbang Pagar, atau Warga lalu klik tombol yang muncul!');
    }
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

  if (act.kind === 'catch_animal') {
    catchWildAnimal(act.animal);
    return;
  }

  if (act.kind === 'animal_care') {
    openAnimalCareDialog(act.animal);
    return;
  }

  if (act.kind === 'portal') {
    const p = act.portal;
    if (p.actionType === 'place_animal_barn') {
      openBarnManagementDialog();
      return;
    }
    if (p.actionType === 'cow_feed_trough') {
      openFeedTroughDialog('cow');
      return;
    }
    if (p.actionType === 'cow_water_trough') {
      openWaterTroughDialog('cow');
      return;
    }
    if (p.actionType === 'chicken_feed_trough') {
      openFeedTroughDialog('chicken');
      return;
    }
    if (p.actionType === 'chicken_water_trough') {
      openWaterTroughDialog('chicken');
      return;
    }
    if (p.actionType === 'small_coop') {
      openSmallCoopDialog();
      return;
    }
    if (p.actionType === 'barn_board') {
      openBarnBoardDialog();
      return;
    }
    if (p.actionType && p.actionType.startsWith('nest_box_')) {
      openNestBoxDialog(p.nestIndex);
      return;
    }
    if (p.actionType === 'warp') {
      switchSceneWithFade(p.targetScene, p.targetX, p.targetY, p.targetDir);
    } else if (p.actionType === 'sleep') {
      sleepToNextWeekday();
    } else if (p.actionType === 'tv') {
      openTvDialog();
    } else if (p.actionType === 'cook') {
      closeAllModals();
      renderInventoryAndCrafting();
      document.getElementById('inv-modal').classList.remove('hidden');
    } else if (p.actionType === 'shop_direct') {
      const budi = worlds.village.npcs.find((n) => n.def.id === 'budi');
      if (budi) openNpcDialog(budi);
    } else if (p.actionType === 'village_board') {
      openVillageBoardDialog();
    } else if (p.actionType === 'village_bundles') {
      openVillageBundleDialog();
    } else if (p.actionType === 'meteor_crater_site') {
      openMeteorCraterDialog();
    }
  }
}

// =========================================================
// 11. TIDUR DI KASUR -> HARI BERIKUTNYA (SENIN -> SELASA ... JAM 06:00 PAGI)
// =========================================================
function applyFarmSprinklers() {
  for (const t of worlds.farm.tiles.values()) {
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

// =========================================================
// 10B. LOGIKA HEWAN TERNAK (GUDANG TERNAK SAPI & AYAM)
// =========================================================
function catchWildAnimal(animal) {
  if (isMidnight()) {
    showToast('🌌 Sudah Tengah Malam, hewan-hewan sedang tidur.');
    return;
  }

  const itemId = animal.type === 'cow' ? 'cow_live' : 'chicken_live';
  const itemDef = ITEMS[itemId];

  // Aturan: Hanya 1 hewan per jenis yang dapat diletakkan di tas
  const alreadyHaveSameType = state.slots.some(
    (s) => s && ITEMS[s.id] && ITEMS[s.id].type === 'animal_live' && ITEMS[s.id].animalType === animal.type
  );
  if (alreadyHaveSameType) {
    showToast(`⚠️ Kamu sudah membawa 1 ${itemDef.name} di dalam tas! Masukkan dulu ke Gudang Ternak.`);
    return;
  }

  if (!consumeEnergy(2.5)) {
    showToast('🥵 Stamina tidak cukup untuk menangkap hewan!');
    return;
  }

  if (!addItem(itemId, 1)) {
    showToast('⚠️ Tas penuh! Kosongkan 1 slot untuk membawa hewan.');
    return;
  }

  // Hilangkan dari scene asal (hewan tertangkap)
  const w = worlds[animal.scene];
  if (w) {
    w.group.remove(animal.group);
    w.animals = w.animals.filter((a) => a !== animal);
  }
  spawnBurst2D(animal.x, animal.y, animal.type === 'cow' ? 0xbbf7d0 : 0xffd166, 10);
  showToast(`🎉 Berhasil menangkap 1 ${itemDef.name}! Segera bawa ke Gudang Ternak di sebelah kiri rumah.`);
  persistLightSave();
}

function openAnimalCareDialog(animal) {
  resetMovementInputs();
  const modal = document.getElementById('dialog-modal');
  modal.classList.remove('hidden');

  const isCow = animal.type === 'cow';
  document.getElementById('dialog-portrait').textContent = isCow ? '🐄' : '🐔';
  document.getElementById('dialog-name').textContent = animal.name;

  let roleText = isCow ? 'Sapi Perah Gudang' : 'Ayam Gudang';
  if (animal.isDead) roleText = `Bangkai (${animal.carcassDays || 0}/30 Hari)`;
  else if (animal.isSick) roleText = '⚠️ Sakit (Butuh Obat!)';
  document.getElementById('dialog-role').textContent = roleText;

  const actions = document.getElementById('dialog-actions');
  actions.innerHTML = '';

  // 1. JIKA HEWAN SUDAH MATI
  if (animal.isDead) {
    document.getElementById('dialog-text').textContent =
      `Bangkai hewan ini sudah berada di kandang selama ${animal.carcassDays || 0}/30 hari. ` +
      `Jika tidak dibersihkan pemain, bangkai akan otomatis lenyap setelah 30 hari.`;

    const sweepBtn = document.createElement('button');
    sweepBtn.className = 'hud-btn primary-btn';
    sweepBtn.textContent = '🧹 Bersihkan & Buang Bangkai';
    sweepBtn.addEventListener('click', () => {
      state.farmAnimals = state.farmAnimals.filter((a) => a.id !== animal.id);
      persistLightSave();
      refreshBarnAnimals();
      closeAllModals();
      showToast('🧹 Kandang telah dibersihkan dari bangkai hewan.');
    });
    actions.appendChild(sweepBtn);

    const takeBtn = document.createElement('button');
    takeBtn.className = 'hud-btn';
    takeBtn.textContent = '🦴 Ambil Bangkai ke Tas';
    takeBtn.addEventListener('click', () => {
      if (addItem('animal_carcass', 1)) {
        state.farmAnimals = state.farmAnimals.filter((a) => a.id !== animal.id);
        persistLightSave();
        refreshBarnAnimals();
        closeAllModals();
        showToast('🦴 Bangkai hewan dimasukkan ke tas.');
      } else {
        showToast('⚠️ Tas penuh!');
      }
    });
    actions.appendChild(takeBtn);
  }
  // 2. JIKA HEWAN SAKIT (4 HARI TANPA MAKAN)
  else if (animal.isSick) {
    document.getElementById('dialog-text').textContent =
      `⚠️ ${animal.name} sedang SAKIT parah karena 4 hari tidak diberi makan! ` +
      `Jika tidak diobati selama 3 hari berturut-turut, hewan ini akan MATI. ` +
      `Beli "Obat Ternak" (100G) di Toko Pak Budi untuk menyembuhkannya!`;

    const haveMedicine = countItem('animal_medicine');
    if (haveMedicine > 0) {
      const cureBtn = document.createElement('button');
      cureBtn.className = 'hud-btn primary-btn';
      cureBtn.textContent = '💊 Berikan Obat Ternak (-1 Obat)';
      cureBtn.addEventListener('click', () => {
        removeItem('animal_medicine', 1);
        animal.isSick = false;
        animal.sickDays = 0;
        animal.unfedDays = 0;
        const targetState = state.farmAnimals.find((a) => a.id === animal.id);
        if (targetState) {
          targetState.isSick = false;
          targetState.sickDays = 0;
          targetState.unfedDays = 0;
        }
        persistLightSave();
        refreshBarnAnimals();
        showToast(`🎉 ${animal.name} berhasil sembuh dan kembali sehat!`);
        openAnimalCareDialog(animal);
      });
      actions.appendChild(cureBtn);
    }
  }
  // 3. HEWAN SEHAT
  else {
    const hungerStatus = animal.fedToday ? '✅ Sudah Makan Hari Ini' : '⚠️ Belum Makan Hari Ini';
    const fedCount = `Makan teratur: ${animal.fedDays || 0}/2 hari`;

    if (isCow) {
      let cowInfo = `Kondisi Sapi: ${hungerStatus} | ${fedCount}. Sapi menghasilkan 1 ember susu setelah 2x makan berturut-turut.`;
      if (animal.isPregnant) {
        cowInfo += `\n🧪 Sapi ini SEDANG HAMIL (Hari ke-${animal.pregnantDays || 0}/3).`;
      }
      document.getElementById('dialog-text').textContent = cowInfo;

      // Perah Susu
      if (animal.milkReady) {
        const milkBtn = document.createElement('button');
        milkBtn.className = 'hud-btn primary-btn';
        milkBtn.textContent = '🥛 Perah 1 Ember Susu Sapi Segar';
        milkBtn.addEventListener('click', () => {
          if (addItem('cow_milk', 1)) {
            animal.milkReady = false;
            animal.fedDays = 0;
            const target = state.farmAnimals.find((a) => a.id === animal.id);
            if (target) {
              target.milkReady = false;
              target.fedDays = 0;
            }
            persistLightSave();
            refreshBarnAnimals();
            showToast('🥛 Berhasil memerah 1 ember Susu Sapi Segar (+120G / +40%⚡)!');
            openAnimalCareDialog(animal);
          } else {
            showToast('⚠️ Tas penuh!');
          }
        });
        actions.appendChild(milkBtn);
      }

      // Berikan Pil Hamil
      if (!animal.isPregnant) {
        const havePil = countItem('cow_preg_pill');
        if (havePil > 0) {
          const pillBtn = document.createElement('button');
          pillBtn.className = 'hud-btn';
          pillBtn.textContent = '🧪 Berikan Pil Hamil Sapi';
          pillBtn.addEventListener('click', () => {
            removeItem('cow_preg_pill', 1);
            animal.isPregnant = true;
            animal.pregnantDays = 0;
            const target = state.farmAnimals.find((a) => a.id === animal.id);
            if (target) {
              target.isPregnant = true;
              target.pregnantDays = 0;
            }
            persistLightSave();
            showToast('🧪 Sapi sekarang hamil! Beri makan 3 hari berturut-turut untuk melahirkan anak sapi.');
            openAnimalCareDialog(animal);
          });
          actions.appendChild(pillBtn);
        }
      }
    } else {
      // Ayam
      const nestInfo = animal.isNesting
        ? `Sedang di Sarang Petelur #${(animal.nestIndex || 0) + 1}`
        : 'Berkeliaran Bebas di Gudang';
      const mateInfo = (animal.isMated || state.barn.hasRooster)
        ? '✅ Sudah kawin dengan pejantan'
        : '⚠️ Belum kawin pejantan (Kandang Ayam Kecil)';
      document.getElementById('dialog-text').textContent =
        `Kondisi Ayam: ${nestInfo} | ${hungerStatus} | ${fedCount} | ${mateInfo}. ` +
        `Ayam di sarang bertelur setelah 2x makan & dikawinkan dengan ayam jantan.`;

      // Panen Telur
      if (animal.eggReady) {
        const eggBtn = document.createElement('button');
        eggBtn.className = 'hud-btn primary-btn';
        eggBtn.textContent = '🥚 Panen 1 Butir Telur Ayam Segar';
        eggBtn.addEventListener('click', () => {
          if (addItem('egg_chicken', 1)) {
            animal.eggReady = false;
            animal.fedDays = 0;
            const target = state.farmAnimals.find((a) => a.id === animal.id);
            if (target) {
              target.eggReady = false;
              target.fedDays = 0;
            }
            persistLightSave();
            refreshBarnAnimals();
            showToast('🥚 Mendapatkan 1 Butir Telur Ayam Segar (+60G / +25%⚡)!');
            openAnimalCareDialog(animal);
          } else {
            showToast('⚠️ Tas penuh!');
          }
        });
        actions.appendChild(eggBtn);
      }

      // Pindah sarang / roaming
      if (animal.isNesting) {
        const roamBtn = document.createElement('button');
        roamBtn.className = 'hud-btn';
        roamBtn.textContent = '🐔 Lepaskan Ayam dari Sarang (Roaming Bebas)';
        roamBtn.addEventListener('click', () => {
          animal.isNesting = false;
          animal.nestIndex = -1;
          const target = state.farmAnimals.find((a) => a.id === animal.id);
          if (target) {
            target.isNesting = false;
            target.nestIndex = -1;
          }
          persistLightSave();
          refreshBarnAnimals();
          showToast('🐔 Ayam sekarang bebas bergerak di area gudang.');
          closeAllModals();
        });
        actions.appendChild(roamBtn);
      } else {
        const nestBtn = document.createElement('button');
        nestBtn.className = 'hud-btn';
        nestBtn.textContent = '🪺 Tempatkan ke Sarang Petelur';
        nestBtn.addEventListener('click', () => {
          // Cari sarang kosong (0..3)
          const taken = state.farmAnimals.filter((a) => a.isNesting).map((a) => a.nestIndex);
          const emptySlot = [0, 1, 2, 3].find((i) => !taken.includes(i));
          if (emptySlot === undefined) {
            showToast('⚠️ Keempat sarang petelur ayam sudah penuh!');
            return;
          }
          animal.isNesting = true;
          animal.nestIndex = emptySlot;
          const target = state.farmAnimals.find((a) => a.id === animal.id);
          if (target) {
            target.isNesting = true;
            target.nestIndex = emptySlot;
          }
          persistLightSave();
          refreshBarnAnimals();
          showToast(`🪺 Ayam diletakkan di Sarang #${emptySlot + 1}.`);
          closeAllModals();
        });
        actions.appendChild(nestBtn);
      }
    }
  }

  const closeB = document.createElement('button');
  closeB.className = 'hud-btn';
  closeB.textContent = 'Tutup';
  closeB.addEventListener('click', closeAllModals);
  actions.appendChild(closeB);
}

function openNestBoxDialog(nestIdx) {
  resetMovementInputs();
  const modal = document.getElementById('dialog-modal');
  modal.classList.remove('hidden');
  document.getElementById('dialog-portrait').textContent = '🪺';
  document.getElementById('dialog-name').textContent = `Sarang Petelur Ayam #${nestIdx + 1}`;
  document.getElementById('dialog-role').textContent = 'Area Petelur';

  const actions = document.getElementById('dialog-actions');
  actions.innerHTML = '';

  const occupant = state.farmAnimals.find((a) => a.type === 'chicken' && a.isNesting && a.nestIndex === nestIdx);

  if (occupant) {
    const mateStatus = (occupant.isMated || state.barn.hasRooster) ? 'Sudah kawin pejantan' : 'Belum kawin pejantan';
    document.getElementById('dialog-text').textContent =
      `Sarang ini dihuni oleh ${occupant.name}. ` +
      `Makan teratur: ${occupant.fedDays || 0}/2 hari. Status: ${mateStatus}. ` +
      (occupant.eggReady ? '🥚 Telur ayam segar sudah siap dipanen!' : 'Ayam sedang mengeram dengan tenang.');

    if (occupant.eggReady) {
      const panenBtn = document.createElement('button');
      panenBtn.className = 'hud-btn primary-btn';
      panenBtn.textContent = '🥚 Panen Telur Ayam Segar';
      panenBtn.addEventListener('click', () => {
        if (addItem('egg_chicken', 1)) {
          occupant.eggReady = false;
          occupant.fedDays = 0;
          persistLightSave();
          refreshBarnAnimals();
          showToast('🥚 Mendapatkan 1 Butir Telur Ayam Segar!');
          openNestBoxDialog(nestIdx);
        } else {
          showToast('⚠️ Tas penuh!');
        }
      });
      actions.appendChild(panenBtn);
    }

    const freeBtn = document.createElement('button');
    freeBtn.className = 'hud-btn';
    freeBtn.textContent = '🐔 Lepas Ayam dari Sarang';
    freeBtn.addEventListener('click', () => {
      occupant.isNesting = false;
      occupant.nestIndex = -1;
      persistLightSave();
      refreshBarnAnimals();
      showToast('🐔 Ayam dikeluarkan dari sarang petelur.');
      openNestBoxDialog(nestIdx);
    });
    actions.appendChild(freeBtn);
  } else {
    document.getElementById('dialog-text').textContent =
      `Sarang #${nestIdx + 1} saat ini KOSONG. ` +
      `Letakkan Ayam Betina di sarang ini agar diam dan mulai bertelur dalam 2 hari selama dikasih makan 2x berturut-turut.`;

    const liveChickenInBag = state.slots.find((s) => s && s.id === 'chicken_live');
    if (liveChickenInBag) {
      const putBtn = document.createElement('button');
      putBtn.className = 'hud-btn primary-btn';
      putBtn.textContent = '📥 Masukkan Ayam Betina dari Tas ke Sarang';
      putBtn.addEventListener('click', () => {
        removeItem('chicken_live', 1);
        const idx = state.farmAnimals.length;
        state.farmAnimals.push({
          id: `chicken_${Date.now()}`,
          type: 'chicken',
          name: `Ayam Petelur #${idx + 1}`,
          x: 3.2 + nestIdx * 1.2,
          y: 1.2,
          isNesting: true,
          nestIndex: nestIdx,
          fedDays: 0,
          unfedDays: 0,
          isMated: state.barn.hasRooster
        });
        persistLightSave();
        refreshBarnAnimals();
        showToast(`🪺 Ayam betina mulai mengeram di Sarang #${nestIdx + 1}!`);
        openNestBoxDialog(nestIdx);
      });
      actions.appendChild(putBtn);
    }

    // Pilihan menaruh ayam roaming ke sarang ini
    const roamingChicken = state.farmAnimals.find((a) => a.type === 'chicken' && !a.isNesting && !a.isDead);
    if (roamingChicken) {
      const moveBtn = document.createElement('button');
      moveBtn.className = 'hud-btn';
      moveBtn.textContent = `🪺 Pindahkan ${roamingChicken.name} ke Sarang Ini`;
      moveBtn.addEventListener('click', () => {
        roamingChicken.isNesting = true;
        roamingChicken.nestIndex = nestIdx;
        roamingChicken.x = 3.2 + nestIdx * 1.2;
        roamingChicken.y = 1.2;
        persistLightSave();
        refreshBarnAnimals();
        showToast(`🪺 ${roamingChicken.name} sekarang berada di Sarang #${nestIdx + 1}!`);
        openNestBoxDialog(nestIdx);
      });
      actions.appendChild(moveBtn);
    }
  }

  const closeB = document.createElement('button');
  closeB.className = 'hud-btn';
  closeB.textContent = 'Tutup';
  closeB.addEventListener('click', closeAllModals);
  actions.appendChild(closeB);
}

function openSmallCoopDialog() {
  resetMovementInputs();
  const modal = document.getElementById('dialog-modal');
  modal.classList.remove('hidden');
  document.getElementById('dialog-portrait').textContent = '🐓';
  document.getElementById('dialog-name').textContent = 'Kandang Ayam Kecil (Kawin Pejantan)';
  document.getElementById('dialog-role').textContent = state.barn.hasRooster ? 'Ada Ayam Jantan' : 'Kosong';

  const actions = document.getElementById('dialog-actions');
  actions.innerHTML = '';

  if (state.barn.hasRooster) {
    document.getElementById('dialog-text').textContent =
      `🐓 Kandang kecil ini menampung 1 Ayam Jantan Pejantan. ` +
      `Kehadiran pejantan memastikan seluruh ayam betina di deretan sarang petelur kawin dan dapat bertelur setelah 2 hari diberi makan!`;

    const retrieveBtn = document.createElement('button');
    retrieveBtn.className = 'hud-btn';
    retrieveBtn.textContent = '🎒 Ambil Ayam Jantan ke Tas';
    retrieveBtn.addEventListener('click', () => {
      if (addItem('rooster_live', 1)) {
        state.barn.hasRooster = false;
        persistLightSave();
        showToast('🐓 Ayam jantan diambil kembali ke dalam tas.');
        openSmallCoopDialog();
      } else {
        showToast('⚠️ Tas penuh!');
      }
    });
    actions.appendChild(retrieveBtn);
  } else {
    document.getElementById('dialog-text').textContent =
      `Kandang Ayam Kecil ini berada di ujung kanan atas dari deretan sarang petelur. ` +
      `Letakkan 1 Ayam Jantan (Pejantan) di sini agar ayam-ayam betina di sarang bisa kawin dan menghasilkan telur! ` +
      `Ayam Jantan dapat dibeli di Toko Pak Budi (150G).`;

    const haveRooster = countItem('rooster_live');
    if (haveRooster > 0) {
      const putBtn = document.createElement('button');
      putBtn.className = 'hud-btn primary-btn';
      putBtn.textContent = '📥 Masukkan 🐓 Ayam Jantan ke Kandang Kecil';
      putBtn.addEventListener('click', () => {
        removeItem('rooster_live', 1);
        state.barn.hasRooster = true;
        state.farmAnimals.forEach((a) => {
          if (a.type === 'chicken') a.isMated = true;
        });
        persistLightSave();
        showToast('🐓 Ayam Jantan ditempatkan di Kandang Kecil! Seluruh ayam betina siap bertelur.');
        openSmallCoopDialog();
      });
      actions.appendChild(putBtn);
    }
  }

  const closeB = document.createElement('button');
  closeB.className = 'hud-btn';
  closeB.textContent = 'Tutup';
  closeB.addEventListener('click', closeAllModals);
  actions.appendChild(closeB);
}

function openFeedTroughDialog(animalType) {
  resetMovementInputs();
  const modal = document.getElementById('dialog-modal');
  modal.classList.remove('hidden');

  const isCow = animalType === 'cow';
  document.getElementById('dialog-portrait').textContent = '🌾';
  document.getElementById('dialog-name').textContent = isCow ? 'Bak Pakan Rumput Sapi' : 'Bak Pakan Ayam';
  const curFeed = isCow ? state.barn.cowFeed : state.barn.chickenFeed;
  document.getElementById('dialog-role').textContent = `${curFeed}/6 Pakan Terisi`;

  const actions = document.getElementById('dialog-actions');
  actions.innerHTML = '';

  document.getElementById('dialog-text').textContent =
    `Kapasitas bak pakan: ${curFeed}/6 pakan. Hewan di dalam gudang meminta makan 1x sehari. ` +
    `Jika 4 hari hewan tidak makan, hewan akan sakit. Jika 7 hari kelaparan, hewan akan mati!`;

  const haveFeed = countItem('animal_feed');
  if (haveFeed > 0 && curFeed < 6) {
    const addOneBtn = document.createElement('button');
    addOneBtn.className = 'hud-btn primary-btn';
    addOneBtn.textContent = '📥 Isi +1 Pakan Rumput (-1 Pakan)';
    addOneBtn.addEventListener('click', () => {
      removeItem('animal_feed', 1);
      if (isCow) state.barn.cowFeed = Math.min(6, state.barn.cowFeed + 1);
      else state.barn.chickenFeed = Math.min(6, state.barn.chickenFeed + 1);
      persistLightSave();
      showToast('🌾 Pakan berhasil diisikan ke dalam bak!');
      openFeedTroughDialog(animalType);
    });
    actions.appendChild(addOneBtn);

    const fillAllBtn = document.createElement('button');
    fillAllBtn.className = 'hud-btn';
    fillAllBtn.textContent = '📥 Isi Penuh Bak Pakan';
    fillAllBtn.addEventListener('click', () => {
      const need = 6 - (isCow ? state.barn.cowFeed : state.barn.chickenFeed);
      const toAdd = Math.min(need, countItem('animal_feed'));
      removeItem('animal_feed', toAdd);
      if (isCow) state.barn.cowFeed += toAdd;
      else state.barn.chickenFeed += toAdd;
      persistLightSave();
      showToast(`🌾 Berhasil mengisi ${toAdd} pakan rumput ke dalam bak!`);
      openFeedTroughDialog(animalType);
    });
    actions.appendChild(fillAllBtn);
  } else if (curFeed >= 6) {
    const fullTag = document.createElement('div');
    fullTag.style.color = '#7ec850';
    fullTag.textContent = '✅ Bak pakan sudah penuh terisi (6/6).';
    actions.appendChild(fullTag);
  } else {
    const buyTip = document.createElement('div');
    buyTip.className = 'muted-tip';
    buyTip.textContent = '💡 Kamu tidak membawa Pakan Rumput Ternak. Beli di Toko Pak Budi (15G) di Alun-Alun Desa.';
    actions.appendChild(buyTip);
  }

  const closeB = document.createElement('button');
  closeB.className = 'hud-btn';
  closeB.textContent = 'Tutup';
  closeB.addEventListener('click', closeAllModals);
  actions.appendChild(closeB);
}

function openWaterTroughDialog(animalType) {
  resetMovementInputs();
  const modal = document.getElementById('dialog-modal');
  modal.classList.remove('hidden');

  const isCow = animalType === 'cow';
  document.getElementById('dialog-portrait').textContent = '💧';
  document.getElementById('dialog-name').textContent = isCow ? 'Bak Air Minum Sapi' : 'Bak Air Minum Ayam';
  const curWater = isCow ? state.barn.cowWater : state.barn.chickenWater;
  document.getElementById('dialog-role').textContent = `${curWater}/6 Air Terisi`;

  const actions = document.getElementById('dialog-actions');
  actions.innerHTML = '';

  document.getElementById('dialog-text').textContent =
    `Kapasitas bak air: ${curWater}/6 air minum. Hewan membutuhkan air minum setiap hari bersamaan dengan pakan.`;

  if (curWater < 6) {
    const fillBtn = document.createElement('button');
    fillBtn.className = 'hud-btn primary-btn';
    fillBtn.textContent = '🚿 Tuang Air Minum (+3 Air)';
    fillBtn.addEventListener('click', () => {
      if (isCow) state.barn.cowWater = Math.min(6, state.barn.cowWater + 3);
      else state.barn.chickenWater = Math.min(6, state.barn.chickenWater + 3);
      persistLightSave();
      showToast('💧 Bak air minum berhasil diisi penuh!');
      openWaterTroughDialog(animalType);
    });
    actions.appendChild(fillBtn);
  } else {
    const fullTag = document.createElement('div');
    fullTag.style.color = '#7ec850';
    fullTag.textContent = '✅ Bak air minum sudah penuh terisi (6/6).';
    actions.appendChild(fullTag);
  }

  const closeB = document.createElement('button');
  closeB.className = 'hud-btn';
  closeB.textContent = 'Tutup';
  closeB.addEventListener('click', closeAllModals);
  actions.appendChild(closeB);
}

function openBarnBoardDialog() {
  resetMovementInputs();
  const modal = document.getElementById('dialog-modal');
  modal.classList.remove('hidden');
  document.getElementById('dialog-portrait').textContent = '📋';
  document.getElementById('dialog-name').textContent = 'Laporan Status Gudang Ternak';
  document.getElementById('dialog-role').textContent = `${state.farmAnimals.length}/${state.MAX_FARM_ANIMALS} Hewan`;

  const actions = document.getElementById('dialog-actions');
  actions.innerHTML = '';

  const cows = state.farmAnimals.filter((a) => a.type === 'cow' || a.type === 'sheep');
  const chickens = state.farmAnimals.filter((a) => a.type === 'chicken');
  const deadCount = state.farmAnimals.filter((a) => a.isDead).length;
  const sickCount = state.farmAnimals.filter((a) => a.isSick).length;

  document.getElementById('dialog-text').textContent =
    `• Sapi di Kandang Kiri: ${cows.length} ekor\n` +
    `• Ayam di Sarang/Roaming: ${chickens.length} ekor\n` +
    `• Ayam Jantan di Kandang Kecil: ${state.barn.hasRooster ? '✅ Ada (Siap Kawin)' : '❌ Kosong'}\n` +
    `• Pakan Sapi: ${state.barn.cowFeed}/6 | Air Sapi: ${state.barn.cowWater}/6\n` +
    `• Pakan Ayam: ${state.barn.chickenFeed}/6 | Air Ayam: ${state.barn.chickenWater}/6\n` +
    `• Status Kesehatan: ${sickCount} Sakit, ${deadCount} Bangkai`;

  const addAnimalBtn = document.createElement('button');
  addAnimalBtn.className = 'hud-btn primary-btn';
  addAnimalBtn.textContent = '📥 Masukkan Hewan dari Tas ke Gudang';
  addAnimalBtn.addEventListener('click', () => {
    openBarnManagementDialog();
  });
  actions.appendChild(addAnimalBtn);

  const closeB = document.createElement('button');
  closeB.className = 'hud-btn';
  closeB.textContent = 'Tutup';
  closeB.addEventListener('click', closeAllModals);
  actions.appendChild(closeB);
}

function openBarnManagementDialog() {
  resetMovementInputs();
  const modal = document.getElementById('dialog-modal');
  modal.classList.remove('hidden');
  document.getElementById('dialog-portrait').textContent = '🛖';
  document.getElementById('dialog-name').textContent = 'Pemasukan Hewan ke Gudang Ternak';
  document.getElementById('dialog-role').textContent = `${state.farmAnimals.length}/${state.MAX_FARM_ANIMALS} Hewan`;

  const actions = document.getElementById('dialog-actions');
  actions.innerHTML = '';

  const liveAnimalsInBag = [];
  state.slots.forEach((s) => {
    if (s && ITEMS[s.id] && ITEMS[s.id].type === 'animal_live') {
      liveAnimalsInBag.push({ slot: s, def: ITEMS[s.id] });
    }
  });

  if (state.farmAnimals.length >= state.MAX_FARM_ANIMALS) {
    document.getElementById('dialog-text').textContent =
      `Gudang Ternak sudah penuh (${state.farmAnimals.length}/${state.MAX_FARM_ANIMALS} ekor). Rawat dan beri makan hewan-hewanmu setiap hari!`;
  } else if (liveAnimalsInBag.length === 0) {
    document.getElementById('dialog-text').textContent =
      `Gudang saat ini menampung ${state.farmAnimals.length}/${state.MAX_FARM_ANIMALS} hewan. ` +
      `Kamu belum membawa hewan hidup di tas. Tangkap Sapi atau Ayam di Alun-Alun Desa atau Hutan/Pantai!`;
  } else {
    document.getElementById('dialog-text').textContent =
      `Gudang terisi ${state.farmAnimals.length}/${state.MAX_FARM_ANIMALS} hewan. ` +
      `Pilih hewan hidup dari tasmu untuk diletakkan ke dalam gudang ternak agar aman dan berproduksi:`;

    liveAnimalsInBag.forEach(({ slot, def }) => {
      const btn = document.createElement('button');
      btn.className = 'hud-btn primary-btn';
      btn.textContent = `📥 Masukkan ${def.icon} ${def.name} ke Gudang`;
      btn.addEventListener('click', () => {
        if (state.farmAnimals.length >= state.MAX_FARM_ANIMALS) {
          showToast('⚠️ Gudang sudah mencapai kapasitas maksimal!');
          return;
        }
        removeItem(slot.id, 1);
        const idx = state.farmAnimals.length;
        const isCow = def.animalType === 'cow' || def.animalType === 'sheep';
        state.farmAnimals.push({
          id: `${def.animalType}_${Date.now()}`,
          type: isCow ? 'cow' : 'chicken',
          name: isCow ? `Sapi Asri #${idx + 1}` : `Ayam Asri #${idx + 1}`,
          x: isCow ? -5.0 : 3.5,
          y: isCow ? -1.0 : -1.0,
          fedDays: 0,
          unfedDays: 0,
          isSick: false,
          isDead: false,
          carcassDays: 0,
          isNesting: false,
          nestIndex: -1,
          isMated: state.barn.hasRooster
        });
        persistLightSave();
        refreshBarnAnimals();
        showToast(`🛖 Berhasil memasukkan ${def.name} ke dalam Gudang Ternak!`);
        openBarnManagementDialog();
      });
      actions.appendChild(btn);
    });
  }

  const closeB = document.createElement('button');
  closeB.className = 'hud-btn';
  closeB.textContent = 'Tutup';
  closeB.addEventListener('click', closeAllModals);
  actions.appendChild(closeB);
}

// Saat tidur 1 hari berlalu:
// 1) Hewan liar tertangkap respawn di alam jika kosong
// 2) Hewan hidup di tas berubah jadi bangkai jika tidak dimasukkan ke gudang
// 3) Hewan di dalam gudang makan 1x sehari, produksi susu & telur, sakit jika 4 hari lapar, mati jika 7 hari lapar/3 hari sakit
function processDayPassedAnimals() {
  let rottenCount = 0;
  for (let i = 0; i < state.slots.length; i++) {
    const s = state.slots[i];
    if (s && ITEMS[s.id] && ITEMS[s.id].type === 'animal_live') {
      state.slots[i] = { id: 'animal_carcass', qty: s.qty || 1 };
      rottenCount++;
    }
  }

  if (rottenCount > 0) {
    setTimeout(() => {
      showToast('⚠️ Hewan di tas mati dan berubah menjadi Bangkai Hewan karena tidak dimasukkan ke Gudang selama 1 hari!');
    }, 1500);
  }

  // Respawn hewan liar jika di scene terkait belum ada
  for (const aDef of WILD_ANIMAL_DEFS) {
    const w = worlds[aDef.scene];
    if (w) {
      const exists = w.animals.some((a) => !a.isFarmPen && a.id === aDef.id);
      if (!exists) {
        const ent = createAnimalEntity(aDef, false);
        w.group.add(ent.group);
        w.animals.push(ent);
      }
    }
  }

  // Siklus Harian Ternak di Dalam Gudang
  const newBirths = [];
  state.farmAnimals.forEach((anim) => {
    // Jika sudah bangkai
    if (anim.isDead) {
      anim.carcassDays = (anim.carcassDays || 0) + 1;
      return;
    }

    const isCow = anim.type === 'cow' || anim.type === 'sheep';
    let hasFed = false;

    // Hewan makan 1x sehari jika bak pakan & air terisi
    if (isCow) {
      if (state.barn.cowFeed > 0 && state.barn.cowWater > 0) {
        state.barn.cowFeed--;
        state.barn.cowWater--;
        hasFed = true;
      }
    } else {
      if (state.barn.chickenFeed > 0 && state.barn.chickenWater > 0) {
        state.barn.chickenFeed--;
        state.barn.chickenWater--;
        hasFed = true;
      }
    }

    if (hasFed) {
      anim.fedDays = (anim.fedDays || 0) + 1;
      anim.unfedDays = 0;
      anim.fedToday = true;
    } else {
      anim.unfedDays = (anim.unfedDays || 0) + 1;
      anim.fedDays = 0;
      anim.fedToday = false;
    }

    // Sakit jika 4 hari tidak diberi makan
    if (anim.unfedDays >= 4 && !anim.isSick) {
      anim.isSick = true;
      anim.sickDays = 1;
    } else if (anim.isSick) {
      anim.sickDays = (anim.sickDays || 0) + 1;
    }

    // Mati jika 7 hari kelaparan ATAU 3 hari sakit tanpa obat
    if (anim.unfedDays >= 7 || (anim.isSick && anim.sickDays >= 3)) {
      anim.isDead = true;
      anim.carcassDays = 0;
      anim.isSick = false;
      return;
    }

    // Susu Sapi: siap perah 1 ember setelah 2x makan / 2 hari
    if (isCow && !anim.isSick && anim.fedDays >= 2) {
      anim.milkReady = true;
    }

    // Beranak Sapi: jika diberi pil hamil dan dirawat 3 hari
    if (isCow && anim.isPregnant) {
      anim.pregnantDays = (anim.pregnantDays || 0) + 1;
      if (anim.pregnantDays >= 3 && state.farmAnimals.length < state.MAX_FARM_ANIMALS) {
        anim.isPregnant = false;
        anim.pregnantDays = 0;
        newBirths.push({
          id: `cow_calf_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'cow',
          name: `Anak Sapi #${state.farmAnimals.length + newBirths.length + 1}`,
          x: -5.0,
          y: 0.0,
          homeX: -5.0,
          homeY: 0.0,
          dir: 'down',
          fedDays: 0,
          unfedDays: 0
        });
      }
    }

    // Ayam di Sarang Petelur: bertelur dalam 2 hari selama dikasih makan 2x dan setelah kawin dengan pejantan
    if (!isCow && anim.isNesting && !anim.isSick) {
      const hasMated = anim.isMated || state.barn.hasRooster;
      if (hasMated && anim.fedDays >= 2) {
        anim.eggReady = true;
      }
    }
  });

  if (newBirths.length > 0) {
    state.farmAnimals.push(...newBirths);
    setTimeout(() => {
      showToast('🎉 Selamat! Seekor Anak Sapi baru telah lahir di kandang sapi!');
    }, 2000);
  }

  // Bangkai hilang otomatis setelah 30 hari di kandang
  const beforeCount = state.farmAnimals.length;
  state.farmAnimals = state.farmAnimals.filter((a) => !(a.isDead && a.carcassDays >= 30));
  if (state.farmAnimals.length < beforeCount) {
    setTimeout(() => {
      showToast('🧹 Bangkai hewan yang sudah lewat 30 hari otomatis lenyap dari kandang.');
    }, 2500);
  }

  refreshBarnAnimals();
  persistLightSave();
}

function sleepToNextWeekday() {
  closeAllModals();
  state.weekdayIndex = (state.weekdayIndex + 1) % 7;
  state.phaseIndex = 0; // Kembali ke Fase Pagi (06:00)
  state.phaseElapsedSec = 0;
  state.energy = state.maxEnergy;
  state.weather = state.tomorrowWeather;
  state.tomorrowWeather = Math.random() < 0.3 ? 'rain' : 'sunny';

  // Tanaman kebun yang disiram tumbuh 1 hari
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

  populateMineRocks(false);
  populateForestForage(false);
  processDayPassedAnimals();

  switchSceneWithFade('house', -2.2, 1.0, 'down');
  persistLightSave();
  updateHUD();

  const dayName = DAYS_OF_WEEK[state.weekdayIndex];
  setTimeout(() => {
    showToast(`🌅 Hari ${dayName} pukul 06:00 Pagi! Energi pulih 100%.`);
  }, 320);
}

// =========================================================
// 12. DIALOG NPC + SISTEM QUEST NPC & STORY QUEST DOKUMEN GDOCS
// =========================================================
function updateQuestTrackerUI() {
  const box = document.getElementById('quest-tracker');
  const txt = document.getElementById('quest-tracker-text');
  if (!box || !txt) return;

  // 1. Jika ada Active NPC Mini-Quest
  if (state.activeNpcQuest) {
    box.classList.remove('hidden');
    const q = state.activeNpcQuest;
    const itemDef = ITEMS[q.itemId];
    const have = countItem(q.itemId);
    const ready = have >= q.need ? '✅ Siap Lapor!' : `${have}/${q.need}`;
    txt.textContent = `Pesanan ${q.npcName}: ${itemDef ? itemDef.icon : ''} ${itemDef ? itemDef.name : q.itemId} (${ready})`;
    return;
  }

  // 2. Jika tidak ada NPC Quest, tampilkan Main Story Quest dari GDocs!
  const sq = STORY_QUESTS.find((q) => q.id === state.story.currentQuestId);
  if (sq) {
    box.classList.remove('hidden');
    if (sq.id === 'story_1_2') {
      const greeted = Object.keys(state.story.greetedNpcs || {}).length;
      txt.textContent = `📜 Bab ${sq.num}: ${sq.title} (${greeted}/${sq.neededGreetings} Warga Disapa)`;
    } else {
      txt.textContent = `📜 Bab ${sq.num}: ${sq.title}`;
    }
    return;
  }

  box.classList.add('hidden');
}

function openNpcDialog(npc) {
  if (isMidnight()) {
    showToast('🌌 Sudah Tengah Malam, semua warga sudah beristirahat.');
    return;
  }

  resetMovementInputs();
  const modal = document.getElementById('dialog-modal');
  modal.classList.remove('hidden');
  document.getElementById('dialog-portrait').textContent = npc.def.portrait;
  document.getElementById('dialog-name').textContent = npc.def.name;

  const curAff = state.story.affPercent[npc.def.id] || 0;
  document.getElementById('dialog-role').textContent = `${npc.def.role} · ❤️ ${curAff}%`;

  const actions = document.getElementById('dialog-actions');
  actions.innerHTML = '';

  // Progres Story Quest 1.2: Berkenalan dengan Warga Desa Forhest
  if (state.story.currentQuestId === 'story_1_2') {
    if (!state.story.greetedNpcs[npc.def.id]) {
      state.story.greetedNpcs[npc.def.id] = true;
      state.story.affPercent[npc.def.id] = (state.story.affPercent[npc.def.id] || 0) + 1;
      const count = Object.keys(state.story.greetedNpcs).length;
      showToast(`🤝 Berkenalan dengan ${npc.def.name}! (${count}/3)`);
      if (count >= 3) {
        setTimeout(() => {
          advanceStoryQuest('story_1_2');
        }, 600);
      }
    }
  }

  // Progres Story Quest 1.3: Menjaga Lokasi (Pak Roden / Pak Bohei)
  if (state.story.currentQuestId === 'story_1_3' && (npc.def.id === 'roden' || npc.def.id === 'bohei')) {
    const wCount = countItem('wood');
    const sCount = countItem('stone');
    const hCount = countItem('herb');
    const canBuild = wCount >= 20 && sCount >= 20 && hCount >= 5;
    const storyBtn = document.createElement('button');
    storyBtn.className = 'hud-btn highlight-btn';
    storyBtn.textContent = `🔨 Bangun Pos Benda Jatuh (Kayu ${wCount}/20, Batu ${sCount}/20, Herb ${hCount}/5)`;
    storyBtn.addEventListener('click', () => {
      if (!canBuild) {
        showToast('⚠️ Bahan belum cukup! Kumpulkan 20 Kayu, 20 Batu, dan 5 Herb.');
        return;
      }
      removeItem('wood', 20);
      removeItem('stone', 20);
      removeItem('herb', 5);
      advanceStoryQuest('story_1_3');
      closeAllModals();
    });
    actions.appendChild(storyBtn);
  }

  // Progres Story Quest 1.4: Serangan Bandit (Dino / Pak Bohei)
  if (state.story.currentQuestId === 'story_1_4' && (npc.def.id === 'dino' || npc.def.id === 'bohei')) {
    const wCount = countItem('wood');
    const sCount = countItem('stone');
    const canFix = wCount >= 20 && sCount >= 10;
    const storyBtn = document.createElement('button');
    storyBtn.className = 'hud-btn highlight-btn';
    storyBtn.textContent = `🛡️ Amankan Desa & Perbaiki Pos (Kayu ${wCount}/20, Batu ${sCount}/10)`;
    storyBtn.addEventListener('click', () => {
      if (!canFix) {
        showToast('⚠️ Bahan belum cukup! Bawa 20 Kayu dan 10 Batu di dalam tas.');
        return;
      }
      removeItem('wood', 20);
      removeItem('stone', 10);
      advanceStoryQuest('story_1_4');
      closeAllModals();
    });
    actions.appendChild(storyBtn);
  }

  // Progres Story Quest 1.5: Pengobatan & Tambang Besi
  if (state.story.currentQuestId === 'story_1_5') {
    if (npc.def.id === 'christaa') {
      const hCount = countItem('herb');
      const storyBtn = document.createElement('button');
      storyBtn.className = 'hud-btn highlight-btn';
      storyBtn.textContent = `🌿 Setor 15 Herb ke Christaa (${hCount}/15)`;
      storyBtn.addEventListener('click', () => {
        if (hCount < 15) {
          showToast('⚠️ Tanaman obat belum cukup! Kumpulkan 15 Herb dari hutan.');
          return;
        }
        removeItem('herb', 15);
        state.story.affPercent.christaa = (state.story.affPercent.christaa || 0) + 20;
        showToast('🌸 Christaa menerima tanaman obatmu untuk ramuan warga! (+20% Hubungan)');
        state.story.herbSubmitted1_5 = true;
        checkStory1_5Done();
        closeAllModals();
      });
      actions.appendChild(storyBtn);
    }
    if (npc.def.id === 'rol') {
      const iCount = countItem('iron_ore');
      const storyBtn = document.createElement('button');
      storyBtn.className = 'hud-btn highlight-btn';
      storyBtn.textContent = `🔩 Setor 10 Bijih Besi ke Pak Rol (${iCount}/10)`;
      storyBtn.addEventListener('click', () => {
        if (iCount < 10) {
          showToast('⚠️ Bijih Besi belum cukup! Tambang 10 Iron Ore di Gua Tambang.');
          return;
        }
        removeItem('iron_ore', 10);
        state.story.affPercent.rol = (state.story.affPercent.rol || 0) + 15;
        showToast('🔨 Pak Rol puas dengan kualitas bijih besi tempaanmu! (+15% Hubungan)');
        state.story.ironSubmitted1_5 = true;
        checkStory1_5Done();
        closeAllModals();
      });
      actions.appendChild(storyBtn);
    }
  }

  const qIdx = (state.npcQuestProgress[npc.def.id] || 0) % (npc.def.quests ? npc.def.quests.length : 1);
  const npcQuestTemplate = npc.def.quests ? npc.def.quests[qIdx] : null;

  // Cek apakah player sedang memegang Quest dari NPC ini
  const isMyActiveQuest = state.activeNpcQuest && state.activeNpcQuest.npcId === npc.def.id;

  if (isMyActiveQuest) {
    const q = state.activeNpcQuest;
    const have = countItem(q.itemId);
    const itemDef = ITEMS[q.itemId];
    if (have >= q.need) {
      document.getElementById('dialog-text').textContent =
        `Wah, kamu sudah membawa ${q.need}x ${itemDef.name}! Terima kasih banyak ya! ` +
        `(Melaporkan quest ini akan menghabiskan sisa waktu fase ini dan masuk ke zona waktu berikutnya).`;

      const reportBtn = document.createElement('button');
      reportBtn.className = 'hud-btn primary-btn';
      reportBtn.textContent = `✅ Lapor Selesai Quest (+${q.reward}G & Lanjut Fase Waktu)`;
      reportBtn.addEventListener('click', () => {
        removeItem(q.itemId, q.need);
        state.gold += q.reward;
        state.npcQuestProgress[npc.def.id] = (state.npcQuestProgress[npc.def.id] || 0) + 1;
        state.activeNpcQuest = null;
        persistLightSave();
        updateQuestTrackerUI();
        closeAllModals();

        // Sesuai aturan: sisa waktu 5 menit langsung habis & masuk fase berikutnya!
        const nextPhaseObj = TIME_PHASES[Math.min(3, state.phaseIndex + 1)];
        advanceToNextTimePhase(
          `🎉 Quest ${npc.def.name} selesai (+${q.reward}G)! Waktu berlanjut ke ${nextPhaseObj.label}.`
        );
      });
      actions.appendChild(reportBtn);
    } else {
      document.getElementById('dialog-text').textContent =
        `Aku masih menunggu pesanan "${q.title}": ${q.need}x ${itemDef.icon} ${itemDef.name} (Kamu baru punya ${have}/${q.need}). Semangat ya!`;
    }
  } else {
    document.getElementById('dialog-text').textContent = npc.def.lines[npc.talkIndex % npc.def.lines.length];
    npc.talkIndex += 1;

    // Tombol Ambil Quest dari NPC ini (jika belum mengambil quest NPC lain)
    if (!state.activeNpcQuest && npcQuestTemplate) {
      const itemDef = ITEMS[npcQuestTemplate.itemId];
      const acceptBtn = document.createElement('button');
      acceptBtn.className = 'hud-btn sleep-btn';
      acceptBtn.textContent = `📜 Ambil Quest: ${npcQuestTemplate.need}x ${itemDef.icon} ${itemDef.name} (Hadiah ${npcQuestTemplate.reward}G)`;
      acceptBtn.addEventListener('click', () => {
        state.activeNpcQuest = {
          npcId: npc.def.id,
          npcName: npc.def.name,
          ...npcQuestTemplate
        };
        updateQuestTrackerUI();
        document.getElementById('dialog-text').textContent =
          `${npcQuestTemplate.reqText} Kembalilah melapor padaku jika sudah terkumpul!`;
        acceptBtn.remove();
        showToast(`📜 Quest diterima dari ${npc.def.name}!`);
      });
      actions.appendChild(acceptBtn);
    }
  }

  // Fitur Toko Desa pada Pak Budi: Beli Bibit & Kebutuhan Ternak SEKALIGUS Jual Hasil Panen/Susu/Telur/Tambang/Ikan!
  if (npc.def.isMerchant) {
    for (const sid of ['seed_turnip', 'seed_tomato', 'seed_pumpkin', 'animal_feed', 'animal_medicine', 'cow_preg_pill', 'rooster_live']) {
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

    // Tombol Jual Barang di Tas langsung ke Pak Budi (menggantikan Kotak Jual yang dihapus di Kebun)
    state.slots.forEach((slot) => {
      if (!slot) return;
      const def = ITEMS[slot.id];
      if (!def.sellPrice || def.type === 'seed') return;
      const sellBtn = document.createElement('button');
      sellBtn.className = 'hud-btn';
      sellBtn.style.borderColor = '#ffd15c';
      const totalVal = def.sellPrice * slot.qty;
      sellBtn.textContent = `🪙 Jual ${slot.qty}x ${def.icon} ${def.name} (+${totalVal}G)`;
      sellBtn.addEventListener('click', () => {
        const qNow = slot.qty;
        removeItem(slot.id, qNow);
        state.gold += def.sellPrice * qNow;
        persistLightSave();
        updateHUD();
        showToast(`🪙 Terjual ke Pak Budi +${def.sellPrice * qNow}G!`);
        openNpcDialog(npc);
      });
      actions.appendChild(sellBtn);
    });
  }

  const closeB = document.createElement('button');
  closeB.className = 'hud-btn';
  closeB.textContent = 'Tutup';
  closeB.addEventListener('click', closeAllModals);
  actions.appendChild(closeB);
}

function openTvDialog() {
  resetMovementInputs();
  const modal = document.getElementById('dialog-modal');
  modal.classList.remove('hidden');
  document.getElementById('dialog-portrait').textContent = '📺';
  document.getElementById('dialog-name').textContent = 'Siaran TV Lembah';
  document.getElementById('dialog-role').textContent = `Hari ${DAYS_OF_WEEK[state.weekdayIndex]}`;
  document.getElementById('dialog-text').textContent =
    `Cuaca hari ini: ${state.weather === 'rain' ? '🌧️ Hujan (Kebun otomatis basah!)' : '☀️ Cerah'}. ` +
    `Prakiraan esok hari (${DAYS_OF_WEEK[(state.weekdayIndex + 1) % 7]}): ` +
    `${state.tomorrowWeather === 'rain' ? '🌧️ Hujan' : '☀️ Cerah'}.`;

  const actions = document.getElementById('dialog-actions');
  actions.innerHTML = '';
  const closeB = document.createElement('button');
  closeB.className = 'hud-btn primary-btn';
  closeB.textContent = 'Matikan TV';
  closeB.addEventListener('click', closeAllModals);
  actions.appendChild(closeB);
}

function openVillageBoardDialog() {
  resetMovementInputs();
  const doneCount = VILLAGE_BUNDLES.filter((b) => state.completedBundles[b.id]).length;
  const totalCount = VILLAGE_BUNDLES.length;
  const modal = document.getElementById('dialog-modal');
  modal.classList.remove('hidden');
  document.getElementById('dialog-portrait').textContent = '🏛️';
  document.getElementById('dialog-name').textContent = 'Papan Informasi Balai Desa Asri';
  document.getElementById('dialog-role').textContent = `Hari ${DAYS_OF_WEEK[state.weekdayIndex]}`;
  document.getElementById('dialog-text').textContent =
    `Selamat datang di Alun-Alun Desa Asri! Kemajuan Gotong Royong Balai Desa saat ini: ${doneCount}/${totalCount} Paket Selesai. ` +
    `Masuklah ke dalam Balai Desa Asri untuk menemui Pak Lurah Hendra atau menyumbangkan hasil alam di Meja Gotong Royong Desa!`;

  const actions = document.getElementById('dialog-actions');
  actions.innerHTML = '';
  const closeB = document.createElement('button');
  closeB.className = 'hud-btn primary-btn';
  closeB.textContent = 'Tutup Papan';
  closeB.addEventListener('click', closeAllModals);
  actions.appendChild(closeB);
}

function openVillageBundleDialog() {
  resetMovementInputs();
  const doneCount = VILLAGE_BUNDLES.filter((b) => state.completedBundles[b.id]).length;
  const modal = document.getElementById('dialog-modal');
  modal.classList.remove('hidden');
  document.getElementById('dialog-portrait').textContent = '📦';
  document.getElementById('dialog-name').textContent = 'Program Gotong Royong Balai Desa Asri';
  document.getElementById('dialog-role').textContent = `${doneCount}/${VILLAGE_BUNDLES.length} Selesai`;

  if (doneCount === VILLAGE_BUNDLES.length) {
    document.getElementById('dialog-text').textContent =
      '🎉 Luar biasa! Seluruh Paket Gotong Royong Pembangunan Desa Asri sudah tuntas diselesaikan. Warga Desa Asri sangat berterima kasih atas kontribusimu!';
  } else {
    document.getElementById('dialog-text').textContent =
      'Sumbangkan hasil panen, hutan, pantai, atau tambang untuk memajukan fasilitas Desa Asri dan dapatkan hadiah spesial dari Balai Desa:';
  }

  const actions = document.getElementById('dialog-actions');
  actions.innerHTML = '';

  for (const bundle of VILLAGE_BUNDLES) {
    const isDone = Boolean(state.completedBundles[bundle.id]);
    const reqParts = [];
    let canSubmit = !isDone && !isMidnight();
    for (const [itemId, needQty] of Object.entries(bundle.items)) {
      const have = countItem(itemId);
      if (have < needQty) canSubmit = false;
      reqParts.push(`${ITEMS[itemId].icon} ${ITEMS[itemId].name} (${have}/${needQty})`);
    }

    const btn = document.createElement('button');
    btn.className = `hud-btn ${canSubmit ? 'primary-btn' : ''}`;
    btn.disabled = !canSubmit;
    btn.style.opacity = isDone ? '0.6' : canSubmit ? '1' : '0.55';
    btn.textContent = isDone
      ? `✅ ${bundle.title} (Selesai)`
      : `${bundle.title} — Butuh: ${reqParts.join(', ')} | ${bundle.desc}`;

    if (canSubmit) {
      btn.addEventListener('click', () => {
        for (const [itemId, needQty] of Object.entries(bundle.items)) {
          removeItem(itemId, needQty);
        }
        state.completedBundles[bundle.id] = true;
        if (bundle.rewardGold > 0) state.gold += bundle.rewardGold;
        if (bundle.rewardItem && bundle.rewardQty > 0) addItem(bundle.rewardItem, bundle.rewardQty);
        persistLightSave();
        updateHUD();
        showToast(`🏛️ ${bundle.title} selesai! (${bundle.desc})`);
        openVillageBundleDialog();
      });
    }
    actions.appendChild(btn);
  }

  const closeB = document.createElement('button');
  closeB.className = 'hud-btn';
  closeB.textContent = 'Tutup';
  closeB.addEventListener('click', closeAllModals);
  actions.appendChild(closeB);
}

// =========================================================
// 12B. SISTEM PROLOG & STORY QUEST UTAMA (DOKUMEN GDOCS)
// =========================================================
let curPrologIndex = 0;

function checkStory1_5Done() {
  if (state.story.herbSubmitted1_5 && state.story.ironSubmitted1_5) {
    advanceStoryQuest('story_1_5');
  }
}

function advanceStoryQuest(questId) {
  const sq = STORY_QUESTS.find((q) => q.id === questId);
  if (!sq) return;

  state.story.completedQuests[questId] = true;
  if (sq.rewardGold) state.gold += sq.rewardGold;
  if (sq.rewardItems) {
    sq.rewardItems.forEach((it) => addItem(it.id, it.qty));
  }
  if (sq.affReward) {
    for (const [nid, val] of Object.entries(sq.affReward)) {
      state.story.affPercent[nid] = (state.story.affPercent[nid] || 0) + val;
    }
  }
  if (sq.affRewardAll) {
    for (const nid of Object.keys(state.story.affPercent)) {
      state.story.affPercent[nid] = (state.story.affPercent[nid] || 0) + sq.affRewardAll;
    }
  }

  // Tentukan quest selanjutnya
  const curIdx = STORY_QUESTS.findIndex((q) => q.id === questId);
  if (curIdx !== -1 && curIdx < STORY_QUESTS.length - 1) {
    state.story.currentQuestId = STORY_QUESTS[curIdx + 1].id;
  } else {
    state.story.currentQuestId = 'all_done';
  }

  persistLightSave();
  updateHUD();
  renderHotbar();
  updateQuestTrackerUI();

  showToast(`🎉 Bab Cerita ${sq.num}: "${sq.title}" Tuntas! (+${sq.rewardGold}G)`);
}

function openMeteorCraterDialog() {
  resetMovementInputs();
  const modal = document.getElementById('dialog-modal');
  modal.classList.remove('hidden');
  document.getElementById('dialog-portrait').textContent = '🔮';
  document.getElementById('dialog-name').textContent = 'Kawah Benda Jatuh dari Langit';
  document.getElementById('dialog-role').textContent = 'Hutan Selatan Desa Forhest';

  const storyId = state.story.currentQuestId;
  let text = 'Di sinilah Ryu pertama kali menemukan bola bercahaya misterius di tengah kobaran api malam itu. Anehnya, keesokan paginya seluruh bekas kebakaran telah lenyap bersih tanpa jejak!';

  if (storyId === 'story_1_3') {
    text += '\n\nSaat ini Pak Roden dan Pak Bohei mengajakmu membangun pos pengamanan dan pagar pelindung di sini (butuh 20 Kayu, 20 Batu, 5 Herb).';
  } else if (storyId === 'story_1_4') {
    text += '\n\nPondok pengamanan ini sempat diserang oleh komplotan bandit tadi malam! Warga desa bahu-membahu memperbaikinya.';
  }

  document.getElementById('dialog-text').textContent = text;
  const actions = document.getElementById('dialog-actions');
  actions.innerHTML = '';

  const readPrologBtn = document.createElement('button');
  readPrologBtn.className = 'hud-btn highlight-btn';
  readPrologBtn.textContent = '📖 Putar Ulang Kisah Jatuhnya Benda Langit';
  readPrologBtn.addEventListener('click', () => {
    openPrologModal(1);
  });
  actions.appendChild(readPrologBtn);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'hud-btn primary-btn';
  closeBtn.textContent = 'Tutup';
  closeBtn.addEventListener('click', closeAllModals);
  actions.appendChild(closeBtn);
}

function openPrologModal(idx = 0) {
  closeAllModals();
  curPrologIndex = Math.max(0, Math.min(PROLOG_SLIDES.length - 1, idx));
  const modal = document.getElementById('prolog-modal');
  if (!modal) return;
  modal.classList.remove('hidden');

  // Set default ke Tab 1 (Prolog Slider)
  const tabProlog = document.getElementById('tab-prolog-story');
  const tabQuests = document.getElementById('tab-story-quests');
  const slideBox = document.getElementById('prolog-slide-container');
  const questBox = document.getElementById('story-quests-container');

  if (tabProlog) tabProlog.classList.add('active');
  if (tabQuests) tabQuests.classList.remove('active');
  if (slideBox) slideBox.classList.remove('hidden');
  if (questBox) questBox.classList.add('hidden');

  renderPrologSlide(curPrologIndex);
}

function renderPrologSlide(idx) {
  const slide = PROLOG_SLIDES[idx];
  if (!slide) return;

  const artBox = document.getElementById('prolog-art-box');
  if (artBox) artBox.style.background = slide.bg;
  document.getElementById('prolog-badge').textContent = slide.badge;
  document.getElementById('prolog-icon').textContent = slide.icon;
  document.getElementById('prolog-slide-title').textContent = slide.title;
  document.getElementById('prolog-slide-sub').textContent = slide.subtitle;

  document.getElementById('prolog-speaker-avatar').textContent = slide.speakerAvatar;
  document.getElementById('prolog-speaker-name').textContent = slide.speaker;
  document.getElementById('prolog-dialog-text').textContent = slide.dialog;

  document.getElementById('prolog-step-indicator').textContent = `Bab ${slide.step} / ${PROLOG_SLIDES.length}`;

  const prevBtn = document.getElementById('btn-prolog-prev');
  const nextBtn = document.getElementById('btn-prolog-next');

  if (prevBtn) prevBtn.style.visibility = idx === 0 ? 'hidden' : 'visible';
  if (nextBtn) {
    if (idx === PROLOG_SLIDES.length - 1) {
      nextBtn.textContent = 'Mulai Petualangan ▶';
    } else {
      nextBtn.textContent = 'Lanjut ▶';
    }
  }
}

function nextPrologSlide() {
  if (curPrologIndex < PROLOG_SLIDES.length - 1) {
    curPrologIndex++;
    renderPrologSlide(curPrologIndex);
  } else {
    finishProlog(false);
  }
}

function prevPrologSlide() {
  if (curPrologIndex > 0) {
    curPrologIndex--;
    renderPrologSlide(curPrologIndex);
  }
}

function finishProlog(fromSkip = false) {
  closeAllModals();
  if (!state.story.hasSeenProlog) {
    state.story.hasSeenProlog = true;
    state.story.completedQuests['story_1_1'] = true;
    state.story.currentQuestId = 'story_1_2';

    // Berikan reward Quest 1.1 sesuai dokumen GDocs:
    // Aff Pak Bohei +1%, Gold +1500, Herb +5, Snack +5, Water Bottle +5, Kayu +10, Batu +10, dan Bola Kaca Misterius
    state.gold += 1500;
    state.story.affPercent.bohei = (state.story.affPercent.bohei || 0) + 1;
    addItem('mystery_orb', 1);
    addItem('herb', 5);
    addItem('snack', 5);
    addItem('water_bottle', 5);
    addItem('wood', 10);
    addItem('stone', 10);

    persistLightSave();
    updateHUD();
    renderHotbar();
    updateQuestTrackerUI();

    showToast('🎉 Prolog Selesai! Kamu menerima Bola Kaca Misterius, perlengkapan awal & 1.500 G dari Pak Bohei!');
  } else {
    showToast('📜 Membaca ulang prolog selesai.');
  }
}

function renderStoryQuestsUI() {
  const listEl = document.getElementById('story-quest-cards-list');
  const affGrid = document.getElementById('story-aff-grid');
  if (!listEl || !affGrid) return;

  listEl.innerHTML = '';
  STORY_QUESTS.forEach((sq) => {
    const isCompleted = state.story.completedQuests[sq.id];
    const isCurrent = state.story.currentQuestId === sq.id;

    const card = document.createElement('div');
    card.className = `story-card ${isCurrent ? 'active-quest' : ''} ${isCompleted ? 'completed' : ''}`;

    let statusText = 'Terkunci';
    let statusClass = 'locked';
    if (isCompleted) {
      statusText = '✅ Selesai';
      statusClass = 'done';
    } else if (isCurrent) {
      statusText = '🔥 Berjalan';
      statusClass = 'ongoing';
    }

    card.innerHTML = `
      <div class="story-card-header">
        <span class="story-card-title">${sq.giverPortrait} Bab ${sq.num}: ${sq.title}</span>
        <span class="story-card-status ${statusClass}">${statusText}</span>
      </div>
      <div class="story-card-desc">${sq.summary}</div>
      <div class="muted-tip" style="margin:2px 0;">🎯 <b>Tugas:</b> ${sq.reqText}</div>
      <div class="story-card-rewards">🎁 Hadiah: +${sq.rewardGold} G ${sq.rewardItems ? sq.rewardItems.map((i) => '+ ' + i.qty + 'x ' + (ITEMS[i.id]?.name || i.id)).join(', ') : ''}</div>
    `;
    listEl.appendChild(card);
  });

  // Render Hubungan (Affection) seluruh warga
  affGrid.innerHTML = '';
  NPCS.forEach((npc) => {
    const aff = state.story.affPercent[npc.id] || 0;
    const item = document.createElement('div');
    item.className = 'aff-item';
    item.innerHTML = `
      <span class="aff-item-portrait">${npc.portrait}</span>
      <div class="aff-item-info">
        <span class="aff-item-name">${npc.name}</span>
        <span class="aff-item-val">❤️ ${aff}%</span>
      </div>
    `;
    affGrid.appendChild(item);
  });
}

// =========================================================
// 13. SISTEM DAILY LOGIN REWARD (REAL-TIME PER HARI DUNIA NYATA)
// =========================================================
function canClaimDailyLoginToday() {
  return dailyLogin.lastClaimDate !== getRealWorldDateKey();
}

function updateDailyLoginDot() {
  const dot = document.getElementById('gift-dot');
  if (canClaimDailyLoginToday()) dot.classList.remove('hidden');
  else dot.classList.add('hidden');
}

function renderDailyLoginModal() {
  const grid = document.getElementById('login-streak-grid');
  grid.innerHTML = '';
  const claimable = canClaimDailyLoginToday();
  const currentTargetIdx = dailyLogin.streakCount % DAILY_LOGIN_REWARDS.length;

  DAILY_LOGIN_REWARDS.forEach((rw, idx) => {
    const isClaimed = idx < currentTargetIdx || (!claimable && idx === (dailyLogin.streakCount - 1 + 7) % 7 && dailyLogin.streakCount > 0 && idx < ((dailyLogin.streakCount - 1) % 7) + 1);
    const isToday = claimable && idx === currentTargetIdx;

    const card = document.createElement('div');
    card.className = `login-day-card ${isClaimed && !isToday ? 'claimed' : ''} ${isToday ? 'today' : ''}`;
    card.innerHTML = `
      <span class="ld-title">${rw.label}</span>
      <span class="ld-icon">${isClaimed && !isToday ? '✅' : rw.icon}</span>
      <span class="ld-desc">${rw.desc}</span>
    `;
    grid.appendChild(card);
  });

  const statusTxt = document.getElementById('login-status-text');
  const claimBtn = document.getElementById('btn-claim-daily');
  if (claimable) {
    const rw = DAILY_LOGIN_REWARDS[currentTargetIdx];
    statusTxt.textContent = `Hadiah Login ke-${currentTargetIdx + 1}: ${rw.desc}`;
    claimBtn.disabled = false;
    claimBtn.style.opacity = '1';
    claimBtn.textContent = '🎉 Klaim Gratis Sekarang!';
  } else {
    statusTxt.textContent = '✅ Kamu sudah klaim hadiah hari ini! Kembali lagi besok (ganti tanggal nyata).';
    claimBtn.disabled = true;
    claimBtn.style.opacity = '0.45';
    claimBtn.textContent = 'Sudah Diklaim Hari Ini';
  }
}

document.getElementById('btn-daily-login').addEventListener('click', () => {
  closeAllModals();
  renderDailyLoginModal();
  document.getElementById('login-modal').classList.remove('hidden');
});

document.getElementById('btn-claim-daily').addEventListener('click', () => {
  if (!canClaimDailyLoginToday()) return;
  const idx = dailyLogin.streakCount % DAILY_LOGIN_REWARDS.length;
  const rw = DAILY_LOGIN_REWARDS[idx];

  if (rw.gold > 0) state.gold += rw.gold;
  if (rw.itemId && rw.qty > 0) addItem(rw.itemId, rw.qty);

  dailyLogin.streakCount += 1;
  dailyLogin.lastClaimDate = getRealWorldDateKey();
  persistDailyLogin();
  persistLightSave();
  updateHUD();
  updateDailyLoginDot();
  renderDailyLoginModal();
  showToast(`🎁 Klaim Login Harian berhasil: ${rw.desc}!`);
});

// =========================================================
// 14. HUD, INVENTORY, CRAFTING, & KUSTOMISASI
// =========================================================
function updateHUD() {
  const phase = TIME_PHASES[state.phaseIndex];
  document.getElementById('hud-weekday').textContent = DAYS_OF_WEEK[state.weekdayIndex];
  document.getElementById('hud-phase').textContent = phase.label;

  const hourFloat = getCurrentGameHourFloat();
  if (state.phaseIndex === 3) {
    document.getElementById('hud-clock').textContent = '00:00';
  } else {
    const hh = String(Math.floor(hourFloat) % 24).padStart(2, '0');
    const mm = String(Math.floor((hourFloat % 1) * 6) * 10).padStart(2, '0');
    document.getElementById('hud-clock').textContent = `${hh}:${mm}`;
  }

  document.getElementById('hud-weather').textContent = state.weather === 'rain' ? '🌧️' : '☀️';
  document.getElementById('hud-gold').textContent = state.gold;

  const pct = Math.max(0, Math.min(100, (state.energy / state.maxEnergy) * 100));
  const fillEl = document.getElementById('hud-energy-fill');
  fillEl.style.width = `${pct.toFixed(2)}%`;
  if (pct <= 15) {
    fillEl.style.background = 'linear-gradient(90deg, #d62828, #f77f00)';
  } else if (pct <= 35) {
    fillEl.style.background = 'linear-gradient(90deg, #f4a261, #e9c46a)';
  } else {
    fillEl.style.background = 'linear-gradient(90deg, #5cc843, #a8e85b)';
  }
  document.getElementById('hud-energy-text').textContent = `${Math.round(pct)}%`;

  const midBanner = document.getElementById('midnight-banner');
  if (isMidnight()) midBanner.classList.remove('hidden');
  else midBanner.classList.add('hidden');
}

function renderHotbar() {
  const hb = document.getElementById('hotbar');
  if (!hb) return;
  hb.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const slot = state.slots[i];
    const div = document.createElement('div');
    div.className = `slot ${state.activeSlot === i ? 'active' : ''}`;
    div.innerHTML = `<span class="slot-key">${i + 1}</span>`;
    if (slot && ITEMS[slot.id]) {
      const def = ITEMS[slot.id];
      div.innerHTML += `<span class="slot-icon">${def.icon || '📦'}</span>`;
      if (def.stackable && slot.qty > 1) div.innerHTML += `<span class="slot-qty">${slot.qty}</span>`;
      div.title = `${def.name || slot.id}: ${def.desc || ''}`;
    }
    div.addEventListener('click', () => {
      if (isFishingActive()) cancelFishing();
      state.activeSlot = i;
      renderHotbar();
    });
    hb.appendChild(div);
  }

  const active = state.slots[state.activeSlot];
  const label = document.getElementById('active-item-label');
  if (label) {
    if (isMidnight()) {
      label.textContent = '🌌 Tengah Malam (00:00) — Pulang ke Rumah & tidur di Kasur untuk mulai pagi baru';
    } else if (active && ITEMS[active.id]) {
      const d = ITEMS[active.id];
      label.textContent = `${d.icon || ''} ${d.name || active.id} — ${d.desc || ''}`;
    } else {
      label.textContent = 'Tangan Kosong — Dekati pintu/gerbang lalu klik tombol untuk pindah peta';
    }
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
    let canCraft = !isMidnight();
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
    btn.textContent = isMidnight() ? '🌌 Terkunci' : '🔨 Buat';
    btn.addEventListener('click', () => {
      if (isMidnight()) return;
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
// 15. EVENT LISTENERS
// =========================================================
const keys = new Set();
const touchDirs = { up: false, down: false, left: false, right: false };

function resetMovementInputs() {
  keys.clear();
  touchDirs.up = false;
  touchDirs.down = false;
  touchDirs.left = false;
  touchDirs.right = false;
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden'));
  resetMovementInputs();
  if (fishingState.mode === 'charging') cancelFishing();
}

function isAnyModalOpen() {
  return Array.from(document.querySelectorAll('.modal')).some((m) => !m.classList.contains('hidden'));
}

function openPauseModal() {
  closeAllModals();
  document.getElementById('pause-modal').classList.remove('hidden');
}

document.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', closeAllModals));
document.getElementById('btn-context-interact').addEventListener('click', executeContextAction);

// Listener Tombol & Tab Story Prolog (Dokumen GDocs)
const btnStoryProlog = document.getElementById('btn-story-prolog');
if (btnStoryProlog) {
  btnStoryProlog.addEventListener('click', () => {
    openPrologModal(0);
  });
}

const tabPrologStory = document.getElementById('tab-prolog-story');
const tabStoryQuests = document.getElementById('tab-story-quests');
const prologSlideCont = document.getElementById('prolog-slide-container');
const storyQuestsCont = document.getElementById('story-quests-container');

if (tabPrologStory && tabStoryQuests) {
  tabPrologStory.addEventListener('click', () => {
    tabPrologStory.classList.add('active');
    tabStoryQuests.classList.remove('active');
    if (prologSlideCont) prologSlideCont.classList.remove('hidden');
    if (storyQuestsCont) storyQuestsCont.classList.add('hidden');
    renderPrologSlide(curPrologIndex);
  });

  tabStoryQuests.addEventListener('click', () => {
    tabStoryQuests.classList.add('active');
    tabPrologStory.classList.remove('active');
    if (prologSlideCont) prologSlideCont.classList.add('hidden');
    if (storyQuestsCont) storyQuestsCont.classList.remove('hidden');
    renderStoryQuestsUI();
  });
}

const btnPrologNext = document.getElementById('btn-prolog-next');
if (btnPrologNext) {
  btnPrologNext.addEventListener('click', nextPrologSlide);
}

const btnPrologPrev = document.getElementById('btn-prolog-prev');
if (btnPrologPrev) {
  btnPrologPrev.addEventListener('click', prevPrologSlide);
}

const btnPrologSkip = document.getElementById('btn-prolog-skip');
if (btnPrologSkip) {
  btnPrologSkip.addEventListener('click', () => finishProlog(true));
}

document.getElementById('btn-open-inv').addEventListener('click', () => {
  if (isMidnight()) {
    showToast('🌌 Sudah Tengah Malam! Pulanglah ke Rumah & tidur di Kasur.');
    return;
  }
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

document.getElementById('btn-pause').addEventListener('click', () => {
  const pauseModal = document.getElementById('pause-modal');
  if (!pauseModal.classList.contains('hidden')) {
    closeAllModals();
  } else {
    openPauseModal();
  }
});

document.getElementById('btn-resume-game').addEventListener('click', closeAllModals);
document.getElementById('btn-pause-inv').addEventListener('click', () => {
  if (isMidnight()) {
    closeAllModals();
    showToast('🌌 Sudah Tengah Malam! Pulanglah ke Rumah & tidur di Kasur.');
    return;
  }
  closeAllModals();
  renderInventoryAndCrafting();
  document.getElementById('inv-modal').classList.remove('hidden');
});
document.getElementById('btn-pause-help').addEventListener('click', () => {
  closeAllModals();
  document.getElementById('help-modal').classList.remove('hidden');
});

window.addEventListener('blur', resetMovementInputs);

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;

  if (e.key === 'Escape') {
    if (isAnyModalOpen()) {
      closeAllModals();
    } else {
      openPauseModal();
    }
    return;
  }
  if (e.key === 'i' || e.key === 'I' || e.key === 'c' || e.key === 'C') {
    if (isMidnight()) {
      showToast('🌌 Tengah Malam! Tidak bisa crafting sekarang — tidur dulu di Kasur Rumah.');
      return;
    }
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
    if (isFishingActive()) cancelFishing();
    state.activeSlot = Number(e.key) - 1;
    renderHotbar();
    return;
  }
  if (e.code === 'Space') {
    e.preventDefault();
    if (fishingState.mode === 'reeling') {
      if (!e.repeat) handleFishingReelClick();
      return;
    }
    if (isFishingRodSelected()) {
      if (!e.repeat && fishingState.mode === 'idle') startFishingCharge();
      return;
    }
    if (!e.repeat) {
      const { tx, ty } = getTargetTileCoord();
      useActiveItemOnTile(tx, ty);
    }
    return;
  }
  if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
    if (isFishingActive()) return;
    executeContextAction();
    return;
  }
  keys.add(e.key.toLowerCase());
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.key.toLowerCase());
  if (e.code === 'Space' && fishingState.mode === 'charging') {
    releaseFishingCast();
  }
});

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (isAnyModalOpen() || state.isTransitioning || e.button !== 0) return;

  if (fishingState.mode === 'reeling') {
    handleFishingReelClick();
    return;
  }
  if (isFishingActive()) return;

  if (isFishingRodSelected()) {
    startFishingCharge();
    return;
  }

  const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
  const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
  const worldX = camera.position.x + ndcX * camera.right;
  const worldY = camera.position.y + ndcY * camera.top;
  useActiveItemOnTile(Math.round(worldX), Math.round(worldY));
});

window.addEventListener('pointerup', (e) => {
  if (e.button === 0 && fishingState.mode === 'charging') {
    releaseFishingCast();
  }
});

document.querySelectorAll('.dpad-btn').forEach((btn) => {
  const dir = btn.dataset.dir;
  const start = (ev) => { ev.preventDefault(); touchDirs[dir] = true; };
  const end = (ev) => { ev.preventDefault(); touchDirs[dir] = false; };
  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointerleave', end);
});

const mobActionBtn = document.getElementById('mob-action');
mobActionBtn.addEventListener('pointerdown', (ev) => {
  ev.preventDefault();
  if (isAnyModalOpen() || state.isTransitioning) return;
  if (fishingState.mode === 'reeling') {
    handleFishingReelClick();
    return;
  }
  if (isFishingActive()) return;
  if (isFishingRodSelected()) {
    startFishingCharge();
    return;
  }
  const { tx, ty } = getTargetTileCoord();
  useActiveItemOnTile(tx, ty);
});
mobActionBtn.addEventListener('pointerup', (ev) => {
  ev.preventDefault();
  if (fishingState.mode === 'charging') {
    releaseFishingCast();
  }
});
document.getElementById('mob-interact').addEventListener('click', executeContextAction);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateCameraFrustum();
});

// =========================================================
// 16. GAME LOOP (5-MIN PHASE TIMER, LIGHTING PER ZONA WAKTU, COLLISION)
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

  waterAnimTimer += dt;
  if (waterAnimTimer > 0.65) {
    waterAnimTimer = 0;
    waterFrame = (waterFrame + 1) % 2;
    for (const t of curWorld.tiles.values()) {
      if (t.groundType === 'water') t.mesh.material = MATS.water[waterFrame];
    }
  }

  if (!isAnyModalOpen() && !state.isTransitioning) {
    // 1. Timer 5 Menit (300 detik) per Fase Zona Waktu (Berhenti otomatis saat mencapai Tengah Malam!)
    const curPhase = TIME_PHASES[state.phaseIndex];
    if (curPhase.durationSec !== null) {
      state.phaseElapsedSec += dt;
      if (state.phaseElapsedSec >= curPhase.durationSec) {
        advanceToNextTimePhase();
      }
    }

    // 2. Warna & Atmosfer sesuai Zona Waktu (Pagi cerah -> Siang/Sore hangat -> Malam biru -> Tengah Malam gelap pekat)
    let overlayColor = 0x0c1638;
    let nightAlpha = 0;
    if (state.currentScene === 'mine') {
      nightAlpha = 0.3;
    } else if (!curWorld.meta.isIndoor) {
      if (state.phaseIndex === 0) {
        nightAlpha = state.weather === 'rain' ? 0.16 : 0.0;
      } else if (state.phaseIndex === 1) {
        overlayColor = 0x5c2c0c; // Semburat senja keemasan di akhir Siang/Sore
        const r = state.phaseElapsedSec / 300;
        nightAlpha = r > 0.5 ? (r - 0.5) * 0.42 : 0;
      } else if (state.phaseIndex === 2) {
        overlayColor = 0x0d1b3e;
        nightAlpha = 0.42;
      } else if (state.phaseIndex === 3) {
        overlayColor = 0x070b1e;
        nightAlpha = 0.62;
      }
    } else if (state.phaseIndex === 3) {
      nightAlpha = 0.22; // Dalam rumah ikut temaram saat Tengah Malam
    }
    nightOverlay.material.color.setHex(overlayColor);
    nightOverlay.material.opacity = nightAlpha;

    for (const t of curWorld.tiles.values()) {
      if (t.placed && t.placed.glow) {
        t.placed.glow.visible = state.phaseIndex >= 2 || state.weather === 'rain';
      }
    }

    // 3. Gerak Player & Pengurangan Stamina Kontinyu (Terkunci diam saat proses memancing aktif)
    let mx = 0;
    let my = 0;
    if (!isFishingActive()) {
      if (keys.has('w') || keys.has('arrowup') || touchDirs.up) my += 1;
      if (keys.has('s') || keys.has('arrowdown') || touchDirs.down) my -= 1;
      if (keys.has('a') || keys.has('arrowleft') || touchDirs.left) mx -= 1;
      if (keys.has('d') || keys.has('arrowright') || touchDirs.right) mx += 1;
    }

    const moving = mx !== 0 || my !== 0;
    if (moving) {
      setDirectionFromVector(mx, my);
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;

      const baseSpeed = isMidnight() ? 3.8 : state.energy <= 0 ? 3.6 : 4.35;
      const speed = baseSpeed * dt;
      const tryX = state.player.x + mx * speed;
      const tryY = state.player.y + my * speed;
      if (!isBlockedInCurrentScene(tryX, state.player.y)) state.player.x = tryX;
      if (!isBlockedInCurrentScene(state.player.x, tryY)) state.player.y = tryY;
    }

    if (state.player.workActivityTimer > 0) {
      state.player.workActivityTimer = Math.max(0, state.player.workActivityTimer - dt);
    }

    // Pengurangan Stamina:
    // - Berhenti total saat UI terbuka (sudah dijaga oleh !isAnyModalOpen()) atau saat transisi peta
    // - Saat diam: IDLE_STAMINA_DRAIN_PER_SEC (0.025% / detik -> 2x lebih lama/awet dari 0.05%/detik)
    // - Saat bergerak/berjalan ATAU beraktivitas (mining, memancing, buka lahan, bertani, menyiram): 2x lebih banyak dibanding saat diam
    if (!isMidnight() && state.energy > 0) {
      const isActive = moving || state.player.workActivityTimer > 0;
      const drainPerSec = IDLE_STAMINA_DRAIN_PER_SEC * (isActive ? ACTIVE_STAMINA_MULTIPLIER : 1.0);
      state.energy = Math.max(0, state.energy - drainPerSec * dt);
    }

    updateHUD();

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

    updateAndRenderFishing(dt, elapsed);

    const { tx, ty } = getTargetTileCoord();
    const canShowTileSelector =
      !isMidnight() &&
      !isFishingActive() &&
      (state.currentScene === 'farm' || state.currentScene === 'forest_beach' || state.currentScene === 'mine');
    tileSelector.visible = canShowTileSelector;
    tileSelector.position.set(tx, ty, 0.2);

    // 4. Tombol Kontekstual
    const ctxAct = getActiveContextAction();
    const banner = document.getElementById('portal-banner');
    const btnCtx = document.getElementById('btn-context-interact');
    if (ctxAct) {
      banner.classList.remove('hidden');
      btnCtx.innerHTML = `${ctxAct.label} <kbd>E</kbd>`;
    } else {
      banner.classList.add('hidden');
    }

    // 5. AI NPC (sembunyikan/istirahatkan saat Tengah Malam)
    for (const npc of curWorld.npcs) {
      npc.group.visible = !isMidnight();
      if (isMidnight()) continue;

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

    // 6. AI HEWAN TERNAK & HEWAN LIAR (Kabur saat didekati player)
    const px = state.player.x;
    const py = state.player.y;

    for (const anim of curWorld.animals) {
      anim.group.visible = true;
      const aData = anim.group.userData;

      // 1. Jika hewan mati / bangkai: diam membeku & tampilkan tekstur bangkai
      if (anim.isDead) {
        aData.sprite.material.map = getPropTexture('animal_carcass');
        anim.group.position.x = anim.x;
        anim.group.position.y = anim.y;
        applyYSort(anim.group, anim.y);
        continue;
      }

      // 2. Jika ayam di sarang petelur: diam di sarangnya
      if (anim.isNesting) {
        anim.group.position.x = anim.homeX;
        anim.group.position.y = anim.homeY;
        applyYSort(anim.group, anim.homeY);
        continue;
      }

      // Update cooldown deteksi (2 detik)
      if (anim.detectCooldown > 0) {
        anim.detectCooldown = Math.max(0, anim.detectCooldown - dt);
      }

      // Deteksi jika player berjalan ke arah hewan (khusus hewan liar di desa & hutan, BUKAN hewan gudang ternak)
      if (!anim.isFarmPen && !anim.isBarnIndoor && anim.detectCooldown <= 0 && moving) {
        const distToPlayer = Math.hypot(anim.x - px, anim.y - py);
        // Jika player mendekat dalam jarak deteksi (radius ~2.8 tile)
        if (distToPlayer < 2.8) {
          // Arah dari player menjauh ke hewan (arah kabur)
          let fleeDx = anim.x - px;
          let fleeDy = anim.y - py;
          const fleeLen = Math.hypot(fleeDx, fleeDy) || 1;
          fleeDx /= fleeLen;
          fleeDy /= fleeLen;

          // Hewan mulai berlari dengan kecepatan sama dengan player (4.35 tile/detik)
          // Menempuh beberapa langkah (sekitar 2.2 tile) lalu cooldown 2 detik
          const fleeDistance = 2.2;
          const candTargetX = anim.x + fleeDx * fleeDistance;
          const candTargetY = anim.y + fleeDy * fleeDistance;

          if (!isBlockedInCurrentScene(candTargetX, candTargetY)) {
            anim.targetX = candTargetX;
            anim.targetY = candTargetY;
          } else {
            // Jika terhalang dinding, coba arah menyamping
            anim.targetX = anim.x - fleeDy * fleeDistance;
            anim.targetY = anim.y + fleeDx * fleeDistance;
          }

          anim.fleeTimer = 0.55; // durasi sprint beberapa langkah
          anim.detectCooldown = 2.0; // Cooldown deteksi selama 2 detik!
          spawnBurst2D(anim.x, anim.y, 0xffd166, 3);
        }
      }

      // Pergerakan hewan menuju targetX, targetY
      const adx = anim.targetX - anim.x;
      const ady = anim.targetY - anim.y;
      const adist = Math.hypot(adx, ady);

      // Kecepatan lari sama dengan user (4.35) jika sedang flee, atau jalan santai (0.85) jika roaming
      const isFleeing = anim.fleeTimer > 0;
      if (anim.fleeTimer > 0) anim.fleeTimer = Math.max(0, anim.fleeTimer - dt);

      let moveSpeed = isFleeing ? 4.35 : 0.85;
      if (anim.isSick) moveSpeed = 0.28; // Hewan sakit berjalan sangat pelan

      if (adist > 0.08) {
        const step = Math.min(adist, moveSpeed * dt);
        const nx = anim.x + (adx / adist) * step;
        const ny = anim.y + (ady / adist) * step;

        let canMove = !isBlockedInCurrentScene(nx, ny);

        // Batasan pergerakan khusus di dalam Gudang Ternak:
        if (anim.isBarnIndoor) {
          if (anim.type === 'cow') {
            // Sapi HANYA bisa bergerak di dalam area pagar sebelah kiri: [-6.8, -2.6], [-3.6, 3.2]
            if (nx < -6.8 || nx > -2.6 || ny < -3.6 || ny > 3.2) canMove = false;
          } else {
            // Ayam bebas bergerak di mana saja di dalam gudang selain kandang sapi (x >= -1.4)
            if (nx < -1.4 || nx > 7.0 || ny < -4.4 || ny > 4.6) canMove = false;
          }
        }

        if (canMove) {
          anim.x = nx;
          anim.y = ny;
        } else {
          anim.targetX = anim.x;
          anim.targetY = anim.y;
        }

        if (Math.abs(adx) > Math.abs(ady)) anim.dir = adx >= 0 ? 'right' : 'left';
        else anim.dir = ady >= 0 ? 'up' : 'down';

        const stepSpeed = isFleeing ? 12 : anim.isSick ? 3 : 5;
        const f = Math.floor(elapsed * stepSpeed) % 2 === 0 ? 1 : 0;
        aData.sprite.material.map = aData.frames[anim.dir][f];
        anim.group.position.x = anim.x;
        anim.group.position.y = anim.y;
        applyYSort(anim.group, anim.y);
      } else {
        aData.sprite.material.map = aData.frames[anim.dir][0];
        anim.waitTimer -= dt;
        if (anim.waitTimer <= 0) {
          anim.waitTimer = 2.5 + Math.random() * 3.5;
          if (anim.isBarnIndoor) {
            if (anim.type === 'cow') {
              // Sapi roaming di dalam area pagar pen sapi [-6.4, -2.8], [-3.2, 3.0]
              anim.targetX = -6.4 + Math.random() * 3.6;
              anim.targetY = -3.2 + Math.random() * 6.0;
            } else {
              // Ayam roaming bebas di area luar kandang sapi [0.5, 6.5], [-3.6, 3.8]
              anim.targetX = 0.5 + Math.random() * 6.0;
              anim.targetY = -3.6 + Math.random() * 7.2;
            }
          } else {
            const range = anim.isFarmPen ? 1.4 : 2.5;
            anim.targetX = anim.homeX + (Math.random() * range * 2 - range);
            anim.targetY = anim.homeY + (Math.random() * range * 2 - range);
          }
        }
      }
    }
  }

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

// Inisialisasi Awal
mountSceneImmediate('house', -2.2, 1.0, 'down');
updateHUD();
renderHotbar();
updateDailyLoginDot();
updateQuestTrackerUI();

// Jika pemain belum melihat prolog (game baru), otomatis putar Prolog Cerita awal!
if (!state.story.hasSeenProlog) {
  setTimeout(() => {
    openPrologModal(0);
  }, 400);
}

// Jika hari ini (real-time) belum klaim hadiah login harian, munculkan pengingat ramah
if (canClaimDailyLoginToday()) {
  showToast('🎁 Hadiah Login Harian gratis siap diklaim! Klik tombol "🎁 Hadiah Harian" di kanan atas.');
} else {
  showToast(`🌅 Hari ${DAYS_OF_WEEK[state.weekdayIndex]} pukul 06:00 Pagi dimulai!`);
}

tick();
