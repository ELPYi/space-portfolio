import type { Language } from '../context/I18nContext';

const directMalay: Record<string, string> = {
  Animals: 'Haiwan',
  Foods: 'Makanan',
  Countries: 'Negara',
  Sports: 'Sukan',
  Colors: 'Warna',
  Clothing: 'Pakaian',
  Beverages: 'Minuman',
  Fruits: 'Buah-buahan',
  Vegetables: 'Sayur-sayuran',
  Occupations: 'Pekerjaan',
  Languages: 'Bahasa',
  Flowers: 'Bunga',
  Trees: 'Pokok',
  Insects: 'Serangga',
  Candy: 'Gula-gula',
  Toys: 'Mainan',
  Furniture: 'Perabot',
  Emotions: 'Emosi',
  Holidays: 'Cuti',
  Metals: 'Logam',
  Gemstones: 'Batu permata',
  Fabrics: 'Kain',
  Currencies: 'Mata wang',
  Spices: 'Rempah',
  Herbs: 'Herba',
  Grains: 'Bijirin',
  Nuts: 'Kekacang',
  Seafood: 'Makanan laut',
  Sauces: 'Sos',
  Soups: 'Sup',
  Breads: 'Roti',
  Movies: 'Filem',
  Songs: 'Lagu',
  Books: 'Buku',
  Websites: 'Laman web',
  Brands: 'Jenama',
  Vehicles: 'Kenderaan',
  Tools: 'Alat',
  Birds: 'Burung',
  Fish: 'Ikan',
  Reptiles: 'Reptilia',
  Sitcoms: 'Sitkom',
  Documentaries: 'Dokumentari',
  Musicals: 'Muzikal',
  'Fairy Tales': 'Cerita dongeng',
  Constellations: 'Buruj',
  Superstitions: 'Kepercayaan karut',
  Souvenirs: 'Cenderamata',
  Accessories: 'Aksesori',
  Hairstyles: 'Gaya rambut',
  Jewelry: 'Barang kemas',
};

const wordMap: Record<string, string> = {
  Things: 'Perkara',
  Thing: 'Perkara',
  Type: 'Jenis',
  Types: 'Jenis',
  Boy: 'Lelaki',
  Girl: 'Perempuan',
  Baby: 'Bayi',
  Pet: 'Haiwan peliharaan',
  Name: 'Nama',
  Historical: 'Sejarah',
  Figures: 'Tokoh',
  Fictional: 'Fiksyen',
  Villains: 'Penjahat',
  Cartoon: 'Kartun',
  Characters: 'Watak',
  Superheroes: 'Adiwira',
  Famous: 'Terkenal',
  Scientists: 'Saintis',
  Rappers: 'Rapper',
  Singers: 'Penyanyi',
  Actors: 'Pelakon',
  Actresses: 'Pelakon wanita',
  Disney: 'Disney',
  YouTubers: 'YouTuber',
  Athletes: 'Atlet',
  Comedians: 'Pelawak',
  Chefs: 'Chef',
  Band: 'Kumpulan',
  Bands: 'Kumpulan',
  Duos: 'Duo',
  Couples: 'Pasangan',
  Nicknames: 'Nama gelaran',
  TV: 'TV',
  Shows: 'Rancangan',
  Show: 'Rancangan',
  Video: 'Video',
  Games: 'Permainan',
  Game: 'Permainan',
  Board: 'Papan',
  Anime: 'Anime',
  Series: 'Siri',
  Card: 'Kad',
  Podcasts: 'Podcast',
  Reality: 'Realiti',
  Comedy: 'Komedi',
  Horror: 'Seram',
  Action: 'Aksi',
  Romantic: 'Romantik',
  Kids: 'Kanak-kanak',
  Song: 'Lagu',
  Titles: 'Tajuk',
  Album: 'Album',
  Catchphrases: 'Frasa ikonik',
  Movie: 'Filem',
  Quotes: 'Petikan',
  Mobile: 'Mudah alih',
  Classic: 'Klasik',
  Arcade: 'Arked',
  Cities: 'Bandar',
  States: 'Negeri',
  World: 'Dunia',
  Capitals: 'Ibu kota',
  Landmarks: 'Mercu tanda',
  Tourist: 'Pelancong',
  Attractions: 'Tarikan',
  Restaurants: 'Restoran',
  Fast: 'Segera',
  Food: 'Makanan',
  Chains: 'Rangkaian',
  Places: 'Tempat',
  National: 'Kebangsaan',
  Parks: 'Taman',
  Islands: 'Pulau',
  European: 'Eropah',
  Asian: 'Asia',
  African: 'Afrika',
  South: 'Selatan',
  American: 'Amerika',
  Beach: 'Pantai',
  Towns: 'Pekan',
  Mountain: 'Gunung',
  Ranges: 'Banjaran',
  Rivers: 'Sungai',
  Deserts: 'Gurun',
  Neighborhoods: 'Kejiranan',
  Amusement: 'Hiburan',
  Stadiums: 'Stadium',
  Arenas: 'Arena',
  Streets: 'Jalan terkenal',
  Colleges: 'Kolej',
  Universities: 'Universiti',
  Haunted: 'Berhantu',
  Breakfast: 'Sarapan',
  Pizza: 'Piza',
  Toppings: 'Topping',
  Desserts: 'Pencuci mulut',
  Cocktails: 'Koktel',
  Drinks: 'Minuman',
  Snack: 'Snek',
  Cheese: 'Keju',
  Ice: 'Ais',
  Cream: 'Krim',
  Flavors: 'Perisa',
  Eat: 'makan',
  With: 'dengan',
  Your: 'anda',
  Hands: 'tangan',
  Grill: 'panggang',
  Sandwich: 'Sandwic',
  Fillings: 'Inti',
  Salad: 'Salad',
  Ingredients: 'Bahan',
  Baked: 'Bakar',
  Goods: 'Makanan',
  Comfort: 'Selesa',
  Messy: 'Berselerak',
  Sushi: 'Sushi',
  Rolls: 'Gulung',
  Cake: 'Kek',
  Cookies: 'Biskut',
  Condiments: 'Perasa',
  Smoothie: 'Smoothie',
  Menu: 'Menu',
  Midnight: 'Tengah malam',
  Party: 'Parti',
  Dip: 'Cecah',
  Coffee: 'Kopi',
  Tea: 'Teh',
  Milkshake: 'Milkshake',
  School: 'Sekolah',
  Subjects: 'Subjek',
  College: 'Kolej',
  Majors: 'Jurusan',
  Reasons: 'Sebab',
  Call: 'Hubungi',
  Sick: 'Sakit',
  Boss: 'Bos',
  Would: 'akan',
  Say: 'kata',
  Procrastinate: 'tangguh',
  Classroom: 'Bilik darjah',
  Supplies: 'Bekalan',
  After: 'Selepas',
  Activities: 'Aktiviti',
  Teachers: 'Guru',
  Homework: 'Kerja rumah',
  Excuses: 'Alasan',
  Office: 'Pejabat',
  Meeting: 'Mesyuarat',
  Topics: 'Topik',
  Resume: 'Resume',
  Side: 'Sampingan',
  Hustles: 'kerja',
};

function simpleWordTranslate(input: string): string {
  return input.replace(/[A-Za-z]+/g, (word) => {
    if (wordMap[word]) return wordMap[word];
    if (word.toLowerCase() === 'wifi') return 'Wi-Fi';
    return word;
  });
}

function stripArticle(input: string): string {
  return input.replace(/^(a|an|the|your)\s+/i, '');
}

function translateByPattern(category: string): string | null {
  const thingsAt = category.match(/^Things at (.+)$/);
  if (thingsAt) return `Perkara di ${simpleWordTranslate(stripArticle(thingsAt[1]))}`;

  const thingsIn = category.match(/^Things in (.+)$/);
  if (thingsIn) return `Perkara dalam ${simpleWordTranslate(stripArticle(thingsIn[1]))}`;

  const thingsOn = category.match(/^Things on (.+)$/);
  if (thingsOn) return `Perkara di ${simpleWordTranslate(stripArticle(thingsOn[1]))}`;

  const thingsYou = category.match(/^Things You (.+)$/);
  if (thingsYou) return `Perkara yang anda ${simpleWordTranslate(thingsYou[1]).toLowerCase()}`;

  const thingsThatAre = category.match(/^Things That Are (.+)$/);
  if (thingsThatAre) return `Perkara yang ${simpleWordTranslate(thingsThatAre[1]).toLowerCase()}`;

  const thingsThat = category.match(/^Things That (.+)$/);
  if (thingsThat) return `Perkara yang ${simpleWordTranslate(thingsThat[1]).toLowerCase()}`;

  const typesOf = category.match(/^Types of (.+)$/);
  if (typesOf) return `Jenis ${simpleWordTranslate(typesOf[1]).toLowerCase()}`;

  const aName = category.match(/^A (Boy's|Girl's|Baby|Pet) Name$/);
  if (aName) return `Nama ${simpleWordTranslate(aName[1]).toLowerCase()}`;

  return null;
}

export function translateCategory(category: string, language: Language): string {
  if (language !== 'ms') return category;
  if (directMalay[category]) return directMalay[category];
  return translateByPattern(category) ?? simpleWordTranslate(category);
}
