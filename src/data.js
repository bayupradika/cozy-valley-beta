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
  { day: 4, label: 'Hari ke-4', icon: '🍲', gold: 0, itemId: 'salad', qty: 2, desc: '2x Sup Kebun (+75%⚡)' },
  { day: 5, label: 'Hari ke-5', icon: '🟠', gold: 0, itemId: 'copper_ore', qty: 3, desc: '3x Bijih Tembaga' },
  { day: 6, label: 'Hari ke-6', icon: '🎃', gold: 150, itemId: 'seed_pumpkin', qty: 3, desc: '3x Bibit Labu + 150 G' },
  { day: 7, label: 'Hari ke-7', icon: '💦', gold: 300, itemId: 'sprinkler', qty: 1, desc: '1x Sprinkler Otomatis + 300 G!' }
];

export const ITEMS = {
  hoe:          { id: 'hoe', name: 'Cangkul', icon: '🌾', toolType: 'hoe', stackable: false, desc: 'Menggemburkan rumput di kebun menjadi tanah garapan.' },
  watercan:     { id: 'watercan', name: 'Penyiram', icon: '🚿', toolType: 'water', stackable: false, desc: 'Menyiram tanaman agar tumbuh saat tidur berganti hari.' },
  pickaxe:      { id: 'pickaxe', name: 'Beliung', icon: '⛏️', toolType: 'pickaxe', stackable: false, desc: 'Menambang batu & bijih mineral di Gua Tambang.' },
  axe:          { id: 'axe', name: 'Kapak', icon: '🪓', toolType: 'axe', stackable: false, desc: 'Menebang pohon menjadi kayu di Hutan / Kebun.' },
  fishing_rod:  { id: 'fishing_rod', name: 'Pancingan Bambu', icon: '🎣', toolType: 'rod', stackable: false, desc: 'Klik tahan memutar joran, lepas melempar ke depan, klik berkali-kali saat ikan menyambar!' },

  seed_turnip:  { id: 'seed_turnip', name: 'Bibit Lobak', icon: '🌱', type: 'seed', cropId: 'turnip', buyPrice: 20, sellPrice: 10, stackable: true, desc: 'Panen dalam 2 hari.' },
  seed_tomato:  { id: 'seed_tomato', name: 'Bibit Tomat', icon: '🍅', type: 'seed', cropId: 'tomato', buyPrice: 40, sellPrice: 20, stackable: true, desc: 'Panen dalam 3 hari, nilai jual bagus.' },
  seed_pumpkin: { id: 'seed_pumpkin', name: 'Bibit Labu Emas', icon: '🎃', type: 'seed', cropId: 'pumpkin', buyPrice: 75, sellPrice: 35, stackable: true, desc: 'Panen dalam 4 hari, keuntungan besar!' },

  crop_turnip:  { id: 'crop_turnip', name: 'Lobak Segar', icon: '🥕', type: 'crop', sellPrice: 45, energy: 20, stackable: true, desc: 'Jual ke Toko Pak Budi (45G) atau makan (+20% Stamina).' },
  crop_tomato:  { id: 'crop_tomato', name: 'Tomat Merah', icon: '🍅', type: 'crop', sellPrice: 95, energy: 35, stackable: true, desc: 'Jual ke Toko Pak Budi (95G) atau makan (+35% Stamina).' },
  crop_pumpkin: { id: 'crop_pumpkin', name: 'Labu Emas', icon: '🎃', type: 'crop', sellPrice: 190, energy: 60, stackable: true, desc: 'Hasil panen premium (190G / +60% Stamina).' },

  wild_berry:   { id: 'wild_berry', name: 'Beri Hutan Liar', icon: '🫐', type: 'forage', sellPrice: 25, energy: 18, stackable: true, desc: 'Hasil foraging di hutan (+18% Stamina / 25G).' },
  sea_shell:    { id: 'sea_shell', name: 'Kerang Pantai', icon: '🐚', type: 'forage', sellPrice: 38, stackable: true, desc: 'Benda terdampar di pasir pantai (38G).' },
  fish_carp:    { id: 'fish_carp', name: 'Ikan Mas Sungai', icon: '🐟', type: 'fish', sellPrice: 55, energy: 25, stackable: true, desc: 'Hasil pancingan segar (55G / +25% Stamina).' },
  fish_snapper: { id: 'fish_snapper', name: 'Kakap Merah Laut', icon: '🐠', type: 'fish', sellPrice: 110, energy: 45, stackable: true, desc: 'Ikan laut bernilai tinggi (110G / +45% Stamina).' },

  wood:         { id: 'wood', name: 'Kayu', icon: '🪵', type: 'material', sellPrice: 8, stackable: true, desc: 'Bahan dasar crafting.' },
  stone:        { id: 'stone', name: 'Batu', icon: '🪨', type: 'material', sellPrice: 10, stackable: true, desc: 'Bahan konstruksi & crafting.' },
  copper_ore:   { id: 'copper_ore', name: 'Bijih Tembaga', icon: '🟠', type: 'material', sellPrice: 28, stackable: true, desc: 'Bijih dari dalam Gua Tambang.' },
  gold_ore:     { id: 'gold_ore', name: 'Bijih Emas', icon: '✨', type: 'material', sellPrice: 65, stackable: true, desc: 'Bijih langka dari kedalaman tambang!' },
  amethyst:     { id: 'amethyst', name: 'Permata Kecubung', icon: '💎', type: 'material', sellPrice: 130, stackable: true, desc: 'Mineral langka koleksi tambang!' },

  fence:        { id: 'fence', name: 'Pagar Kayu', icon: '🚧', type: 'placeable', placeType: 'fence', sellPrice: 15, stackable: true, desc: 'Dekorasi pagar kebun.' },
  lamp:         { id: 'lamp', name: 'Lentera Taman', icon: '🏮', type: 'placeable', placeType: 'lamp', sellPrice: 45, stackable: true, desc: 'Menerangi area di malam hari.' },
  sprinkler:    { id: 'sprinkler', name: 'Sprinkler Otomatis', icon: '💦', type: 'placeable', placeType: 'sprinkler', sellPrice: 120, stackable: true, desc: 'Menyiram 8 petak kebun di sekitarnya tiap pagi!' },
  stone_path:   { id: 'stone_path', name: 'Jalan Batu', icon: '🧱', type: 'placeable', placeType: 'path', sellPrice: 12, stackable: true, desc: 'Mempercantik jalur kebun.' },
  salad:        { id: 'salad', name: 'Sup Kebun Hangat', icon: '🍲', type: 'food', energy: 75, sellPrice: 80, stackable: true, desc: 'Masakan dapur pemulih +75% Stamina.' },
  grilled_fish: { id: 'grilled_fish', name: 'Ikan Bakar Bumbu', icon: '🍛', type: 'food', energy: 85, sellPrice: 125, stackable: true, desc: 'Olahan ikan lezat (+85% Stamina / 125G).' },

  // Hewan ternak hidup yang ditangkap ke dalam tas & hasil produksi / kebutuhan ternak
  cow_live:     { id: 'cow_live', name: 'Sapi Hidup', icon: '🐄', type: 'animal_live', animalType: 'cow', stackable: false, desc: 'Sapi perah tangkapan! Bawa ke kandang sapi di dalam Gudang Ternak (sebelah kiri rumah) sebelum 1 hari berlalu.' },
  chicken_live: { id: 'chicken_live', name: 'Ayam Betina Hidup', icon: '🐔', type: 'animal_live', animalType: 'chicken', stackable: false, desc: 'Ayam hidup tangkapan! Bawa ke sarang petelur di dalam Gudang Ternak sebelum 1 hari berlalu.' },
  rooster_live: { id: 'rooster_live', name: 'Ayam Jantan (Pejantan)', icon: '🐓', type: 'animal_live', animalType: 'chicken_rooster', buyPrice: 150, sellPrice: 30, stackable: false, desc: 'Ayam jantan untuk diletakkan di Kandang Ayam Kecil agar bisa mengawini ayam betina petelur.' },
  sheep_live:   { id: 'sheep_live', name: 'Domba Hidup', icon: '🐑', type: 'animal_live', animalType: 'sheep', stackable: false, desc: 'Domba hidup tangkapan.' },

  cow_milk:     { id: 'cow_milk', name: 'Susu Sapi Segar', icon: '🥛', type: 'food', energy: 40, sellPrice: 120, stackable: true, desc: 'Susu segar hasil perahan sapi setelah 2 hari makan teratur (+40% Stamina / 120G).' },
  egg_chicken:  { id: 'egg_chicken', name: 'Telur Ayam Segar', icon: '🥚', type: 'food', energy: 25, sellPrice: 60, stackable: true, desc: 'Telur ayam segar dari sarang petelur setelah kawin dan 2 hari makan teratur (+25% Stamina / 60G).' },

  animal_feed:  { id: 'animal_feed', name: 'Pakan Rumput Ternak', icon: '🌾', type: 'material', buyPrice: 15, sellPrice: 5, stackable: true, desc: 'Rumput pakan bergizi untuk mengisi bak pakan sapi dan ayam di dalam Gudang Ternak.' },
  animal_medicine:{ id: 'animal_medicine', name: 'Obat Ternak', icon: '💊', type: 'material', buyPrice: 100, sellPrice: 20, stackable: true, desc: 'Obat mujarab untuk menyembuhkan sapi atau ayam yang sakit akibat kelaparan 4 hari.' },
  cow_preg_pill:{ id: 'cow_preg_pill', name: 'Pil Hamil Sapi', icon: '🧪', type: 'material', buyPrice: 250, sellPrice: 50, stackable: true, desc: 'Pil hormon khusus agar sapi di dalam kandang bisa hamil dan melahirkan anak sapi.' },

  animal_carcass:{ id: 'animal_carcass', name: 'Bangkai Hewan', icon: '🦴', type: 'material', sellPrice: 5, stackable: true, desc: 'Bangkai hewan yang mati akibat 7 hari kelaparan / 3 hari sakit tanpa obat. Bertahan 30 hari di kandang jika tidak dibuang.' },

  // ITEM STORY & PROLOG (Sesuai Referensi GDocs)
  mystery_orb:  { id: 'mystery_orb', name: 'Bola Kaca Misterius', icon: '🔮', type: 'material', sellPrice: 0, stackable: false, desc: 'Benda aneh yang jatuh dari langit malam itu. Sempat memancarkan cahaya terang di tengah kawah terbakar sebelum meredup menjadi seperti bola kaca biasa.' },
  herb:         { id: 'herb', name: 'Tanaman Obat (Herb)', icon: '🌿', type: 'material', buyPrice: 30, sellPrice: 20, energy: 15, stackable: true, desc: 'Herbal obat alami untuk ramuan pengobatan Christaa dan warga Desa Forhest.' },
  snack:        { id: 'snack', name: 'Camilan Pengembara', icon: '🥪', type: 'food', energy: 35, buyPrice: 50, sellPrice: 30, stackable: true, desc: 'Ransum bekal pengembara pemulih +35% Stamina.' },
  water_bottle: { id: 'water_bottle', name: 'Botol Air Bersih', icon: '🍶', type: 'food', energy: 25, buyPrice: 30, sellPrice: 18, stackable: true, desc: 'Air minum segar penghilang dahaga (+25% Stamina).' },
  iron_ore:     { id: 'iron_ore', name: 'Bijih Besi', icon: '🔩', type: 'material', buyPrice: 50, sellPrice: 35, stackable: true, desc: 'Bijih besi murni dari kedalaman Gua Tambang untuk ditempa oleh Pak Rol si Pandai Besi.' },
  armour_vest:  { id: 'armour_vest', name: 'Baju Pelindung (Armour)', icon: '🛡️', type: 'material', sellPrice: 350, stackable: false, desc: 'Armour pelindung hadiah tanda perkenalan dari seluruh warga Desa Forhest.' }
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
  { id: 'craft_salad',     output: 'salad',        outQty: 1, ingredients: { crop_turnip: 1, crop_tomato: 1 },       desc: 'Masakan kebun (+75% Stamina)' },
  { id: 'craft_grillfish', output: 'grilled_fish', outQty: 1, ingredients: { fish_carp: 1, wood: 1 },                desc: 'Ikan bakar hangat (+85% Stamina)' }
];

// =========================================================
// PROLOG CERITA (Berdasarkan Dokumen Referensi GDocs)
// =========================================================
export const PROLOG_SLIDES = [
  {
    step: 1,
    badge: '🌊 Bencana di Laut Lepas',
    title: 'Kapal Karam Ditelan Badai Ganas',
    subtitle: 'Samudera Luas Menuju Benua Lain',
    icon: '⛵',
    bg: '#0a192f',
    speaker: 'Narator',
    speakerAvatar: '📜',
    dialog: 'Di tengah lautan luas, sebuah kapal besar sedang berlayar melintasi perairan menuju benua lain. Suasana perjalanan awalnya berjalan normal, hingga beberapa jam kemudian langit mulai berubah gelap gulita.\n\nAwan hitam pekat berkumpul, disusul angin kencang dan ombak raksasa yang menghantam badan kapal hingga kehilangan kendali. Para penumpang panik menyelamatkan diri, sebelum akhirnya kapal besar itu tenggelam ditelan ganasnya lautan.'
  },
  {
    step: 2,
    badge: '🔥 Keheningan Hutan Malam',
    title: 'Dentuman & Benda dari Langit',
    subtitle: 'Selamat Terdampar di Dekat Api Unggun',
    icon: '☄️',
    bg: '#1c150c',
    speaker: 'Ryu',
    speakerAvatar: '🧑‍🌾',
    dialog: 'Aku berhasil selamat dari insiden tenggelamnya kapal itu. Malam itu, di tengah hutan yang gelap dan sunyi, aku duduk seorang diri di dekat api unggun, hanya ditemani gemerisik dedaunan.\n\nTiba-tiba pandanganku tertuju ke langit... Sebuah benda bercahaya melesat turun dengan sangat cepat! Sebelum aku tiba di arah jatuhnya, terdengar suara dentuman keras yang mengguncang seluruh tanah hutan.'
  },
  {
    step: 3,
    badge: '🔮 Kawah Membara',
    title: 'Menemukan Bola Kaca Misterius',
    subtitle: 'Pohon Hangus & Asap di Tengah Hutan',
    icon: '🔮',
    bg: '#2b1111',
    speaker: 'Ryu',
    speakerAvatar: '🧑‍🌾',
    dialog: 'Sesampainya di lokasi, area hutan tampak terbakar hebat dan asap mengepul dari tanah. Namun di tengah area yang hangus, terlihat sebuah bola bercahaya terang benderang!\n\nPerlahan aku mendekat dan mengambil bola tersebut lalu menyimpannya ke dalam tas. Sesaat setelah disimpan, cahaya terang itu mendadak padam... kini bola tersebut tampak seperti sebuah bola kaca biasa.'
  },
  {
    step: 4,
    badge: '🤝 Pertemuan Pertama',
    title: 'Pak Bohei & Warga Desa Forhest',
    subtitle: 'Bahu Membahu Memadamkan Api',
    icon: '👨‍🌾',
    bg: '#1b2d18',
    speaker: 'Pak Bohei',
    speakerAvatar: '👨‍🌾',
    dialog: '"Siapa kau? Apa yang sebenarnya terjadi di tempat ini?!"\n\nSetelah aku menceritakan kejadiannya, kami bersama warga memadamkan kobaran api hingga tuntas. Pak Bohei memperkenalkan diri sebagai Kepala Desa Forhest. Karena hari sudah larut malam, beliau dengan ramah mengajakku menginap semalam di rumahnya di Desa Forhest.'
  },
  {
    step: 5,
    badge: '🏡 Tempat Tinggal Baru',
    title: 'Selamat Datang di Desa Forhest, Ryu!',
    subtitle: 'Kawah yang Bersih Ajaib & Rumah Baru',
    icon: '🏡',
    bg: '#1e3320',
    speaker: 'Pak Bohei',
    speakerAvatar: '👨‍🌾',
    dialog: 'Keesokan paginya saat kami kembali ke lokasi jatuhnya benda... ANEH! Tempat itu telah bersih dan rapi tanpa ada sisa kebakaran!\n\nPak Bohei kemudian membawaku ke sebidang tanah luas di barat desa: "Pemilik tempat ini sudah lama tiada. Mulai hari ini, tempat ini milikmu, Ryu. Rawatlah tanah ini, bercocok tanam, beternak, dan berdaganglah bersama warga desa!"'
  }
];

// =========================================================
// STORY QUEST UTAMA (Berdasarkan Bab Cerita GDocs)
// =========================================================
export const STORY_QUESTS = [
  {
    id: 'story_1_1',
    num: '1.1',
    title: 'Tempat Tinggal Baru',
    giver: 'Pak Bohei',
    giverPortrait: '👨‍🌾',
    scene: 'farm',
    summary: 'Ryu menerima lahan pertanian baru dan membersihkan rumah tua di Desa Forhest.',
    reqText: 'Selesaikan prolog cerita awal untuk memulai kehidupan baru di Desa Forhest.',
    rewardGold: 1500,
    rewardItems: [
      { id: 'mystery_orb', qty: 1 },
      { id: 'herb', qty: 5 },
      { id: 'snack', qty: 5 },
      { id: 'water_bottle', qty: 5 },
      { id: 'wood', qty: 10 },
      { id: 'stone', qty: 10 }
    ],
    affReward: { bohei: 1 }
  },
  {
    id: 'story_1_2',
    num: '1.2',
    title: 'Berkenalan dengan Warga Desa Forhest',
    giver: 'Dino',
    giverPortrait: '👦',
    scene: 'village',
    summary: 'Berkeliling Desa Forhest di siang hari dan berkenalan dengan warga desa.',
    reqText: 'Sapa warga Desa Forhest (Dino, Pak Bohei, Christaa, Pak Blen, Bu Rossi, dll).',
    neededGreetings: 3,
    rewardGold: 2000,
    rewardItems: [{ id: 'armour_vest', qty: 1 }],
    affRewardAll: 1
  },
  {
    id: 'story_1_3',
    num: '1.3',
    title: 'Menjaga Lokasi Benda Jatuh',
    giver: 'Pak Roden & Pak Bohei',
    giverPortrait: '👷',
    scene: 'village',
    summary: 'Bantu Pak Roden membangun pondok & pagar di lokasi benda langit yang jatuh di hutan selatan.',
    needMaterials: { wood: 20, stone: 20, herb: 5 },
    reqText: 'Kumpulkan 20 Kayu, 20 Batu, dan 5 Tanaman Obat (Herb) untuk pembangunan pos pengamanan.',
    rewardGold: 2000,
    affReward: { bohei: 5, dino: 5, roden: 5, christaa: 5 }
  },
  {
    id: 'story_1_4',
    num: '1.4',
    title: 'Serangan Bandit Malam Hari',
    giver: 'Dino',
    giverPortrait: '👦',
    scene: 'farm',
    summary: 'Dino memperingatkan ada bandit mencurigakan yang mengintai lokasi benda langit di Desa Forhest.',
    needMaterials: { wood: 20, stone: 10 },
    reqText: 'Perbaiki pondok pos pengamanan dengan membawa 20 Kayu dan 10 Batu di tas.',
    rewardGold: 2500,
    affRewardAll: 10
  },
  {
    id: 'story_1_5',
    num: '1.5',
    title: 'Pengobatan & Tambang Besi',
    giver: 'Christaa & Pak Rol',
    giverPortrait: '👧',
    scene: 'village',
    summary: 'Bantu Christaa meracik obat dan kumpulkan bijih besi untuk Pak Rol si Pandai Besi.',
    needMaterials: { herb: 15, iron_ore: 10 },
    reqText: 'Kumpulkan 15 Herb untuk Christaa dan 10 Bijih Besi dari Gua Tambang untuk Pak Rol.',
    rewardGold: 5000,
    rewardItems: [{ id: 'iron_ore', qty: 10 }],
    affReward: { christaa: 20, rol: 15 }
  }
];

// Setiap NPC memiliki Quest & Toko Desa (Melapor menyelesaikan quest -> lanjut ke zona waktu berikutnya!)
export const NPCS = [
  {
    id: 'bohei',
    scene: 'town_hall',
    name: 'Pak Bohei',
    role: 'Kepala Desa Forhest',
    portrait: '👨‍🌾',
    homeX: 0,
    homeY: 1.5,
    skin: '#e0ac69',
    shirt: '#6f1d1b',
    pants: '#1d3557',
    hat: 'straw',
    hatColor: '#bc6c25',
    isMerchant: false,
    quests: [
      { title: 'Gotong Royong Desa Forhest', itemId: 'stone', need: 6, reward: 160, reqText: 'Warga desa sedang merapikan jalan setapak. Bisa bantu bawakan 6 Batu untuk desa?' },
      { title: 'Panen Unggulan Desa', itemId: 'crop_pumpkin', need: 1, reward: 300, reqText: 'Tolong tanam dan bawakan 1 Labu Emas terbaik untuk pameran hasil panen Desa Forhest!' }
    ],
    lines: [
      'Selamat datang di Balai Desa Forhest, Ryu! Aku sangat senang melihatmu mulai menetap dan merawat lahan barat desa.',
      'Di desa ini, kau bisa mendapatkan penghasilan dari bertani, beternak, berdagang, hingga menjelajahi dungeon suatu saat nanti.'
    ]
  },
  {
    id: 'dino',
    scene: 'village',
    name: 'Dino',
    role: 'Pemuda Ceria Desa Forhest',
    portrait: '👦',
    homeX: 1,
    homeY: -1,
    skin: '#f1c27d',
    shirt: '#2a9d8f',
    pants: '#264653',
    hat: 'hair',
    hatColor: '#e9c46a', // Rambut kuning sesuai dokumen!
    isMerchant: false,
    quests: [
      { title: 'Bahan Kayu Dino', itemId: 'wood', need: 5, reward: 110, reqText: 'Hei Ryu! Maukah kamu membantuku mengumpulkan 5 Kayu dari hutan untuk pagar?' },
      { title: 'Beri Hutan Segar', itemId: 'wild_berry', need: 2, reward: 125, reqText: 'Aku ingin mencicipi Beri Hutan Liar di dekat pantai. Bawakan 2 buah ya!' }
    ],
    lines: [
      'Halo Ryu! Aku Dino! Senang sekali ada pemuda sebayaku yang tinggal di desa ini!',
      'Kalau ada apa-apa, tanyakan saja padaku atau warga lainnya. Desa Forhest sangat ramah dan menyenangkan!'
    ]
  },
  {
    id: 'blen',
    scene: 'village',
    name: 'Pak Blen & Bu Rossi',
    role: 'Pemilik Toko Desa Forhest',
    portrait: '🧔',
    homeX: -6,
    homeY: 1.5,
    skin: '#e0ac69',
    shirt: '#457b9d',
    pants: '#1d3557',
    hat: 'cap',
    hatColor: '#bc6c25',
    isMerchant: true,
    quests: [
      { title: 'Pasokan Lobak Segar Toko', itemId: 'crop_turnip', need: 2, reward: 150, reqText: 'Toko kami sedang kekurangan pasokan sayur. Tolong panen dan bawakan 2 Lobak Segar ya!' },
      { title: 'Pesanan Tomat Merah', itemId: 'crop_tomato', need: 2, reward: 240, reqText: 'Pelanggan mencari 2 Tomat Merah segar. Bisa tolong bantu sediakan?' }
    ],
    lines: [
      'Selamat datang di Toko Desa Forhest! Kami menyediakan bibit, pakan ternak, obat, dan siap membeli hasil panenmu!',
      'Putri kami, Christaa, sangat suka tanaman obat dan herbal di hutan. Sapalah dia jika bertemu!'
    ]
  },
  {
    id: 'christaa',
    scene: 'village',
    name: 'Christaa',
    role: 'Gadis Herbalis (Putri Toko Desa)',
    portrait: '👧',
    homeX: -4,
    homeY: -1.5,
    skin: '#ffdbac',
    shirt: '#e63946',
    pants: '#4a4e69',
    hat: 'hair',
    hatColor: '#6f1d1b',
    isMerchant: false,
    quests: [
      { title: 'Bahan Ramuan Herbal', itemId: 'herb', need: 3, reward: 180, reqText: 'Hai Ryu! Bisakah kamu mencarikan 3 Tanaman Obat (Herb) di hutan untuk racikan obatku?' },
      { title: 'Koleksi Bunga & Kerang', itemId: 'sea_shell', need: 2, reward: 130, reqText: 'Aku suka menghias botol ramuan dengan kerang pantai. Tolong carikan 2 ya!' }
    ],
    lines: [
      'Hai Ryu! Aku Christaa. Senang berkenalan denganmu!',
      'Hutan di selatan memiliki banyak tanaman obat dan herbal berkhasiat jika kamu rajin menjelajah.'
    ]
  },
  {
    id: 'rol',
    scene: 'village',
    name: 'Pak Rol',
    role: 'Dwarf Pandai Besi & Penempa',
    portrait: '🧔‍♂️',
    homeX: 7.0,
    homeY: 4.5,
    skin: '#c68642',
    shirt: '#582f0e',
    pants: '#2b2d42',
    hat: 'none',
    hatColor: '#333333',
    isMerchant: false,
    quests: [
      { title: 'Bahan Tempaan Tembaga', itemId: 'copper_ore', need: 2, reward: 140, reqText: 'Bawa 2 Bijih Tembaga dari Gua Tambang utara untuk kupanaskan di tungku tempa!' },
      { title: 'Uji Coba Bijih Besi', itemId: 'iron_ore', need: 2, reward: 220, reqText: 'Bijih besi murni sangat bagus untuk membuat perkakas kokoh. Bawakan aku 2 bongkah!' }
    ],
    lines: [
      'Hahaha! Selamat datang di bengkel tempa! Aku Pak Rol si penempa logam Desa Forhest.',
      'Gua Tambang di utara menyimpan banyak mineral berharga. Jangan lupa bawa Beliungmu saat masuk ke sana!'
    ]
  },
  {
    id: 'billy',
    scene: 'village',
    name: 'Pak Billy',
    role: 'Peternak Hewan Desa Forhest',
    portrait: '🤠',
    homeX: -3.5,
    homeY: 4.5,
    skin: '#e0ac69',
    shirt: '#f77f00',
    pants: '#264653',
    hat: 'straw',
    hatColor: '#e9c46a',
    isMerchant: false,
    quests: [
      { title: 'Rumput Pakan Segar', itemId: 'animal_feed', need: 2, reward: 120, reqText: 'Bisakah kamu membawakan 2 Pakan Rumput untuk hewan ternak desa?' }
    ],
    lines: [
      'Halo Ryu! Sapi dan ayam di gudang ternakmu butuh makan dan minum 1x sehari ya.',
      'Kalau kamu rajin memberi pakan, sapi akan menghasilkan susu segar dan ayam petelur akan bertelur banyak!'
    ]
  },
  {
    id: 'roden',
    scene: 'village',
    name: 'Pak Roden',
    role: 'Arsitek & Pembangun Desa',
    portrait: '👷',
    homeX: 5.5,
    homeY: 1.0,
    skin: '#c68642',
    shirt: '#e76f51',
    pants: '#3d405b',
    hat: 'cap',
    hatColor: '#f4a261',
    isMerchant: false,
    quests: [
      { title: 'Bahan Konstruksi Kayu', itemId: 'wood', need: 6, reward: 130, reqText: 'Aku butuh 6 Kayu kokoh untuk perbaikan bangunan desa. Bisa bantu tebang di hutan?' }
    ],
    lines: [
      'Halo anak muda! Aku Pak Roden. Aku mengurus konstruksi dan bangunan di Desa Forhest.',
      'Rumahmu di lahan barat adalah bangunan kokoh peninggalan masa lalu, rawatlah baik-baik.'
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
      'Hasil pancingan dan kerang pantai bisa kamu jual ke Toko Pak Blen di Desa Forhest.'
    ]
  }
];

// Paket Koleksi & Gotong Royong di Balai Desa Forhest (Sesuai Referensi GDocs Bagian 13/14)
export const VILLAGE_BUNDLES = [
  {
    id: 'bundle_tani',
    title: '🌾 Paket Lumbung Pangan Desa',
    items: { crop_turnip: 2, crop_tomato: 1 },
    rewardGold: 220,
    rewardItem: 'sprinkler',
    rewardQty: 1,
    desc: 'Hadiah: +220 G & 1x Sprinkler Otomatis'
  },
  {
    id: 'bundle_alam',
    title: '🌲 Paket Pelestarian Hutan & Pantai',
    items: { wood: 5, wild_berry: 2, sea_shell: 1 },
    rewardGold: 180,
    rewardItem: 'salad',
    rewardQty: 2,
    desc: 'Hadiah: +180 G & 2x Sup Kebun Hangat'
  },
  {
    id: 'bundle_tambang',
    title: '⛏️ Paket Pembangunan Infrastruktur Desa',
    items: { stone: 5, copper_ore: 2, gold_ore: 1 },
    rewardGold: 320,
    rewardItem: 'lamp',
    rewardQty: 2,
    desc: 'Hadiah: +320 G & 2x Lentera Taman'
  }
];

export const SCENE_META = {
  house: {
    id: 'house',
    title: '🏠 Rumah Ryu (Desa Forhest)',
    isIndoor: true,
    halfW: 6,
    halfH: 5,
    bgColor: 0x1a120d
  },
  town_hall: {
    id: 'town_hall',
    title: '🏛️ Balai Desa Forhest',
    isIndoor: true,
    halfW: 7,
    halfH: 5,
    bgColor: 0x1d1410
  },
  barn_indoor: {
    id: 'barn_indoor',
    title: '🛖 Gudang Ternak Ryu',
    isIndoor: true,
    halfW: 8,
    halfH: 6,
    bgColor: 0x1d1410
  },
  farm: {
    id: 'farm',
    title: '🌾 Lahan Pertanian & Kebun Ryu',
    isIndoor: false,
    halfW: 11,
    halfH: 9,
    bgColor: 0x294d25
  },
  village: {
    id: 'village',
    title: '🏘️ Alun-Alun Desa Forhest',
    isIndoor: false,
    halfW: 12,
    halfH: 9,
    bgColor: 0x2d5328
  },
  forest_beach: {
    id: 'forest_beach',
    title: '🌲 Hutan & Pantai Selatan (Lokasi Jatuh)',
    isIndoor: false,
    halfW: 11,
    halfH: 9,
    bgColor: 0x1e4d5c
  },
  mine: {
    id: 'mine',
    title: '⛏️ Gua Tambang Desa Forhest',
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
