import * as THREE from 'three';
import { ITEMS, CROPS, RECIPES, NPCS, CUSTOMIZATION_OPTIONS } from './data.js';
import {
  getMat,
  buildCharacterMesh,
  updateCharacterAppearance,
  createTreeMesh,
  createRockMesh,
  createCropMesh,
  createPlacedObjectMesh,
  createHouseMesh,
  createShippingBinMesh,
  createShopStallMesh
} from './meshes.js';

const SAVE_KEY = 'cozy_valley_beta_v1';
const GRID_HALF = 11; // Peta -11 .. +11 (23x23 tile)

// =========================================================
// 1. STATE PERMAINAN (PLAYER, INVENTORY, TIME, WORLD)
// =========================================================
const state = {
  day: 1,
  minutes: 6 * 60, // 06:00 pagi
  weather: 'sunny', // 'sunny' | 'rain'
  gold: 150,
  energy: 100,
  maxEnergy: 100,
  activeSlot: 0,
  player: {
    name: 'Bayu',
    x: 0,
    z: 1,
    facingX: 0,
    facingZ: 1,
    swingTimer: 0,
    appearance: {
      skin: '#f1c27d',
      shirt: '#457b9d',
      pants: '#1d3557',
      hat: 'straw',
      hatColor: '#e9c46a'
    }
  },
  // 8 slot pertama = Hotbar, sisanya = Tas Inventory (total 20 slot)
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

// Load kustomisasi/save ringan jika pernah main
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
// 2. THREE.JS 2.5D SCENE SETUP (ISOMETRIC / TILTED TOP-DOWN)
// =========================================================
const container = document.getElementById('game-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ecae6);
scene.fog = new THREE.FogExp2(0x8ecae6, 0.018);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
const CAM_OFFSET = new THREE.Vector3(0, 11.5, 10.5);

const hemiLight = new THREE.HemisphereLight(0xfff8e7, 0x3a5a40, 0.85);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff1d0, 1.25);
sunLight.position.set(10, 18, 8);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
sunLight.shadow.camera.left = -16;
sunLight.shadow.camera.right = 16;
sunLight.shadow.camera.top = 16;
sunLight.shadow.camera.bottom = -16;
scene.add(sunLight);

// =========================================================
// 3. GRID DUNIA (FARM, HUTAN, BUKIT TAMBANG, KOLAM, DESA)
// =========================================================
const tiles = new Map(); // key "x,z" -> tileObj
const tilePickMeshes = [];

const grassMatA = getMat(0x6ab04c, 0.92);
const grassMatB = getMat(0x62a645, 0.92);
const dirtMat = getMat(0x8d5b3e, 0.95);
const wetDirtMat = getMat(0x523422, 0.75);
const quarryFloorMat = getMat(0x6c757d, 0.95);
const waterMat = getMat(0x3a86ff, 0.25);
const plazaMat = getMat(0xd4a373, 0.9);

function tileKey(x, z) {
  return `${x},${z}`;
}

function getTile(x, z) {
  return tiles.get(tileKey(x, z)) || null;
}

const tileGeo = new THREE.BoxGeometry(0.99, 0.2, 0.99);

for (let x = -GRID_HALF; x <= GRID_HALF; x++) {
  for (let z = -GRID_HALF; z <= GRID_HALF; z++) {
    let groundType = 'grass';
    // Kolam air di Barat Daya
    if (x <= -6 && x >= -10 && z >= 5 && z <= 9) {
      groundType = 'water';
    }
    // Area Bukit Tambang (Mining Quarry) di Timur Laut
    else if (x >= 5 && z <= -2) {
      groundType = 'quarry';
    }
    // Area Plaza Desa & Jalan Rumah
    else if ((x >= -5 && x <= 2 && z >= -6 && z <= -3) || (x === 0 && z >= -2 && z <= 0)) {
      groundType = 'plaza';
    }

    const baseMat =
      groundType === 'water'
        ? waterMat
        : groundType === 'quarry'
        ? quarryFloorMat
        : groundType === 'plaza'
        ? plazaMat
        : (x + z) % 2 === 0
        ? grassMatA
        : grassMatB;

    const mesh = new THREE.Mesh(tileGeo, baseMat);
    mesh.position.set(x, groundType === 'water' ? -0.18 : -0.1, z);
    mesh.receiveShadow = true;
    mesh.userData = { gx: x, gz: z };
    scene.add(mesh);
    tilePickMeshes.push(mesh);

    tiles.set(tileKey(x, z), {
      x,
      z,
      groundType, // grass | dirt | quarry | water | plaza
      watered: false,
      crop: null, // { id, age }
      obstacle: null, // { kind: 'tree'|'rock'|'building', subKind, hp, mesh }
      placed: null, // { type, itemId, mesh }
      cropMesh: null,
      mesh
    });
  }
}

// Bangunan: Rumah Player (0, -3), Shipping Bin (2, -2), Kios Pak Budi (-4, -5)
const houseMesh = createHouseMesh();
houseMesh.position.set(0, 0, -4);
scene.add(houseMesh);
for (let bx = -1; bx <= 1; bx++) {
  for (let bz = -5; bz <= -3; bz++) {
    const t = getTile(bx, bz);
    if (t) t.obstacle = { kind: 'building', tag: 'house' };
  }
}

const binMesh = createShippingBinMesh();
binMesh.position.set(2, 0, -2);
scene.add(binMesh);
getTile(2, -2).obstacle = { kind: 'building', tag: 'bin' };

const stallMesh = createShopStallMesh();
stallMesh.position.set(-4, 0, -5);
scene.add(stallMesh);
for (const sx of [-5, -4, -3]) {
  const t = getTile(sx, -5);
  if (t) t.obstacle = { kind: 'building', tag: 'shop' };
}

// Helper menaruh pohon & batu tambang
function spawnTree(x, z) {
  const t = getTile(x, z);
  if (!t || t.groundType !== 'grass' || t.obstacle || t.crop || t.placed) return;
  const mesh = createTreeMesh();
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  t.obstacle = { kind: 'tree', hp: 3, mesh };
}

function spawnRock(x, z, subKind = 'stone') {
  const t = getTile(x, z);
  if (!t || t.groundType === 'water' || t.obstacle || t.crop || t.placed) return;
  const mesh = createRockMesh(subKind);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  const hp = subKind === 'gold' ? 4 : subKind === 'copper' ? 3 : 2;
  t.obstacle = { kind: 'rock', subKind, hp, mesh };
}

function populateResources(initial = false) {
  // Hutan Barat & Selatan
  const treeCoords = [
    [-9, -8], [-7, -7], [-9, -4], [-8, -1], [-9, 2],
    [-4, 8], [-2, 9], [3, 9], [7, 8], [9, 6], [8, 3]
  ];
  for (const [tx, tz] of treeCoords) {
    if (initial || Math.random() < 0.35) spawnTree(tx, tz);
  }

  // Bukit Tambang (Mining Quarry) di Timur Laut (x: 5..10, z: -10..-2)
  for (let rx = 5; rx <= 10; rx++) {
    for (let rz = -10; rz <= -2; rz++) {
      if (Math.random() < (initial ? 0.42 : 0.25)) {
        const roll = Math.random();
        const kind = roll > 0.84 ? 'gold' : roll > 0.5 ? 'copper' : 'stone';
        spawnRock(rx, rz, kind);
      }
    }
  }
}

populateResources(true);

// Siapkan contoh 4 petak tanah awal dekat player agar langsung kelihatan area kebun
for (let fx = -1; fx <= 1; fx++) {
  const t = getTile(fx, 3);
  if (t) {
    t.groundType = 'dirt';
    t.mesh.material = dirtMat;
  }
}

// Indikator Tile Target (Highlight Kuning)
const selectorGeo = new THREE.RingGeometry(0.36, 0.44, 4);
selectorGeo.rotateX(-Math.PI / 2);
selectorGeo.rotateY(Math.PI / 4);
const selectorMat = new THREE.MeshBasicMaterial({ color: 0xffe066, side: THREE.DoubleSide });
const tileSelector = new THREE.Mesh(selectorGeo, selectorMat);
tileSelector.position.y = 0.03;
scene.add(tileSelector);

// =========================================================
// 4. PLAYER & NPC ENTITIES
// =========================================================
const playerMesh = buildCharacterMesh(state.player.appearance, state.player.name);
playerMesh.position.set(state.player.x, 0, state.player.z);
scene.add(playerMesh);

const npcEntities = NPCS.map((npcDef, idx) => {
  const mesh = buildCharacterMesh(npcDef, npcDef.name);
  mesh.position.set(npcDef.homeX, 0, npcDef.homeZ);
  scene.add(mesh);
  return {
    def: npcDef,
    mesh,
    x: npcDef.homeX,
    z: npcDef.homeZ,
    targetX: npcDef.homeX,
    targetZ: npcDef.homeZ,
    waitTimer: 2 + idx * 1.5,
    talkIndex: 0
  };
});

// Partikel Hujan sederhana
const rainCount = 260;
const rainGeo = new THREE.BufferGeometry();
const rainPos = new Float32Array(rainCount * 3);
for (let i = 0; i < rainCount; i++) {
  rainPos[i * 3] = (Math.random() - 0.5) * 26;
  rainPos[i * 3 + 1] = Math.random() * 12;
  rainPos[i * 3 + 2] = (Math.random() - 0.5) * 26;
}
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainPoints = new THREE.Points(
  rainGeo,
  new THREE.PointsMaterial({ color: 0xaad8ff, size: 0.12, transparent: true, opacity: 0.75 })
);
rainPoints.visible = false;
scene.add(rainPoints);

// Partikel Pop Efektif (saat menambang / memanen)
const particles = [];
function spawnBurst(x, z, colorHex, count = 7) {
  const mat = getMat(colorHex, 0.6);
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), mat);
    p.position.set(x, 0.35, z);
    scene.add(p);
    particles.push({
      mesh: p,
      vx: (Math.random() - 0.5) * 3.2,
      vy: 2.2 + Math.random() * 2.2,
      vz: (Math.random() - 0.5) * 3.2,
      life: 0.45
    });
  }
}

// =========================================================
// 5. INVENTORY, HOTBAR, DAN CRAFTING HELPERS
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
// 6. MEKANIK AKSI UTAMA (FARMING, MINING, WOODCUTTING, PLACE, HARVEST)
// =========================================================
function refreshTileVisual(tile) {
  if (tile.groundType === 'dirt') {
    tile.mesh.material = tile.watered ? wetDirtMat : dirtMat;
  } else if (tile.groundType === 'grass') {
    tile.mesh.material = (tile.x + tile.z) % 2 === 0 ? grassMatA : grassMatB;
  }

  if (tile.cropMesh) {
    scene.remove(tile.cropMesh);
    tile.cropMesh = null;
  }
  if (tile.crop) {
    const cropDef = CROPS[tile.crop.id];
    const ratio = tile.crop.age / cropDef.daysToGrow;
    tile.cropMesh = createCropMesh(cropDef, ratio);
    tile.cropMesh.position.set(tile.x, 0, tile.z);
    scene.add(tile.cropMesh);
  }
}

function getTargetTileCoord() {
  const tx = Math.round(state.player.x + state.player.facingX);
  const tz = Math.round(state.player.z + state.player.facingZ);
  return {
    tx: Math.max(-GRID_HALF, Math.min(GRID_HALF, tx)),
    tz: Math.max(-GRID_HALF, Math.min(GRID_HALF, tz))
  };
}

function tryHarvestTile(tile) {
  if (!tile || !tile.crop) return false;
  const cropDef = CROPS[tile.crop.id];
  if (tile.crop.age >= cropDef.daysToGrow) {
    addItem(cropDef.harvestItem, 1);
    spawnBurst(tile.x, tile.z, cropDef.color, 9);
    showToast(`🧺 Panen +1 ${ITEMS[cropDef.harvestItem].name}!`);
    tile.crop = null;
    refreshTileVisual(tile);
    return true;
  }
  return false;
}

function useActiveItemOnTile(tx, tz) {
  const dist = Math.hypot(tx - state.player.x, tz - state.player.z);
  if (dist > 2.3) {
    showToast('Dekati petak tersebut terlebih dahulu.');
    return;
  }

  const tile = getTile(tx, tz);
  if (!tile) return;

  // Putar player menghadap target
  const dx = tx - state.player.x;
  const dz = tz - state.player.z;
  if (Math.abs(dx) > 0.05 || Math.abs(dz) > 0.05) {
    const len = Math.hypot(dx, dz);
    state.player.facingX = dx / len;
    state.player.facingZ = dz / len;
  }
  state.player.swingTimer = 0.25;

  // Jika tanaman siap panen, klik langsung memanen tanpa memakan energi!
  if (tryHarvestTile(tile)) return;

  const slot = state.slots[state.activeSlot];
  if (!slot) {
    // Ambil kembali dekorasi jika tangan kosong
    if (tile.placed) {
      scene.remove(tile.placed.mesh);
      addItem(tile.placed.itemId, 1);
      showToast(`📦 Mengambil ${ITEMS[tile.placed.itemId].name}`);
      tile.placed = null;
    }
    return;
  }

  const item = ITEMS[slot.id];

  // 1) CANGKUL (Farming: gemburkan tanah)
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
      spawnBurst(tx, tz, 0x8d5b3e, 5);
    } else {
      showToast('Pilih rumput kosong untuk dicangkul.');
    }
    return;
  }

  // 2) PENYIRAM (Watering Can)
  if (item.toolType === 'water') {
    if (tile.groundType === 'dirt') {
      if (!consumeEnergy(2)) return;
      tile.watered = true;
      refreshTileVisual(tile);
      spawnBurst(tx, tz, 0x4cc9f0, 6);
    } else {
      showToast('Siram pada tanah garapan!');
    }
    return;
  }

  // 3) BELIUNG / PICKAXE (Mining batu & ambil dekorasi)
  if (item.toolType === 'pickaxe') {
    if (tile.placed) {
      scene.remove(tile.placed.mesh);
      addItem(tile.placed.itemId, 1);
      tile.placed = null;
      return;
    }
    if (tile.obstacle && tile.obstacle.kind === 'rock') {
      if (!consumeEnergy(4)) return;
      tile.obstacle.hp -= 1;
      spawnBurst(tx, tz, 0xadb5bd, 6);
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

  // 4) KAPAK (Tebang Pohon)
  if (item.toolType === 'axe') {
    if (tile.obstacle && tile.obstacle.kind === 'tree') {
      if (!consumeEnergy(4)) return;
      tile.obstacle.hp -= 1;
      spawnBurst(tx, tz, 0x7f5539, 6);
      if (tile.obstacle.hp <= 0) {
        scene.remove(tile.obstacle.mesh);
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

  // 5) TANAM BIBIT
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
    spawnBurst(tx, tz, 0x90be6d, 5);
    return;
  }

  // 6) PASANG OBJEK CRAFTING (Pagar, Lentera, Sprinkler, Jalan Batu)
  if (item.type === 'placeable') {
    if (tile.groundType === 'water' || tile.obstacle || tile.placed || tile.crop) {
      showToast('Tidak bisa menaruh objek di petak ini.');
      return;
    }
    const mesh = createPlacedObjectMesh(item.placeType);
    mesh.position.set(tx, 0, tz);
    scene.add(mesh);
    tile.placed = { type: item.placeType, itemId: item.id, mesh };
    removeItem(item.id, 1);
    showToast(`🔨 Memasang ${item.name}`);
    return;
  }

  // 7) MAKAN HASIL PANEN / SUP (+Energi)
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
// 7. INTERAKSI NPC, SHIPPING BIN, DAN PERGANTIAN HARI (TIDUR)
// =========================================================
function getNearbyInteractable() {
  const px = state.player.x;
  const pz = state.player.z;

  for (const npc of npcEntities) {
    if (Math.hypot(npc.x - px, npc.z - pz) < 1.85) {
      return { kind: 'npc', npc };
    }
  }
  if (Math.hypot(2 - px, -2 - pz) < 1.85) {
    return { kind: 'bin' };
  }
  if (Math.hypot(0 - px, -2.5 - pz) < 2.0) {
    return { kind: 'house' };
  }
  if (Math.hypot(-4 - px, -4.2 - pz) < 2.0) {
    return { kind: 'npc', npc: npcEntities[0] };
  }
  return null;
}

function triggerInteract() {
  // Cek panen tepat di kaki/depan player dulu
  const { tx, tz } = getTargetTileCoord();
  if (tryHarvestTile(getTile(tx, tz))) return;

  const target = getNearbyInteractable();
  if (!target) {
    showToast('Dekati Warga (NPC), Rumah, atau Kotak Jual lalu tekan E.');
    return;
  }

  if (target.kind === 'house') {
    advanceNextDay();
    return;
  }

  if (target.kind === 'bin') {
    openShippingDialog();
    return;
  }

  if (target.kind === 'npc') {
    openNpcDialog(target.npc);
  }
}

function applySprinklers() {
  for (const t of tiles.values()) {
    if (t.placed && t.placed.type === 'sprinkler') {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const nb = getTile(t.x + dx, t.z + dz);
          if (nb && nb.groundType === 'dirt') {
            nb.watered = true;
          }
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
  rainPoints.visible = state.weather === 'rain';

  // Tanaman yang disiram kemarin bertambah umur 1 hari!
  for (const t of tiles.values()) {
    if (t.crop && t.watered) {
      const def = CROPS[t.crop.id];
      t.crop.age = Math.min(def.daysToGrow, t.crop.age + 1);
    }
    t.watered = state.weather === 'rain' && t.groundType === 'dirt';
  }

  // Jalankan Sprinkler Otomatis pagi hari
  applySprinklers();

  for (const t of tiles.values()) {
    if (t.groundType === 'dirt' || t.crop) refreshTileVisual(t);
  }

  populateResources(false);
  persistLightSave();
  updateHUD();
  showToast(
    `🌅 Selamat pagi Hari ke-${state.day}! ${
      state.weather === 'rain' ? '🌧️ Hujan menyiram seluruh kebunmu!' : '☀️ Cuaca cerah!'
    }`
  );
}

// =========================================================
// 8. UI RENDERING (HUD, HOTBAR, INVENTORY, CRAFTING, DIALOG, CUSTOMIZE)
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

// =========================================================
// 9. PLAYER CUSTOMIZATION UI
// =========================================================
function renderSwatchRow(containerId, colors, propName) {
  const row = document.getElementById(containerId);
  row.innerHTML = '';
  for (const c of colors) {
    const sw = document.createElement('div');
    sw.className = `swatch ${state.player.appearance[propName] === c ? 'selected' : ''}`;
    sw.style.background = c;
    sw.addEventListener('click', () => {
      state.player.appearance[propName] = c;
      updateCharacterAppearance(playerMesh, state.player.appearance, null);
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
      updateCharacterAppearance(playerMesh, state.player.appearance, null);
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
  updateCharacterAppearance(playerMesh, state.player.appearance, null);
  renderCustomizationModal();
});

document.getElementById('btn-save-cust').addEventListener('click', () => {
  const val = document.getElementById('cust-name').value.trim() || 'Petani';
  state.player.name = val;
  updateCharacterAppearance(playerMesh, state.player.appearance, state.player.name);
  persistLightSave();
  closeAllModals();
  showToast(`👕 Tampilan ${state.player.name} disimpan!`);
});

// =========================================================
// 10. INPUT HANDLERS (KEYBOARD, MOUSE RAYCAST, TOUCH D-PAD)
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
    const { tx, tz } = getTargetTileCoord();
    useActiveItemOnTile(tx, tz);
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

// Klik Mouse langsung di tanah 3D (Raycasting)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (isAnyModalOpen() || e.button !== 0) return;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(tilePickMeshes, false);
  if (hits.length > 0) {
    const { gx, gz } = hits[0].object.userData;
    useActiveItemOnTile(gx, gz);
  }
});

// Mobile D-pad
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
  const { tx, tz } = getTargetTileCoord();
  useActiveItemOnTile(tx, tz);
});
document.getElementById('mob-interact').addEventListener('click', triggerInteract);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =========================================================
// 11. GAME LOOP (GERAK, COLLISION, ANIMASI CHIBI, SIANG-MALAM, AI NPC)
// =========================================================
function isBlocked(nx, nz) {
  if (nx < -GRID_HALF + 0.3 || nx > GRID_HALF - 0.3 || nz < -GRID_HALF + 0.3 || nz > GRID_HALF - 0.3) {
    return true;
  }
  const t = getTile(Math.round(nx), Math.round(nz));
  if (!t) return true;
  if (t.groundType === 'water') return true;
  if (t.obstacle) return true;
  if (t.placed && t.placed.type !== 'path') return true;
  return false;
}

function animateCharacterLimbs(mesh, moving, clockTime, swingTimer = 0) {
  const u = mesh.userData;
  if (moving) {
    const w = Math.sin(clockTime * 11) * 0.55;
    u.leftLeg.rotation.x = w;
    u.rightLeg.rotation.x = -w;
    u.leftArm.rotation.x = -w * 0.8;
    u.rightArm.rotation.x = swingTimer > 0 ? -1.35 : w * 0.8;
  } else {
    u.leftLeg.rotation.x = 0;
    u.rightLeg.rotation.x = 0;
    u.leftArm.rotation.x = 0;
    u.rightArm.rotation.x = swingTimer > 0 ? -Math.sin(swingTimer * 16) * 1.4 : 0;
  }
}

const clock = new THREE.Clock();

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  if (!isAnyModalOpen()) {
    // 1. Waktu Berjalan (1 detik nyata = 3 menit game)
    state.minutes += dt * 3;
    if (state.minutes >= 24 * 60) {
      advanceNextDay();
    }
    updateHUD();

    // 2. Pencahayaan Siang - Sore - Malam
    const hour = state.minutes / 60;
    let dayFactor = 1;
    if (hour >= 18) dayFactor = Math.max(0.22, 1 - (hour - 18) / 4.5);
    if (state.weather === 'rain') dayFactor *= 0.78;
    sunLight.intensity = 0.25 + dayFactor * 1.05;
    hemiLight.intensity = 0.3 + dayFactor * 0.55;

    const skyDay = new THREE.Color(state.weather === 'rain' ? 0x6c8ead : 0x8ecae6);
    const skyNight = new THREE.Color(0x141b2d);
    scene.background.copy(skyDay).lerp(skyNight, 1 - dayFactor);
    scene.fog.color.copy(scene.background);

    // 3. Gerak Player
    let mx = 0;
    let mz = 0;
    if (keys.has('w') || keys.has('arrowup') || touchDirs.up) mz -= 1;
    if (keys.has('s') || keys.has('arrowdown') || touchDirs.down) mz += 1;
    if (keys.has('a') || keys.has('arrowleft') || touchDirs.left) mx -= 1;
    if (keys.has('d') || keys.has('arrowright') || touchDirs.right) mx += 1;

    const moving = mx !== 0 || mz !== 0;
    if (moving) {
      const len = Math.hypot(mx, mz);
      mx /= len;
      mz /= len;
      state.player.facingX = mx;
      state.player.facingZ = mz;

      const speed = 4.4 * dt;
      const tryX = state.player.x + mx * speed;
      const tryZ = state.player.z + mz * speed;
      if (!isBlocked(tryX, state.player.z)) state.player.x = tryX;
      if (!isBlocked(state.player.x, tryZ)) state.player.z = tryZ;
    }

    if (state.player.swingTimer > 0) {
      state.player.swingTimer = Math.max(0, state.player.swingTimer - dt);
    }

    playerMesh.position.set(state.player.x, 0, state.player.z);
    playerMesh.rotation.y = Math.atan2(state.player.facingX, state.player.facingZ);
    animateCharacterLimbs(playerMesh, moving, elapsed, state.player.swingTimer);

    // 4. Update Selector Petak di depan player
    const { tx, tz } = getTargetTileCoord();
    tileSelector.position.set(tx, 0.03, tz);

    // 5. Update Hint Interaksi
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

    // 6. AI Jalan Santai NPC
    for (const npc of npcEntities) {
      const dx = npc.targetX - npc.x;
      const dz = npc.targetZ - npc.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.08) {
        const step = Math.min(d, 1.35 * dt);
        const nx = npc.x + (dx / d) * step;
        const nz = npc.z + (dz / d) * step;
        if (!isBlocked(nx, nz)) {
          npc.x = nx;
          npc.z = nz;
        } else {
          npc.targetX = npc.x;
          npc.targetZ = npc.z;
        }
        npc.mesh.position.set(npc.x, 0, npc.z);
        npc.mesh.rotation.y = Math.atan2(dx, dz);
        animateCharacterLimbs(npc.mesh, true, elapsed);
      } else {
        animateCharacterLimbs(npc.mesh, false, elapsed);
        npc.waitTimer -= dt;
        if (npc.waitTimer <= 0) {
          npc.waitTimer = 3 + Math.random() * 4;
          npc.targetX = npc.def.homeX + (Math.random() * 4 - 2);
          npc.targetZ = npc.def.homeZ + (Math.random() * 4 - 2);
        }
      }
    }
  }

  // Putar baling-baling sprinkler
  for (const t of tiles.values()) {
    if (t.placed && t.placed.mesh.userData.spinPart) {
      t.placed.mesh.userData.spinPart.rotation.y += dt * 2.5;
    }
  }

  // Animasi Hujan
  if (rainPoints.visible) {
    const pos = rainPoints.geometry.attributes.position;
    for (let i = 0; i < rainCount; i++) {
      let y = pos.getY(i) - dt * 15;
      if (y < 0) y = 12;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    rainPoints.position.set(state.player.x, 0, state.player.z);
  }

  // Update partikel pop
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.vy -= 9.5 * dt;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
    }
  }

  // Kamera Smooth Follow 2.5D
  const desiredCam = new THREE.Vector3(
    state.player.x + CAM_OFFSET.x,
    CAM_OFFSET.y,
    state.player.z + CAM_OFFSET.z
  );
  camera.position.lerp(desiredCam, 0.1);
  camera.lookAt(state.player.x, 0.3, state.player.z);

  renderer.render(scene, camera);
}

// Inisialisasi UI Awal
updateHUD();
renderHotbar();
showToast('🌱 Selamat datang di Cozy Valley Beta! Tekan WASD gerak, Spasi pakai alat, E bicara.');
tick();
