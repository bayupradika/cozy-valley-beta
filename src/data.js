// Database item, tanaman, resep crafting, NPC & Quest NPC, Fase Waktu, dan Login Harian

export const DAYS_OF_WEEK = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// 4 Fase Zona Waktu (Masing-masing 5 menit = 300 detik nyata, kecuali Tengah Malam terkunci sampai tidur)
export const TIME_PHASES = [
  { id: 'morning',   label: '🌅 Pagi',         clockStart: 6,  clockEnd: 12, durationSec: 300 },
  { id: 'afternoon', label: '🌤️ Siang/Sore',   clockStart: 12, clockEnd: 18, durationSec: 300 },
  { id: 'evening',   label: '🌙 Malam',        clockStart: 18, clockEnd: 24, durationSec: 300 },
  { id: 'midnight',  label: '🌌 Tengah Malam', clockStart: 0,  clockEnd: 0,  durationSec: null }
];

// Hadiah Login Harian (Real-time per tanggal dunia nyata, di luar waktu game)
export const DAILY_LOGIN_REWARDS = [
  { day: 1, label: 'Hari ke-1', icon: '🪙', gold: 100, itemId: null, qty: 0, desc: '+100 G Modal Awal' },
  { day: 2, label: 'Hari ke-2', icon: '🍅', gold: 0, itemId: 'seed_tomato', qty: 4, desc: '4x Bibit Tomat' },
  { day: 3, label: 'Hari ke-3', icon: '🪙', gold: 200, itemId: null, qty: 0, desc: '+200 G Koin Desa' },
  { day: 4, label: 'Hari ke-4', icon: '🍲', gold: 0, itemId: 'salad', qty: 2, desc: '2x Sup Kebun (+75⚡)' },
  { day: 5, label: 'Hari ke-5', icon: '🟠', gold: 0, itemId: 'copper_ore', qty: 3, desc: '3x Bijih Tembaga' },
  { day: 6, label: 'Hari ke-6', icon: '🎃', gold: 150, itemId: 'seed_pumpkin', qty: 3, desc: '3x Bibit Labu + 150 G' },
  { day: 7, label: 'Hari ke-7', icon: '💦', gold: 300, itemId: 'sprinkler', qty: 1, desc: '1x Sprinkler Otomatis + 300 G!' }
];

export const ITEMS = {
  hoe:          { id: 'hoe', name: 'Cangkul', icon: '🌾', toolType: 'hoe', stackable: false, desc: 'Menggemburkan rumput di kebun menjadi tanah garapan.' },
  watercan:     { id: 'watercan', name: 'Penyiram', icon: '🚿', toolType: 'water', stackable: false, desc: 'Menyiram tanaman agar tumbuh saat tidur berganti hari.' },
  pickaxe:      { id: 'pickaxe', name: 'Beliung', icon: '⛏️', toolType: 'pickaxe', stackable: false, desc: 'Menambang batu & bijih mineral di Gua Tambang.' },
  axe:          { id: 'axe', name: 'Kapak', icon: '🪓', toolType: 'axe', stackable: false, desc: 'Menebang pohon menjadi kayu di Hutan / Kebun.' },
  fishing_rod:  { id: 'fishing_rod', name: 'Pancingan Bambu', icon: '🎣', toolType: 'rod', stackable: false, desc: 'Gunakan di tepi air (Hutan/Pantai) untuk memancing ikan!' },

  seed_turnip:  { id: 'seed_turnip', name: 'Bibit Lobak', icon: '🌱', type: 'seed', cropId: 'turnip', buyPrice: 20, sellPrice: 10, stackable: true, desc: 'Panen dalam 2 hari.' },
  seed_tomato:  { id: 'seed_tomato', name: 'Bibit Tomat', icon: '🍅', type: 'seed', cropId: 'tomato', buyPrice: 40, sellPrice: 20, stackable: true, desc: 'Panen dalam 3 hari, nilai jual bagus.' },
  seed_pumpkin: { id: 'seed_pumpkin', name: 'Bibit Labu Emas', icon: '🎃', type: 'seed', cropId: 'pumpkin', buyPrice: 75, sellPrice: 35, stackable: true, desc: 'Panen dalam 4 hari, keuntungan besar!' },

  crop_turnip:  { id: 'crop_turnip', name: 'Lobak Segar', icon: '🥕', type: 'crop', sellPrice: 45, energy: 20, stackable: true, desc: 'Jual ke Toko Pak Budi (45G) atau makan (+20⚡).' },
  crop_tomato:  { id: 'crop_tomato', name: 'Tomat Merah', icon: '🍅', type: 'crop', sellPrice: 95, energy: 35, stackable: true, desc: 'Jual ke Toko Pak Budi (95G) atau makan (+35⚡).' },
  crop_pumpkin: { id: 'crop_pumpkin', name: 'Labu Emas', icon: '🎃', type: 'crop', sellPrice: 190, energy: 60, stackable: true, desc: 'Hasil panen premium (190G / +60⚡).' },

  wild_berry:   { id: 'wild_berry', name: 'Beri Hutan Liar', icon: '🫐', type: 'forage', sellPrice: 25, energy: 18, stackable: true, desc: 'Hasil foraging di hutan (+18⚡ / 25G).' },
  sea_shell:    { id: 'sea_shell', name: 'Kerang Pantai', icon: '🐚', type: 'forage', sellPrice: 38, stackable: true, desc: 'Benda terdampar di pasir pantai (38G).' },
  fish_carp:    { id: 'fish_carp', name: 'Ikan Mas Sungai', icon: '🐟', type: 'fish', sellPrice: 55, energy: 25, stackable: true, desc: 'Hasil pancingan segar (55G / +25⚡).' },
  fish_snapper: { id: 'fish_snapper', name: 'Kakap Merah Laut', icon: '🐠', type: 'fish', sellPrice: 110, energy: 45, stackable: true, desc: 'Ikan laut bernilai tinggi (110G / +45⚡).' },

  wood:         { id: 'wood', name: 'Kayu', icon: '🪵', type: 'material', sellPrice: 8, stackable: true, desc: 'Bahan dasar crafting.' },
  stone:        { id: 'stone', name: 'Batu', icon: '🪨', type: 'material', sellPrice: 10, stackable: true, desc: 'Bahan konstruksi & crafting.' },
  copper_ore:   { id: 'copper_ore', name: 'Bijih Tembaga', icon: '🟠', type: 'material', sellPrice: 28, stackable: true, desc: 'Bijih dari dalam Gua Tambang.' },
  gold_ore:     { id: 'gold_ore', name: 'Bijih Emas', icon: '✨', type: 'material', sellPrice: 65, stackable: true, desc: 'Bijih langka dari kedalaman tambang!' },
  amethyst:     { id: 'amethyst', name: 'Permata Kecubung', icon: '💎', type: 'material', sellPrice: 130, stackable: true, desc: 'Mineral langka koleksi tambang!' },

  fence:        { id: 'fence', name: 'Pagar Kayu', icon: '🚧', type: 'placeable', placeType: 'fence', sellPrice: 15, stackable: true, desc: 'Dekorasi pagar kebun.' },
  lamp:         { id: 'lamp', name: 'Lentera Taman', icon: '🏮', type: 'placeable', placeType: 'lamp', sellPrice: 45, stackable: true, desc: 'Menerangi area di malam hari.' },
  sprinkler:    { id: 'sprinkler', name: 'Sprinkler Otomatis', icon: '💦', type: 'placeable', placeType: 'sprinkler', sellPrice: 120, stackable: true, desc: 'Menyiram 8 petak kebun di sekitarnya tiap pagi!' },
  stone_path:   { id: 'stone_path', name: 'Jalan Batu', icon: '🧱', type: 'placeable', placeType: 'path', sellPrice: 12, stackable: true, desc: 'Mempercantik jalur kebun.' },
  salad:        { id: 'salad', name: 'Sup Kebun Hangat', icon: '🍲', type: 'food', energy: 75, sellPrice: 80, stackable: true, desc: 'Masakan dapur pemulih +75 Energi.' },
  grilled_fish: { id: 'grilled_fish', name: 'Ikan Bakar Bumbu', icon: '🍛', type: 'food', energy: 85, sellPrice: 125, stackable: true, desc: 'Olahan ikan lezat (+85⚡ / 125G).' }
};

export const CROPS = {
  turnip:  { id: 'turnip',  name: 'Lobak',     daysToGrow: 2, harvestItem: 'crop_turnip',  color: 0xf4a261 },
  tomato:  { id: 'tomato',  name: 'Tomat',     daysToGrow: 3, harvestItem: 'crop_tomato',  color: 0xe63946 },
  pumpkin: { id: 'pumpkin', name: 'Labu Emas', daysToGrow: 4, harvestItem: 'crop_pumpkin', color: 0xff9f1c }
};

export const RECIPES = [
  { id: 'craft_fence',     output: 'fence',        outQty: 2, ingredients: { wood: 4 },                              desc: '2x Pagar kayu untuk kebun' },
  { id: 'craft_path',      output: 'stone_path',   outQty: 2, ingredients: { stone: 3 },                             desc: '2x Ubin jalan batu rapi' },
  { id: 'craft_lamp',      output: 'lamp',         outQty: 1, ingredients: { wood: 3, copper_ore: 1 },               desc: 'Lentera yang menyala hangat saat malam' },
  { id: 'craft_sprinkler', output: 'sprinkler',    outQty: 1, ingredients: { stone: 4, copper_ore: 2, gold_ore: 1 }, desc: 'Otomatis menyiram 3x3 petak tiap pagi!' },
  { id: 'craft_salad',     output: 'salad',        outQty: 1, ingredients: { crop_turnip: 1, crop_tomato: 1 },       desc: 'Masakan kebun (+75 Energi)' },
  { id: 'craft_grillfish', output: 'grilled_fish', outQty: 1, ingredients: { fish_carp: 1, wood: 1 },                desc: 'Ikan bakar hangat (+85 Energi)' }
];

// Setiap NPC memiliki Quest yang bisa diambil & dilaporkan kembali (melapor menyelesaikan quest -> lanjut fase waktu berikutnya!)
export const NPCS = [
  {
    id: 'budi',
    scene: 'village',
    name: 'Pak Budi',
    role: 'Pemilik Toko Desa (Beli Bibit & Jual Hasil)',
    portrait: '👨‍🌾',
    homeX: -4,
    homeY: 1.5,
    skin: '#e0ac69',
    shirt: '#2a9d8f',
    pants: '#264653',
    hat: 'straw',
    hatColor: '#e9c46a',
    isMerchant: true,
    quests: [
      { title: 'Pasokan Lobak Segar', itemId: 'crop_turnip', need: 2, reward: 140, reqText: 'Tolong panen dan bawakan aku 2 Lobak Segar dari kebunmu ya!' },
      { title: 'Pesanan Tomat Desa', itemId: 'crop_tomato', need: 2, reward: 230, reqText: 'Warga desa sedang mencari 2 Tomat Merah segar. Bisa bantu sediakan?' }
    ],
    lines: [
      'Selamat datang di Toko Desa! Kamu bisa membeli bibit sekaligus menjual hasil panen/tambangmu kepadaku.',
      'Kalau kamu mengambil Quest dariku dan melapor saat selesai, kita akan mengobrol lama hingga waktu masuk ke fase berikutnya!'
    ]
  },
  {
    id: 'kakek',
    scene: 'village',
    name: 'Kek Wiryo',
    role: 'Tetua Desa',
    portrait: '🧓',
    homeX: 2,
    homeY: -1,
    skin: '#c68642',
    shirt: '#6c584c',
    pants: '#3a2e2b',
    hat: 'none',
    hatColor: '#dcdcdc',
    isMerchant: false,
    quests: [
      { title: 'Kayu Bakar Tetua', itemId: 'wood', need: 5, reward: 95, reqText: 'Persediaan kayu bakarku menipis. Maukah kamu mencarikan 5 Kayu untukku?' },
      { title: 'Oleh-Oleh Beri Hutan', itemId: 'wild_berry', need: 2, reward: 110, reqText: 'Aku rindu rasa Beri Hutan Liar di selatan kebunmu. Bawakan 2 buah ya!' }
    ],
    lines: [
      'Ingat nak, setiap zona waktu berjalan santai selama 5 menit.',
      'Tapi kalau sudah masuk Tengah Malam (00:00), tubuhmu tidak kuat bekerja lagi — segeralah pulang dan tidur di kasur!'
    ]
  },
  {
    id: 'sari',
    scene: 'village',
    name: 'Mbak Sari',
    role: 'Penambang & Pengrajin',
    portrait: '👷‍♀️',
    homeX: 4,
    homeY: 4.5,
    skin: '#f1c27d',
    shirt: '#e76f51',
    pants: '#3d405b',
    hat: 'cap',
    hatColor: '#f4a261',
    isMerchant: false,
    quests: [
      { title: 'Sampel Bijih Tembaga', itemId: 'copper_ore', need: 2, reward: 135, reqText: 'Aku butuh 2 Bijih Tembaga dari Gua Tambang di utara untuk ditempa!' },
      { title: 'Kilau Permata Gua', itemId: 'amethyst', need: 1, reward: 220, reqText: 'Kabarnya ada Permata Kecubung ungu di Gua Tambang. Carikan 1 untukku!' }
    ],
    lines: [
      'Pintu masuk Gua Tambang ada tepat di utara sini! Bawa Beliungmu sebelum masuk.',
      'Kalau kamu melapor menyelesaikan pesanan tambangku, sisa waktu fase ini langsung tuntas!'
    ]
  },
  {
    id: 'bayu_nelayan',
    scene: 'forest_beach',
    name: 'Bang Damar',
    role: 'Nelayan Pantai Selatan',
    portrait: '🎣',
    homeX: 2,
    homeY: -3.5,
    skin: '#c68642',
    shirt: '#457b9d',
    pants: '#1d3557',
    hat: 'straw',
    hatColor: '#f4a261',
    isMerchant: false,
    quests: [
      { title: 'Tangkapan Ikan Segar', itemId: 'fish_carp', need: 1, reward: 120, reqText: 'Ayo buktikan keahlian pancingmu! Tangkapkan 1 Ikan Mas dan lapor padaku.' },
      { title: 'Koleksi Kerang Pantai', itemId: 'sea_shell', need: 2, reward: 115, reqText: 'Bantu aku mengumpulkan 2 Kerang Pantai di sepanjang pasir ini yuk!' }
    ],
    lines: [
      'Pilih Pancingan Bambu (slot 5) lalu klik air laut untuk memancing ikan!',
      'Hasil pancingan dan kerang pantai bisa kamu jual ke Toko Pak Budi di Desa.'
    ]
  }
];

export const SCENE_META = {
  house: {
    id: 'house',
    title: '🏠 Dalam Rumah Petani',
    isIndoor: true,
    halfW: 6,
    halfH: 5,
    bgColor: 0x1a120d
  },
  farm: {
    id: 'farm',
    title: '🌾 Pekarangan & Kebun Rumah',
    isIndoor: false,
    halfW: 11,
    halfH: 9,
    bgColor: 0x294d25
  },
  village: {
    id: 'village',
    title: '🏘️ Alun-Alun Desa Asri',
    isIndoor: false,
    halfW: 12,
    halfH: 9,
    bgColor: 0x2d5328
  },
  forest_beach: {
    id: 'forest_beach',
    title: '🌲 Hutan Foraging & Pantai Selatan',
    isIndoor: false,
    halfW: 11,
    halfH: 9,
    bgColor: 0x1e4d5c
  },
  mine: {
    id: 'mine',
    title: '⛏️ Gua Tambang Bawah Tanah',
    isIndoor: true,
    halfW: 9,
    halfH: 8,
    bgColor: 0x16161d
  }
};

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
