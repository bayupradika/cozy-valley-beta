// Database item, tanaman, resep crafting, NPC, dan opsi kustomisasi
// Dibuat terpisah agar Bayu & Azi mudah menambah konten tanpa bongkar engine

export const ITEMS = {
  hoe:          { id: 'hoe', name: 'Cangkul', icon: '🪓', toolType: 'hoe', stackable: false, desc: 'Menggemburkan rumput menjadi tanah garapan.' },
  watercan:     { id: 'watercan', name: 'Penyiram', icon: '🚿', toolType: 'water', stackable: false, desc: 'Menyiram tanaman agar tumbuh keesokan hari.' },
  pickaxe:      { id: 'pickaxe', name: 'Beliung', icon: '⛏️', toolType: 'pickaxe', stackable: false, desc: 'Menghancurkan batu & menambang bijih mineral.' },
  axe:          { id: 'axe', name: 'Kapak', icon: '🪓', toolType: 'axe', stackable: false, desc: 'Menebang pohon menjadi kayu.' },

  seed_turnip:  { id: 'seed_turnip', name: 'Bibit Lobak', icon: '🌱', type: 'seed', cropId: 'turnip', buyPrice: 20, sellPrice: 10, stackable: true, desc: 'Panen dalam 2 hari.' },
  seed_tomato:  { id: 'seed_tomato', name: 'Bibit Tomat', icon: '🍅', type: 'seed', cropId: 'tomato', buyPrice: 40, sellPrice: 20, stackable: true, desc: 'Panen dalam 3 hari, nilai jual bagus.' },
  seed_pumpkin: { id: 'seed_pumpkin', name: 'Bibit Labu Emas', icon: '🎃', type: 'seed', cropId: 'pumpkin', buyPrice: 75, sellPrice: 35, stackable: true, desc: 'Panen dalam 4 hari, keuntungan besar!' },

  crop_turnip:  { id: 'crop_turnip', name: 'Lobak Segar', icon: '🥕', type: 'crop', sellPrice: 45, energy: 20, stackable: true, desc: 'Bisa dijual (45G) atau dimakan (+20⚡).' },
  crop_tomato:  { id: 'crop_tomato', name: 'Tomat Merah', icon: '🍅', type: 'crop', sellPrice: 95, energy: 35, stackable: true, desc: 'Bisa dijual (95G) atau dimakan (+35⚡).' },
  crop_pumpkin: { id: 'crop_pumpkin', name: 'Labu Emas', icon: '🎃', type: 'crop', sellPrice: 190, energy: 60, stackable: true, desc: 'Hasil panen premium (190G / +60⚡).' },

  wood:         { id: 'wood', name: 'Kayu', icon: '🪵', type: 'material', sellPrice: 8, stackable: true, desc: 'Bahan dasar crafting.' },
  stone:        { id: 'stone', name: 'Batu', icon: '🪨', type: 'material', sellPrice: 10, stackable: true, desc: 'Bahan konstruksi & crafting.' },
  copper_ore:   { id: 'copper_ore', name: 'Bijih Tembaga', icon: '🟠', type: 'material', sellPrice: 28, stackable: true, desc: 'Bijih dari area tambang.' },
  gold_ore:     { id: 'gold_ore', name: 'Bijih Emas', icon: '✨', type: 'material', sellPrice: 65, stackable: true, desc: 'Bijih langka bernilai tinggi!' },

  fence:        { id: 'fence', name: 'Pagar Kayu', icon: '🚧', type: 'placeable', placeType: 'fence', sellPrice: 15, stackable: true, desc: 'Dekorasi pagar kebun.' },
  lamp:         { id: 'lamp', name: 'Lentera Taman', icon: '🏮', type: 'placeable', placeType: 'lamp', sellPrice: 45, stackable: true, desc: 'Menerangi kebun di malam hari.' },
  sprinkler:    { id: 'sprinkler', name: 'Sprinkler Otomatis', icon: '💦', type: 'placeable', placeType: 'sprinkler', sellPrice: 120, stackable: true, desc: 'Menyiram 8 petak di sekitarnya tiap pagi!' },
  stone_path:   { id: 'stone_path', name: 'Jalan Batu', icon: '🧱', type: 'placeable', placeType: 'path', sellPrice: 12, stackable: true, desc: 'Mempercantik jalur kebun.' },
  salad:        { id: 'salad', name: 'Sup Kebun Hangat', icon: '🍲', type: 'food', energy: 75, sellPrice: 80, stackable: true, desc: 'Memulihkan +75 Energi seketika.' }
};

// Ubah ikon cangkul supaya beda dengan kapak
ITEMS.hoe.icon = '🌾';

export const CROPS = {
  turnip: {
    id: 'turnip',
    name: 'Lobak',
    daysToGrow: 2,
    harvestItem: 'crop_turnip',
    color: 0xf4a261,
    leafColor: 0x6ab04c
  },
  tomato: {
    id: 'tomato',
    name: 'Tomat',
    daysToGrow: 3,
    harvestItem: 'crop_tomato',
    color: 0xe63946,
    leafColor: 0x38b000
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'Labu Emas',
    daysToGrow: 4,
    harvestItem: 'crop_pumpkin',
    color: 0xff9f1c,
    leafColor: 0x2d6a4f
  }
};

export const RECIPES = [
  {
    id: 'craft_fence',
    output: 'fence',
    outQty: 2,
    ingredients: { wood: 4 },
    desc: '2x Pagar kayu untuk membatasi kebun'
  },
  {
    id: 'craft_path',
    output: 'stone_path',
    outQty: 2,
    ingredients: { stone: 3 },
    desc: '2x Ubin jalan batu rapi'
  },
  {
    id: 'craft_lamp',
    output: 'lamp',
    outQty: 1,
    ingredients: { wood: 3, copper_ore: 1 },
    desc: 'Lentera hangat yang menyala saat sore/malam'
  },
  {
    id: 'craft_sprinkler',
    output: 'sprinkler',
    outQty: 1,
    ingredients: { stone: 4, copper_ore: 2, gold_ore: 1 },
    desc: 'Otomatis menyiram 3x3 petak setiap pagi!'
  },
  {
    id: 'craft_salad',
    output: 'salad',
    outQty: 1,
    ingredients: { crop_turnip: 1, crop_tomato: 1 },
    desc: 'Makanan penambah +75 Energi'
  }
];

export const NPCS = [
  {
    id: 'budi',
    name: 'Pak Budi',
    role: 'Pedagang Bibit & Hasil Bumi',
    portrait: '👨‍🌾',
    homeX: -4,
    homeZ: -4,
    skin: '#e0ac69',
    shirt: '#2a9d8f',
    pants: '#264653',
    hat: 'straw',
    hatColor: '#e9c46a',
    isMerchant: true,
    lines: [
      'Selamat datang di Lembah Asri! Kebun di selatan itu sekarang milikmu.',
      'Kalau butuh bibit Lobak, Tomat, atau Labu, beli saja di tokoku ya!',
      'Tips petani: kalau hujan turun, kamu tidak perlu capek menyiram tanaman.'
    ]
  },
  {
    id: 'sari',
    name: 'Mbak Sari',
    role: 'Penambang & Pengrajin',
    portrait: '👷‍♀️',
    homeX: 6,
    homeZ: -3,
    skin: '#f1c27d',
    shirt: '#e76f51',
    pants: '#3d405b',
    hat: 'cap',
    hatColor: '#f4a261',
    isMerchant: false,
    lines: [
      'Di sebelah timur ada bukit batu tambang! Bawa Beliung untuk cari Tembaga & Emas.',
      'Kalau sudah punya Tembaga dan Emas, buka menu Crafting (I) dan rakit Sprinkler Otomatis!',
      'Batu tambang di bukit akan muncul kembali setiap pergantian hari.'
    ]
  },
  {
    id: 'kakek',
    name: 'Kek Wiryo',
    role: 'Tetua Desa',
    portrait: '🧓',
    homeX: -7,
    homeZ: 2,
    skin: '#c68642',
    shirt: '#6c584c',
    pants: '#3a2e2b',
    hat: 'none',
    hatColor: '#dcdcdc',
    isMerchant: false,
    lines: [
      'Senang melihat anak muda menghidupkan kembali lahan tua ini.',
      'Jangan lupa tidur sebelum kelelahan. Rumahmu ada di sebelah utara kebun.',
      'Masukkan hasil panen ke Kotak Jual (Shipping Bin) di samping rumah untuk dapat koin!'
    ]
  }
];

export const CUSTOMIZATION_OPTIONS = {
  skins: ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'],
  shirts: ['#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#9b5de5', '#f77f00', '#3a5a40'],
  pants: ['#1d3557', '#264653', '#4a4e69', '#582f0e', '#2b2d42', '#343a40'],
  hats: [
    { id: 'straw', label: '👒 Caping Tani' },
    { id: 'cap', label: '🧢 Topi Petualang' },
    { id: 'hair', label: '💇 Rambut Jambul' },
    { id: 'none', label: '🙂 Polos' }
  ],
  hatColors: ['#e9c46a', '#bc6c25', '#222222', '#6f1d1b', '#3a86ff', '#ff006e', '#ffffff']
};
