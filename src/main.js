import * as THREE from 'three';
import { ITEMS, CROPS, RECIPES, NPCS, CUSTOMIZATION_OPTIONS } from './data.js';
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
  createSpritePlane,
  createLabel2D
} from './sprites2d.js';

const SAVE_KEY = 'cozy_valley_2d_beta_v2';
const GRID_HALF = 12; // Peta 25x25 tile (X: kiri-kanan, Y: bawah-atas di layar 2D)

// =========================================================
// 1. STATE PERMAINAN (PLAYER, INVENTORY, WAKTU, DUNIA)
// =========================================================
const state = {
  day: 1,
  minutes: 6 * 60, // 06:00 pagi
  weather: 'sunny',
  gold: 150,
  energy: 100,
  maxEnergy: 100,
  activeSlot: 0,
  player: {
    name: 'Bayu',
    x: 0,
    y: -1, // Di depan rumah
    dir: 'down', // 'down' | 'up' | 'left' | 'right'
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
    { id: 'seed_turnip', qty: 6 },
    { id: 'seed_tomato', qty: 2 },
    null,
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
// 2. THREE.JS 2D ORTHOGRAPHIC CAMERA (PERSIS STARDEW VALLEY)
// =========================================================
const container = document.getElementById('game-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2d5a27);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// Berapa banyak tile terlihat secara vertikal (zoom ala Stardew Valley ~ 12.5 tile tinggi)
const VIEW_TILES_Y = 12.5;
const camera = new THREE.OrthographicCamera(-10, 10, 6, -6, 0.1, 100);
camera.position.set(0, -1, 20);

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

// Overlay warna Siang / Sore / Malam di atas seluruh map 2D
const nightOverlay = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshBasicMaterial({ color: 0x0c1638, transparent: true, opacity: 0.0, depthTest: false })
);
nightOverlay.position.z = 12;
nightOverlay.renderOrder = 900;
scene.add(nightOverlay);

// =========================================================
// 3. Y-SORTING HELPER (KARAKTER BISA DI BELAKANG / DI DEPAN POHON & RUMAH)
// =========================================================
function applyYSort(obj, footY, layerOffset = 0) {
  obj.position.z = 1 + (20 - footY) * 0.05 + layerOffset * 0.01;
  obj.renderOrder = Math.round((40 - footY) * 10 + layerOffset);
}

// =========================================================
// 4. PETA TILE 2D PIXEL ART (KEBUN, PLAZA DESA, TAMBANG, KOLAM)
// =========================================================
const tiles = new Map();
const tileGeo = new THREE.PlaneGeometry(1.005, 1.005);

function tileKey(x, y) {
  return `${x},${y}`;
}

function getTile(x, y) {
  return tiles.get(tileKey(x, y)) || null;
}

function makeTileMat(tex) {
  return new THREE.MeshBasicMaterial({ map: tex });
}

const matGrass = [0, 1, 2, 3].map((v) => makeTileMat(getTileTexture('grass', v)));
const matDirt = makeTileMat(getTileTexture('dirt'));
const matWetDirt = makeTileMat(getTileTexture('wet_dirt'));
const matWater = [makeTileMat(getTileTexture('water', 0)), makeTileMat(getTileTexture('water', 1))];
const matQuarry = makeTileMat(getTileTexture('quarry'));
const matPlaza = makeTileMat(getTileTexture('plaza'));

for (let x = -GRID_HALF; x <= GRID_HALF; x++) {
  for (let y = -GRID_HALF; y <= GRID_HALF; y++) {
    let groundType = 'grass';

    // Kolam air di Barat Daya (Kiri Bawah)
    if (x <= -6 && x >= -10 && y <= -5 && y >= -9) {
      groundType = 'water';
    }
    // Area Bukit Tambang (Mining Quarry) di Timur Laut (Kanan Atas)
    else if (x >= 5 && y >= 2) {
      groundType = 'quarry';
    }
    // Area Plaza Desa & Jalan Depan Rumah (Utara Tengah)
    else if ((x >= -6 && x <= 3 && y >= 2 && y <= 5) || (x === 0 && y >= 0 && y <= 2)) {
      groundType = 'plaza';
    }

    const grassIdx = Math.abs(x * 7 + y * 13) % 4;
    const mat =
      groundType === 'water'
        ? matWater[0]
        : groundType === 'quarry'
        ? matQuarry
        : groundType === 'plaza'
        ? matPlaza
        : matGrass[grassIdx];

    const mesh = new THREE.Mesh(tileGeo, mat);
    mesh.position.set(x, y, 0);
    scene.add(mesh);

    tiles.set(tileKey(x, y), {
      x,
      y,
      grassIdx,
      groundType,
      watered: false,
      crop: null,
      obstacle: null,
      placed: null,
      cropMesh: null,
      glowMesh: null,
      mesh
    });
  }
}

// =========================================================
// 5. BANGUNAN 2D PIXEL ART (RUMAH PETANI, SHIPPING BIN, TOKO PAK BUDI)
// =========================================================
const houseSprite = createSpritePlane(getHouseTexture(), 3.2, 3.2);
houseSprite.position.set(0, 4.5, 1);
applyYSort(houseSprite, 3.1);
scene.add(houseSprite);
const houseLabel = createLabel2D('🏠 Rumah (Tidur: E)', '#9de070');
houseLabel.position.set(0, 6.25, 11);
scene.add(houseLabel);

for (let bx = -1; bx <= 1; bx++) {
  for (let by = 4; by <= 5; by++) {
    const t = getTile(bx, by);
    if (t) t.obstacle = { kind: 'building', tag: 'house' };
  }
}

const binSprite = createSpritePlane(getBinTexture(), 1.15, 1.15);
binSprite.position.set(2, 3.15, 1);
applyYSort(binSprite, 2.8);
scene.add(binSprite);
const binLabel = createLabel2D('📦 Kotak Jual (E)', '#ffd166');
binLabel.position.set(2, 4.05, 11);
scene.add(binLabel);
getTile(2, 3).obstacle = { kind: 'building', tag: 'bin' };

const shopSprite = createSpritePlane(getShopTexture(), 3.2, 2.4);
shopSprite.position.set(-4, 5.2, 1);
applyYSort(shopSprite, 4.1);
scene.add(shopSprite);
const shopLabel = createLabel2D('🏪 Toko Bibit Pak Budi', '#ffd166');
shopLabel.position.set(-4, 6.65, 11);
scene.add(shopLabel);
for (const sx of [-5, -4, -3]) {
  const t = getTile(sx, 5);
  if (t) t.obstacle = { kind: 'building', tag: 'shop' };
}

function spawnTree(x, y) {
  const t = getTile(x, y);
  if (!t || t.groundType !== 'grass' || t.obstacle || t.crop || t.placed) return;
  const mesh = createSpritePlane(getTreeTexture(), 2.0, 2.5);
  mesh.position.set(x, y + 0.85, 1);
  applyYSort(mesh, y - 0.15);
  scene.add(mesh);
  t.obstacle = { kind: 'tree', hp: 3, mesh };
}

function spawnRock(x, y, subKind = 'stone') {
  const t = getTile(x, y);
  if (!t || t.groundType === 'water' || t.obstacle || t.crop || t.placed) return;
  const mesh = createSpritePlane(getRockTexture(subKind), 1.0, 1.0);
  mesh.position.set(x, y + 0.08, 1);
  applyYSort(mesh, y - 0.2);
  scene.add(mesh);
  const hp = subKind === 'gold' ? 4 : subKind === 'copper' ? 3 : 2;
  t.obstacle = { kind: 'rock', subKind, hp, mesh };
}

function populateResources(initial = false) {
  const treeCoords = [
    [-9, 8], [-7, 7], [-9, 4], [-8, 1], [-9, -2],
    [-4, -8], [-2, -9], [3, -9], [7, -8], [9, -6], [8, -3], [-10, 6]
  ];
  for (const [tx, ty] of treeCoords) {
    if (initial || Math.random() < 0.35) spawnTree(tx, ty);
  }

  for (let rx = 5; rx <= 11; rx++) {
    for (let ry = 2; ry <= 10; ry++) {
      if (Math.random() < (initial ? 0.42 : 0.25)) {
        const roll = Math.random();
        const kind = roll > 0.84 ? 'gold' : roll > 0.5 ? 'copper' : 'stone';
        spawnRock(rx, ry, kind);
      }
    }
  }
}
populateResources(true);

for (let fx = -2; fx <= 1; fx++) {
  for (let fy = -3; fy <= -2; fy++) {
    const t = getTile(fx, fy);
    if (t) {
      t.groundType = 'dirt';
      t.mesh.material = matDirt;
    }
  }
}

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
  new THREE.MeshBasicMaterial({ map: selTex, transparent: true, opacity: 0.9 })
);
tileSelector.position.z = 0.2;
tileSelector.renderOrder = 15;
scene.add(tileSelector);

// =========================================================
// 6. KARAKTER 2D SPRITE (PLAYER & 3 NPC)
// =========================================================
function createCharacter2D(appearance, name, borderColor = '#ffe082') {
  const group = new THREE.Group();
  const frames = buildCharacterFrames(appearance);
  const sprite = createSpritePlane(frames.down[0], 1.05, 1.55);
  sprite.position.set(0, 0.45, 0);
  group.add(sprite);

  const label = createLabel2D(name, borderColor);
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
  toolMesh.position.set(0.45, 0.4, 0.2);
  group.add(toolMesh);

  group.userData = { frames, sprite, label, toolCanvas, toolTex, toolMesh };
  return group;
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

const playerGroup = createCharacter2D(state.player.appearance, state.player.name, '#9de070');
playerGroup.position.set(state.player.x, state.player.y, 1);
scene.add(playerGroup);

const NPC_STARTS = {
  budi: { x: -4, y: 3.3 },
  sari: { x: 4.2, y: 3.2 },
  kakek: { x: -6.5, y: 1.5 }
};

const npcEntities = NPCS.map((npcDef, idx) => {
  const start = NPC_STARTS[npcDef.id] || { x: -3 + idx * 2, y: 2 };
  const group = createCharacter2D(npcDef, npcDef.name, '#ffd166');
  group.position.set(start.x, start.y, 1);
  scene.add(group);
  return {
    def: npcDef,
    group,
    x: start.x,
    y: start.y,
    homeX: start.x,
    homeY: start.y,
    targetX: start.x,
    targetY: start.y,
    dir: 'down',
    waitTimer: 2 + idx * 1.4,
    talkIndex: 0
  };
});

const rainLines = [];
const rainGroup = new THREE.Group();
rainGroup.visible = false;
rainGroup.position.z = 11;
scene.add(rainGroup);
const rainMat = new THREE.MeshBasicMaterial({ color: 0x90e0ef, transparent: true, opacity: 0.65 });
const rainDropGeo = new THREE.PlaneGeometry(0.04, 0.42);
for (let i = 0; i < 95; i++) {
  const drop = new THREE.Mesh(rainDropGeo, rainMat);
  drop.rotation.z = -0.22;
  drop.position.set((Math.random() - 0.5) * 26, (Math.random() - 0.5) * 18, 0);
  rainGroup.add(drop);
  rainLines.push(drop);
}

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

// =========================================================
// 7. INVENTORY & HELPER
// =========================================================
function showToast(msg) {
  const wrap = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2700);
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
    showToast('🥵 Energi habis! Makan hasil panen atau Tidur (🛏️) dulu.');
    return false;
  }
  state.energy = Math.max(0, state.energy - amount);
  updateHUD();
  return true;
}

// =========================================================
// 8. MEKANIK AKSI 2D (FARMING, MINING, WOODCUTTING, PLACE, HARVEST)
// =========================================================
function refreshTileVisual(tile) {
  if (tile.groundType === 'dirt') {
    tile.mesh.material = tile.watered ? matWetDirt : matDirt;
  } else if (tile.groundType === 'grass') {
    tile.mesh.material = matGrass[tile.grassIdx];
  }

  if (tile.cropMesh) {
    scene.remove(tile.cropMesh);
    tile.cropMesh = null;
  }
  if (tile.crop) {
    const cropDef = CROPS[tile.crop.id];
    const ratio = tile.crop.age / cropDef.daysToGrow;
    const stageIdx = ratio >= 1 ? 2 : ratio >= 0.45 ? 1 : 0;
    tile.cropMesh = createSpritePlane(getCropTexture(tile.crop.id, stageIdx), 0.92, 0.92);
    tile.cropMesh.position.set(tile.x, tile.y + 0.14, 1);
    applyYSort(tile.cropMesh, tile.y - 0.1);
    scene.add(tile.cropMesh);
  }
}

function getTargetTileCoord() {
  const tx = Math.round(state.player.x + state.player.facingX);
  const ty = Math.round(state.player.y + state.player.facingY);
  return {
    tx: Math.max(-GRID_HALF, Math.min(GRID_HALF, tx)),
    ty: Math.max(-GRID_HALF, Math.min(GRID_HALF, ty))
  };
}

function tryHarvestTile(tile) {
  if (!tile || !tile.crop) return false;
  const cropDef = CROPS[tile.crop.id];
  if (tile.crop.age >= cropDef.daysToGrow) {
    addItem(cropDef.harvestItem, 1);
    spawnBurst2D(tile.x, tile.y, cropDef.color, 9);
    showToast(`🧺 Panen +1 ${ITEMS[cropDef.harvestItem].name}!`);
    tile.crop = null;
    refreshTileVisual(tile);
    return true;
  }
  return false;
}

function setDirectionFromVector(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) {
    state.player.dir = dx >= 0 ? 'right' : 'left';
    state.player.facingX = dx >= 0 ? 1 : -1;
    state.player.facingY = 0;
  } else {
    state.player.dir = dy >= 0 ? 'up' : 'down';
    state.player.facingX = 0;
    state.player.facingY = dy >= 0 ? 1 : -1;
  }
}

function useActiveItemOnTile(tx, ty) {
  const dist = Math.hypot(tx - state.player.x, ty - state.player.y);
  if (dist > 2.35) {
    showToast('Dekati petak tersebut terlebih dahulu.');
    return;
  }

  const tile = getTile(tx, ty);
  if (!tile) return;

  const dx = tx - state.player.x;
  const dy = ty - state.player.y;
  if (Math.abs(dx) > 0.08 || Math.abs(dy) > 0.08) {
    setDirectionFromVector(dx, dy);
  }

  if (tryHarvestTile(tile)) return;

  const slot = state.slots[state.activeSlot];
  if (!slot) {
    if (tile.placed) {
      scene.remove(tile.placed.mesh);
      if (tile.placed.glow) scene.remove(tile.placed.glow);
      addItem(tile.placed.itemId, 1);
      showToast(`📦 Mengambil ${ITEMS[tile.placed.itemId].name}`);
      tile.placed = null;
    }
    return;
  }

  const item = ITEMS[slot.id];
  state.player.swingTimer = 0.22;
  showToolSwingEmoji(item.icon);

  if (item.toolType === 'hoe') {
    if (tile.obstacle || tile.placed) {
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
      showToast('Pilih rumput kosong untuk dicangkul.');
    }
    return;
  }

  if (item.toolType === 'water') {
    if (tile.groundType === 'dirt') {
      if (!consumeEnergy(2)) return;
      tile.watered = true;
      refreshTileVisual(tile);
      spawnBurst2D(tx, ty, 0x4cc9f0, 6);
    } else {
      showToast('Siram pada tanah garapan!');
    }
    return;
  }

  if (item.toolType === 'pickaxe') {
    if (tile.placed) {
      scene.remove(tile.placed.mesh);
      if (tile.placed.glow) scene.remove(tile.placed.glow);
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
        scene.remove(tile.obstacle.mesh);
        tile.obstacle = null;
        addItem('stone', 1 + Math.floor(Math.random() * 2));
        if (sub === 'copper') {
          addItem('copper_ore', 1 + (Math.random() < 0.4 ? 1 : 0));
          showToast('⛏️ Dapat Batu & Bijih Tembaga!');
        } else if (sub === 'gold') {
          addItem('gold_ore', 1);
          showToast('✨ Jackpot! Dapat Bijih Emas!');
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

  if (item.toolType === 'axe') {
    if (tile.obstacle && tile.obstacle.kind === 'tree') {
      if (!consumeEnergy(4)) return;
      tile.obstacle.hp -= 1;
      spawnBurst2D(tx, ty, 0x7f4f24, 6);
      if (tile.obstacle.hp <= 0) {
        scene.remove(tile.obstacle.mesh);
        tile.obstacle = null;
        const woodGain = 3 + Math.floor(Math.random() * 2);
        addItem('wood', woodGain);
        showToast(`🪵 Pohon tumbang! +${woodGain} Kayu`);
      }
    } else {
      showToast('Arahkan kapak ke batang pohon.');
    }
    return;
  }

  if (item.type === 'seed') {
    if (tile.groundType !== 'dirt') {
      showToast('Cangkul tanahnya dulu sebelum menanam bibit!');
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

  if (item.type === 'placeable') {
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
    scene.add(mesh);

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
      scene.add(glow);
    }

    tile.placed = { type: item.placeType, itemId: item.id, mesh, glow };
    removeItem(item.id, 1);
    showToast(`🔨 Memasang ${item.name}`);
    return;
  }

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
// 9. INTERAKSI NPC, SHIPPING BIN, & PERGANTIAN HARI
// =========================================================
function getNearbyInteractable() {
  const px = state.player.x;
  const py = state.player.y;

  for (const npc of npcEntities) {
    if (Math.hypot(npc.x - px, npc.y - py) < 1.75) {
      return { kind: 'npc', npc };
    }
  }
  if (Math.hypot(2 - px, 3 - py) < 1.75) {
    return { kind: 'bin' };
  }
  if (Math.hypot(0 - px, 3.2 - py) < 1.85) {
    return { kind: 'house' };
  }
  if (Math.hypot(-4 - px, 4.2 - py) < 1.9) {
    return { kind: 'npc', npc: npcEntities[0] };
  }
  return null;
}

function triggerInteract() {
  const { tx, ty } = getTargetTileCoord();
  if (tryHarvestTile(getTile(tx, ty))) return;

  const target = getNearbyInteractable();
  if (!target) {
    showToast('Dekati Warga (NPC), Pintu Rumah, atau Kotak Jual lalu tekan E.');
    return;
  }
  if (target.kind === 'house') {
    advanceNextDay();
  } else if (target.kind === 'bin') {
    openShippingDialog();
  } else if (target.kind === 'npc') {
    openNpcDialog(target.npc);
  }
}

function applySprinklers() {
  for (const t of tiles.values()) {
    if (t.placed && t.placed.type === 'sprinkler') {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nb = getTile(t.x + dx, t.y + dy);
          if (nb && nb.groundType === 'dirt') nb.watered = true;
        }
      }
    }
  }
}

function advanceNextDay() {
  closeAllModals();
  state.day += 1;
  state.minutes = 6 * 60;
  state.energy = state.maxEnergy;
  state.weather = Math.random() < 0.28 ? 'rain' : 'sunny';
  rainGroup.visible = state.weather === 'rain';

  for (const t of tiles.values()) {
    if (t.crop && t.watered) {
      const def = CROPS[t.crop.id];
      t.crop.age = Math.min(def.daysToGrow, t.crop.age + 1);
    }
    t.watered = state.weather === 'rain' && t.groundType === 'dirt';
  }

  applySprinklers();

  for (const t of tiles.values()) {
    if (t.groundType === 'dirt' || t.crop) refreshTileVisual(t);
  }

  populateResources(false);
  persistLightSave();
  updateHUD();
  showToast(
    `🌅 Pagi Hari ke-${state.day}! ${
      state.weather === 'rain' ? '🌧️ Hujan menyiram seluruh kebunmu!' : '☀️ Cuaca cerah!'
    }`
  );
}

// =========================================================
// 10. UI HUD, INVENTORY, CRAFTING, DIALOG, KUSTOMISASI
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
      if (def.stackable && slot.qty > 1) {
        div.innerHTML += `<span class="slot-qty">${slot.qty}</span>`;
      }
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
    label.textContent = 'Tangan Kosong — Klik objek dekorasi untuk mengambil kembali';
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
      for (const [ingId, needQty] of Object.entries(r.ingredients)) {
        removeItem(ingId, needQty);
      }
      addItem(r.output, r.outQty);
      showToast(`✅ Berhasil membuat ${outDef.name}!`);
      renderInventoryAndCrafting();
    });
    row.appendChild(btn);
    cList.appendChild(row);
  }
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
    const seeds = ['seed_turnip', 'seed_tomato', 'seed_pumpkin'];
    for (const sid of seeds) {
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
  document.getElementById('dialog-role').textContent = 'Jual Hasil Kebun & Tambang';
  document.getElementById('dialog-text').textContent =
    'Pilih barang dari tasmu yang ingin langsung dijual menjadi Koin (G):';

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
      'Belum ada hasil panen, kayu, batu, atau bijih di tasmu untuk dijual.';
  }

  const closeB = document.createElement('button');
  closeB.className = 'hud-btn';
  closeB.textContent = 'Tutup';
  closeB.addEventListener('click', closeAllModals);
  actions.appendChild(closeB);
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
// 11. INPUT KEYBOARD, KLIK TILE 2D LANGSUNG, & TOUCH MOBILE
// =========================================================
function closeAllModals() {
  document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden'));
}

function isAnyModalOpen() {
  return Array.from(document.querySelectorAll('.modal')).some((m) => !m.classList.contains('hidden'));
}

document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', closeAllModals);
});

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

document.getElementById('btn-sleep').addEventListener('click', advanceNextDay);

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

  if (isAnyModalOpen()) return;

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
  if (e.key === 'e' || e.key === 'E') {
    triggerInteract();
    return;
  }
  keys.add(e.key.toLowerCase());
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.key.toLowerCase());
});

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (isAnyModalOpen() || e.button !== 0) return;
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
document.getElementById('mob-interact').addEventListener('click', triggerInteract);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateCameraFrustum();
});

// =========================================================
// 12. GAME LOOP 2D PIXEL ART
// =========================================================
function isBlocked(nx, ny) {
  if (nx < -GRID_HALF + 0.3 || nx > GRID_HALF - 0.3 || ny < -GRID_HALF + 0.3 || ny > GRID_HALF - 0.3) {
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

  waterAnimTimer += dt;
  if (waterAnimTimer > 0.65) {
    waterAnimTimer = 0;
    waterFrame = (waterFrame + 1) % 2;
    for (const t of tiles.values()) {
      if (t.groundType === 'water') t.mesh.material = matWater[waterFrame];
    }
  }

  if (!isAnyModalOpen()) {
    state.minutes += dt * 3;
    if (state.minutes >= 24 * 60) advanceNextDay();
    updateHUD();

    const hour = state.minutes / 60;
    let nightAlpha = 0;
    if (hour >= 17.5) {
      nightAlpha = Math.min(0.55, ((hour - 17.5) / 4.5) * 0.55);
    }
    if (state.weather === 'rain') {
      nightAlpha = Math.max(nightAlpha, 0.18);
    }
    nightOverlay.material.opacity = nightAlpha;

    for (const t of tiles.values()) {
      if (t.placed && t.placed.glow) {
        t.placed.glow.visible = hour >= 17 || state.weather === 'rain';
      }
    }

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

      const speed = 4.3 * dt;
      const tryX = state.player.x + mx * speed;
      const tryY = state.player.y + my * speed;
      if (!isBlocked(tryX, state.player.y)) state.player.x = tryX;
      if (!isBlocked(state.player.x, tryY)) state.player.y = tryY;
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

    const { tx, ty } = getTargetTileCoord();
    tileSelector.position.set(tx, ty, 0.2);

    const near = getNearbyInteractable();
    const hintEl = document.getElementById('prompt-hint');
    if (near) {
      hintEl.classList.remove('hidden');
      if (near.kind === 'npc') hintEl.innerHTML = `Tekan <kbd>E</kbd> bicara dengan <b>${near.npc.def.name}</b>`;
      else if (near.kind === 'bin') hintEl.innerHTML = `Tekan <kbd>E</kbd> buka <b>Kotak Jual</b>`;
      else if (near.kind === 'house') hintEl.innerHTML = `Tekan <kbd>E</kbd> <b>Tidur ke Hari Berikutnya</b>`;
    } else {
      hintEl.classList.add('hidden');
    }

    for (const npc of npcEntities) {
      const dx = npc.targetX - npc.x;
      const dy = npc.targetY - npc.y;
      const d = Math.hypot(dx, dy);
      const nData = npc.group.userData;
      if (d > 0.08) {
        const step = Math.min(d, 1.25 * dt);
        const nx = npc.x + (dx / d) * step;
        const ny = npc.y + (dy / d) * step;
        if (!isBlocked(nx, ny)) {
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
          npc.targetX = npc.homeX + (Math.random() * 3.6 - 1.8);
          npc.targetY = npc.homeY + (Math.random() * 2.6 - 1.3);
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

  const maxCamX = Math.max(0, GRID_HALF + 0.5 - camera.right);
  const maxCamY = Math.max(0, GRID_HALF + 0.5 - camera.top);
  const targetCamX = Math.max(-maxCamX, Math.min(maxCamX, state.player.x));
  const targetCamY = Math.max(-maxCamY, Math.min(maxCamY, state.player.y));

  camera.position.x += (targetCamX - camera.position.x) * 0.12;
  camera.position.y += (targetCamY - camera.position.y) * 0.12;
  nightOverlay.position.x = camera.position.x;
  nightOverlay.position.y = camera.position.y;

  renderer.render(scene, camera);
}

updateHUD();
renderHotbar();
showToast('🌱 Mode 2D Pixel Art (ala Stardew Valley) aktif! WASD gerak, Klik/Spasi aksi, E interaksi.');
tick();
