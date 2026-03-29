const FESTIVALS = [
  { name: "New Year", namebn: "নববর্ষ", month: 1, startDay: 1, endDay: 7, region: "global", keywords: ["fireworks", "countdown clock", "festive juice glasses", "confetti", "calendar page turning", "midnight sky", "sparklers", "party decorations", "golden ornaments", "new beginnings nature"] },
  { name: "Valentine's Day", namebn: "ভ্যালেন্টাইন ডে", month: 2, startDay: 1, endDay: 14, region: "western", keywords: ["red roses bouquet", "heart-shaped chocolates", "love letters", "romantic dinner table setting", "pink petals scattered", "gift boxes with ribbons", "candle-lit ambiance", "romantic garden path", "heart balloons", "valentines card craft"] },
  { name: "International Women's Day", namebn: "আন্তর্জাতিক নারী দিবস", month: 3, startDay: 1, endDay: 8, region: "international", keywords: ["purple flowers arrangement", "empowerment symbols", "diversity illustration", "equal sign art", "women day poster background", "purple ribbon", "mimosa flowers", "inspiring quote board", "floral wreath purple", "celebration decorations purple"] },
  { name: "Holi", namebn: "হোলি", month: 3, startDay: 10, endDay: 25, region: "hindu", keywords: ["colorful powder piles", "gulal powder bowls", "rangoli art pattern", "color splash abstract", "thandai drink glass", "gujiya sweets plate", "bonfire wood stack", "colored water balloons", "spring flowers bloom", "vibrant abstract splashes"] },
  { name: "Ramadan", namebn: "রমজান", month: 3, startDay: 1, endDay: 31, region: "islamic", keywords: ["crescent moon night sky", "ornate lantern glowing", "dates on silver tray", "iftar table spread", "mosque silhouette at dusk", "prayer beads tasbih", "Quran on wooden stand", "Arabic calligraphy art", "geometric Islamic pattern", "suhoor pre-dawn meal", "Ramadan kareem decoration", "fanous lantern ornamental"] },
  { name: "Good Friday", namebn: "গুড ফ্রাইডে", month: 3, startDay: 25, endDay: 31, region: "christian", keywords: ["wooden cross silhouette sunset", "olive branch peaceful", "church stained glass window", "candle vigil arrangement", "crown of thorns still life", "purple fabric draped", "stone pathway ancient", "sunset sky dramatic clouds", "white lily on dark background", "old wooden church door"] },
  { name: "Easter", namebn: "ইস্টার", month: 4, startDay: 1, endDay: 20, region: "christian", keywords: ["decorated Easter eggs", "spring flowers basket", "Easter bunny chocolate", "pastel color palette", "spring garden bloom", "egg hunt basket", "hot cross buns", "lily flowers white", "Easter wreath on door", "nest with colored eggs"] },
  { name: "Earth Day", namebn: "পৃথিবী দিবস", month: 4, startDay: 15, endDay: 22, region: "international", keywords: ["green planet illustration", "seedling growing in soil", "recycling symbols", "renewable energy icons", "forest canopy aerial", "ocean conservation", "wildflower meadow", "solar panels on roof", "wind turbines field", "eco-friendly products"] },
  { name: "Eid ul-Fitr", namebn: "ঈদ উল ফিতর", month: 4, startDay: 1, endDay: 15, region: "islamic", keywords: ["Eid mubarak calligraphy", "crescent moon and star", "festive lanterns lit", "dates and sweets tray", "mosque dome golden hour", "gift boxes wrapped", "henna pattern design", "geometric star pattern", "festive table spread", "Eid decorations gold", "sheer khurma dessert bowl", "Islamic geometric art"] },
  { name: "Pohela Boishakh", namebn: "পহেলা বৈশাখ", month: 4, startDay: 10, endDay: 14, region: "global", keywords: ["alpona floor art", "clay pot decoration", "festive sweets platter", "mango motif pattern", "brass water vessel", "tropical flower garland", "fair stall colorful", "traditional mask art", "red and white fabric", "new year calendar art"] },
  { name: "Mother's Day", namebn: "মা দিবস", month: 5, startDay: 1, endDay: 14, region: "western", keywords: ["flower bouquet gift", "breakfast tray setup", "greeting card handmade", "garden roses pink", "gift wrapped with bow", "tea set with flowers", "heart decoration", "perfume bottle elegant", "potted plant gift", "cake with flowers decoration"] },
  { name: "Dragon Boat Festival", namebn: "ড্রাগন বোট উৎসব", month: 6, startDay: 1, endDay: 15, region: "chinese", keywords: ["dragon boat on river", "zongzi rice dumplings", "bamboo leaves wrapping", "dragon head carved boat", "river race scenery", "lotus flowers summer", "traditional knot decoration", "traditional tea vessel", "drum on boat deck", "five-color thread bracelet"] },
  { name: "Eid ul-Adha", namebn: "ঈদ উল আযহা", month: 6, startDay: 10, endDay: 25, region: "islamic", keywords: ["mosque silhouette sunrise", "crescent moon star", "Eid decoration gold green", "calligraphy bismillah", "lanterns ornate brass", "Islamic geometric tiles", "date palm grove", "prayer mat ornamental", "festive bakery sweets", "henna art pattern", "incense burner traditional", "arabesque floral design"] },
  { name: "Father's Day", namebn: "বাবা দিবস", month: 6, startDay: 10, endDay: 21, region: "western", keywords: ["necktie gift box", "watch and cufflinks", "toolbox vintage", "coffee mug on desk", "leather wallet", "greeting card", "grilling barbecue setup", "fishing rod reel", "book and glasses", "workshop tools organized"] },
  { name: "World Environment Day", namebn: "বিশ্ব পরিবেশ দিবস", month: 6, startDay: 1, endDay: 5, region: "international", keywords: ["tropical rainforest canopy", "coral reef underwater", "wildflower garden", "tree planting ceremony", "solar energy panels", "clean river flowing", "endangered species", "sustainable farming", "green city aerial", "biodiversity collage nature"] },
  { name: "Mid-Autumn Festival", namebn: "মধ্য-শরৎ উৎসব", month: 9, startDay: 10, endDay: 25, region: "chinese", keywords: ["mooncakes on plate", "full moon night sky", "red lanterns hanging", "lotus seed paste", "moon rabbit illustration", "tea set traditional", "pomelo fruit cut", "lantern festival lights", "osmanthus flowers", "family dinner table round"] },
  { name: "Navratri", namebn: "নবরাত্রি", month: 10, startDay: 1, endDay: 15, region: "hindu", keywords: ["colorful garba sticks", "dandiya decoration", "marigold garland", "oil lamp diya row", "rangoli pattern vibrant", "festive flowers arrangement", "traditional fabric drape", "brass pot decorated", "color powder piles", "temple bell ornamental"] },
  { name: "Durga Puja", namebn: "দুর্গা পূজা", month: 10, startDay: 5, endDay: 20, region: "hindu", keywords: ["marigold garland decoration", "festive lights pandal", "dhunuchi incense burner", "sindoor vermillion bowl", "traditional sweets platter", "brass bell and lamp", "autumn flower arrangement", "decorative alpona floor art", "festive market lights", "red hibiscus flowers"] },
  { name: "World Food Day", namebn: "বিশ্ব খাদ্য দিবস", month: 10, startDay: 10, endDay: 16, region: "international", keywords: ["world cuisine variety", "fresh produce market", "grain harvest golden", "sustainable agriculture", "food photography setup", "spice collection display", "bread baking process", "fruit arrangement colorful", "kitchen garden harvest", "farm to table concept"] },
  { name: "Halloween", namebn: "হ্যালোইন", month: 10, startDay: 15, endDay: 31, region: "western", keywords: ["carved pumpkin jack-o-lantern", "autumn leaves orange", "spooky forest fog", "haunted house silhouette", "spider web with dew", "black cat silhouette", "witch hat and broomstick", "candy corn pile", "bat silhouettes at dusk", "skeleton decoration funny"] },
  { name: "Diwali", namebn: "দিওয়ালি", month: 11, startDay: 1, endDay: 15, region: "hindu", keywords: ["oil lamp diya row glowing", "rangoli pattern colorful", "fireworks night sky", "marigold flower garland", "lantern string lights", "sweets box mithai", "candle arrangement", "sparkler light trails", "peacock feather decoration", "lotus candle floating"] },
  { name: "Thanksgiving", namebn: "থ্যাংকসগিভিং", month: 11, startDay: 15, endDay: 28, region: "western", keywords: ["autumn harvest table", "pumpkin pie golden", "cornucopia horn of plenty", "fall leaves wreath", "turkey dinner table setup", "maple syrup pour", "cranberry sauce bowl", "autumn farm landscape", "gratitude journal notebook", "cozy fireplace scene"] },
  { name: "Muharram", namebn: "মুহাররম", month: 7, startDay: 1, endDay: 15, region: "islamic", keywords: ["mosque dome twilight", "crescent moon thin", "Islamic calligraphy gold", "prayer beads close-up", "lantern soft glow", "Quran open page", "minaret at sunset", "geometric tile pattern", "incense smoke wisps", "dates and water simple"] },
  { name: "Shab-e-Barat", namebn: "শবে বরাত", month: 2, startDay: 15, endDay: 28, region: "islamic", keywords: ["mosque at night full moon", "candle-lit prayer space", "Islamic geometric lantern", "crescent above minaret", "night sky stars mosque", "Quran and prayer beads", "halwa sweets plate", "fireworks over mosque", "oil lamp row glowing", "full moon night landscape"] },
  { name: "Chinese New Year", namebn: "চাইনিজ নববর্ষ", month: 1, startDay: 20, endDay: 31, region: "chinese", keywords: ["red lanterns hanging", "dragon decoration golden", "lucky red envelope", "plum blossom branch", "firecrackers decoration", "mandarin oranges pile", "spring couplets calligraphy", "lion dance costume head", "dumpling making process", "cherry blossom spring"] },
  { name: "Christmas", namebn: "বড়দিন", month: 12, startDay: 1, endDay: 25, region: "christian", keywords: ["Christmas tree decorated", "gift boxes under tree", "snow globe scene", "gingerbread house", "candy cane red white", "winter wreath on door", "stockings by fireplace", "ornament ball golden", "hot cocoa with marshmallows", "snowflake crystal macro", "pine cone arrangement", "Christmas lights bokeh"] },
  { name: "Winter Solstice", namebn: "শীতকালীন অয়নান্ত", month: 12, startDay: 18, endDay: 31, region: "global", keywords: ["frozen lake landscape", "snow-covered pine trees", "cozy cabin in snow", "fireplace warm glow", "winter berries on branch", "icicle formations", "snowfall in forest", "warm knit blanket", "hot drink steaming cup", "winter sunset golden"] },
  { name: "Spring Season", namebn: "বসন্তকাল", month: 3, startDay: 15, endDay: 31, region: "seasonal", keywords: ["cherry blossom petals falling", "spring meadow wildflowers", "garden sprouts emerging", "rain on flower buds", "butterfly on spring flower", "fresh green leaves", "bird nest with eggs", "morning dew on grass", "tulip garden rows", "spring river flowing"] },
  { name: "Summer Season", namebn: "গ্রীষ্মকাল", month: 6, startDay: 15, endDay: 30, region: "seasonal", keywords: ["tropical beach sunset", "sunflower field golden", "ice cream cones colorful", "swimming pool aerial", "summer fruits basket", "lemonade pitcher glass", "beach umbrella colorful", "coral reef underwater", "summer garden bloom", "hammock between palms"] },
  { name: "Autumn Season", namebn: "শরৎকাল", month: 9, startDay: 20, endDay: 30, region: "seasonal", keywords: ["autumn maple leaves red", "pumpkin patch farm", "harvest wheat golden", "foggy forest morning", "apple orchard basket", "mushrooms on forest floor", "acorn and oak leaves", "autumn vineyard colors", "cozy reading nook", "cinnamon and spice arrangement"] },
  { name: "Winter Season", namebn: "শীতকাল", month: 12, startDay: 1, endDay: 31, region: "seasonal", keywords: ["snowy mountain peak", "frozen waterfall ice", "northern lights aurora", "pine forest snow", "winter birds on branch", "frost on window pane", "sleigh in snow landscape", "ice crystal macro", "warm fireplace cozy", "snow-covered village scene"] },
];

export function getUpcomingFestivals(daysAhead = 30) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const results = [];

  for (const fest of FESTIVALS) {
    const startDate = new Date(currentYear, fest.month - 1, fest.startDay);
    const endDate = new Date(currentYear, fest.month - 1, fest.endDay, 23, 59, 59);

    if (startDate < now && endDate < now) {
      startDate.setFullYear(currentYear + 1);
      endDate.setFullYear(currentYear + 1);
    }

    const daysUntilStart = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
    const isActive = now >= startDate && now <= endDate;

    if (isActive || (daysUntilStart >= 0 && daysUntilStart <= daysAhead)) {
      results.push({
        ...fest,
        daysUntil: isActive ? 0 : daysUntilStart,
        isActive,
      });
    }
  }

  results.sort((a, b) => a.daysUntil - b.daysUntil);
  return results;
}

export function getFestivalSubjects(festival) {
  return festival.keywords || [];
}

export function getFestivalContext(festivals) {
  if (!festivals || festivals.length === 0) return "";
  const top = festivals.slice(0, 3);
  const lines = top.map(f => {
    const status = f.isActive ? "NOW ACTIVE" : `in ${f.daysUntil} days`;
    return `- ${f.name} (${status}): themes — ${f.keywords.slice(0, 6).join(", ")}`;
  });
  return `\n\n[FESTIVAL/SEASONAL MODE — COMMERCIAL PRIORITY]
Stock platforms see 200-400% demand spikes for seasonal content uploaded 2-4 weeks BEFORE events.
Upcoming festivals/seasons to target:
${lines.join("\n")}

IMPORTANT: Bias your prompts toward these festival/seasonal themes. Create commercially valuable content that buyers will search for around these events. Mix festival elements with the subject naturally — decorations, food, colors, symbols, atmosphere. Remember: NO human figures, focus on objects, decorations, food, nature, architecture, patterns.`;
}
